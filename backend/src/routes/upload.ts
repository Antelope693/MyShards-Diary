import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireAuth } from '../middleware/auth';
import { dbRun, dbGet } from '../database';

const router = express.Router();

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置 multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB 基础限制，具体限制在业务逻辑中判断
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只支持图片格式：jpeg, jpg, png, gif, webp'));
    }
  },
});

const DEFAULT_MAX_UPLOAD = 10 * 1024 * 1024;
const DEFAULT_QUOTA = 200 * 1024 * 1024;

async function ensureQuota(userId: number, role: string, fileSizes: number[], filenames: string[]) {
  const user = await dbGet(
    'SELECT max_upload_size_bytes, storage_quota_bytes, used_storage_bytes FROM users WHERE id = ?',
    [userId]
  );

  const maxPerFile = user?.max_upload_size_bytes ?? DEFAULT_MAX_UPLOAD;
  const quota = user?.storage_quota_bytes ?? DEFAULT_QUOTA;
  const used = user?.used_storage_bytes ?? 0;
  const isPrivileged = role === 'maintainer' || role === 'admin';

  if (!isPrivileged) {
    for (const size of fileSizes) {
      if (size > maxPerFile) {
        throw new Error(`SINGLE_LIMIT:${maxPerFile}`);
      }
    }
    const totalAfter = used + fileSizes.reduce((sum, item) => sum + item, 0);
    if (totalAfter > quota) {
      throw new Error(`QUOTA_LIMIT:${quota}`);
    }
  }

  await dbRun('UPDATE users SET used_storage_bytes = used_storage_bytes + ? WHERE id = ?', [
    fileSizes.reduce((sum, item) => sum + item, 0),
    userId,
  ]);

  for (let i = 0; i < filenames.length; i += 1) {
    await dbRun(
      'INSERT INTO user_uploads (user_id, filename, size_bytes) VALUES (?, ?, ?)',
      [userId, filenames[i], fileSizes[i]]
    );
  }
}

function humanize(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

function cleanupFiles(files: Express.Multer.File[] | Express.Multer.File | undefined) {
  if (!files) return;
  const list = Array.isArray(files) ? files : [files];
  list.forEach((file) => {
    try {
      fs.unlinkSync(file.path);
    } catch (error) {
      console.warn('清理文件失败:', error);
    }
  });
}

// 上传单张图片
router.post('/image', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file || !req.user) {
      cleanupFiles(req.file);
      return res.status(400).json({ error: '没有上传文件' });
    }

    const stats = fs.statSync(req.file.path);
    try {
      await ensureQuota(req.user.id, req.user.role, [stats.size], [req.file.filename]);
    } catch (limitError: any) {
      cleanupFiles(req.file);
      if (typeof limitError.message === 'string' && limitError.message.startsWith('SINGLE_LIMIT')) {
        const limit = Number(limitError.message.split(':')[1]);
        return res
          .status(413)
          .json({ error: `单个文件不能超过 ${humanize(limit)}，如需提升请联系维护者` });
      }
      if (typeof limitError.message === 'string' && limitError.message.startsWith('QUOTA_LIMIT')) {
        const limit = Number(limitError.message.split(':')[1]);
        return res
          .status(413)
          .json({ error: `存储空间不足（上限 ${humanize(limit)}），请删除旧文件或联系维护者扩容` });
      }
      throw limitError;
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl, filename: req.file.filename, size: stats.size });
  } catch (error) {
    console.error('上传失败:', error);
    res.status(500).json({ error: '上传失败' });
  }
});

// 上传多张图片
router.post('/images', requireAuth, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || !req.user) {
      cleanupFiles(req.files as Express.Multer.File[]);
      return res.status(400).json({ error: '没有上传文件' });
    }

    const files = req.files as Express.Multer.File[];
    const sizes = files.map((file) => fs.statSync(file.path).size);

    try {
      await ensureQuota(req.user.id, req.user.role, sizes, files.map((f) => f.filename));
    } catch (limitError: any) {
      cleanupFiles(files);
      if (typeof limitError.message === 'string' && limitError.message.startsWith('SINGLE_LIMIT')) {
        const limit = Number(limitError.message.split(':')[1]);
        return res
          .status(413)
          .json({ error: `单个文件不能超过 ${humanize(limit)}，如需提升请联系维护者` });
      }
      if (typeof limitError.message === 'string' && limitError.message.startsWith('QUOTA_LIMIT')) {
        const limit = Number(limitError.message.split(':')[1]);
        return res
          .status(413)
          .json({ error: `存储空间不足（上限 ${humanize(limit)}），请删除旧文件或联系维护者扩容` });
      }
      throw limitError;
    }

    const urls = files.map((file) => `/uploads/${file.filename}`);
    res.json({
      urls,
      filenames: files.map((f) => f.filename),
      sizes,
    });
  } catch (error) {
    console.error('上传失败:', error);
    res.status(500).json({ error: '上传失败' });
  }
});

export default router;

