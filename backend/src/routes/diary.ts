import express from 'express';
import { dbRun, dbAll, dbGet } from '../database';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// 获取所有日记（按时间倒序）
router.get('/', async (req, res) => {
  try {
    const diaries = await dbAll(
      'SELECT * FROM diaries ORDER BY created_at DESC'
    );
    // 解析 images JSON 字段
    const parsedDiaries = diaries.map((diary: any) => ({
      ...diary,
      images: diary.images ? JSON.parse(diary.images) : null,
    }));
    res.json(parsedDiaries);
  } catch (error) {
    console.error('获取日记列表失败:', error);
    res.status(500).json({ error: '获取日记列表失败' });
  }
});

// 获取单篇日记
router.get('/:id', async (req, res) => {
  try {
    const diary: any = await dbGet('SELECT * FROM diaries WHERE id = ?', [req.params.id]);
    if (!diary) {
      return res.status(404).json({ error: '日记不存在' });
    }
    // 解析 images JSON 字段
    diary.images = diary.images ? JSON.parse(diary.images) : null;
    // 将 is_pinned 转换为布尔值
    diary.is_pinned = diary.is_pinned === 1;
    res.json(diary);
  } catch (error) {
    console.error('获取日记失败:', error);
    res.status(500).json({ error: '获取日记失败' });
  }
});

// 创建新日记（需要身份验证）
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, content, cover_image, created_at, is_pinned } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: '标题和内容不能为空' });
    }

    // 如果提供了 created_at，使用它；否则使用当前时间
    const timestamp = created_at || new Date().toISOString().replace('T', ' ').substring(0, 19);
    const pinned = is_pinned ? 1 : 0;

    const result = await dbRun(
      'INSERT INTO diaries (title, content, cover_image, created_at, is_pinned) VALUES (?, ?, ?, ?, ?)',
      [title, content, cover_image || null, timestamp, pinned]
    );

    const newDiary: any = await dbGet('SELECT * FROM diaries WHERE id = ?', [result.lastID]);
    // 解析 images JSON 字段（如果存在）
    if (newDiary.images) {
      newDiary.images = JSON.parse(newDiary.images);
    }
    // 将 is_pinned 转换为布尔值
    newDiary.is_pinned = newDiary.is_pinned === 1;
    res.status(201).json(newDiary);
  } catch (error) {
    console.error('创建日记失败:', error);
    res.status(500).json({ error: '创建日记失败' });
  }
});

// 更新日记（需要身份验证）
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { title, content, cover_image, created_at, is_pinned } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: '标题和内容不能为空' });
    }

    const pinned = is_pinned ? 1 : 0;

    // 如果提供了 created_at，更新它；否则只更新 updated_at
    if (created_at) {
      await dbRun(
        'UPDATE diaries SET title = ?, content = ?, cover_image = ?, created_at = ?, is_pinned = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [title, content, cover_image || null, created_at, pinned, req.params.id]
      );
    } else {
      await dbRun(
        'UPDATE diaries SET title = ?, content = ?, cover_image = ?, is_pinned = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [title, content, cover_image || null, pinned, req.params.id]
      );
    }

    const updatedDiary: any = await dbGet('SELECT * FROM diaries WHERE id = ?', [req.params.id]);
    if (!updatedDiary) {
      return res.status(404).json({ error: '日记不存在' });
    }

    // 解析 images JSON 字段（如果存在）
    if (updatedDiary.images) {
      updatedDiary.images = JSON.parse(updatedDiary.images);
    }
    // 将 is_pinned 转换为布尔值
    updatedDiary.is_pinned = updatedDiary.is_pinned === 1;

    res.json(updatedDiary);
  } catch (error) {
    console.error('更新日记失败:', error);
    res.status(500).json({ error: '更新日记失败' });
  }
});

// 删除日记（需要身份验证）
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const result = await dbRun('DELETE FROM diaries WHERE id = ?', [req.params.id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: '日记不存在' });
    }
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除日记失败:', error);
    res.status(500).json({ error: '删除日记失败' });
  }
});

export default router;

