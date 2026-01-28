import express from 'express';
import bcrypt from 'bcryptjs';
import { dbAll, dbGet, dbRun } from '../database';
import { requireAuth, requireMaintainer, requireStaff } from '../middleware/auth';

const router = express.Router();

const publicUserFields = `
  u.id,
  u.username,
  u.display_name,
  u.bio,
  u.role,
  COUNT(DISTINCT d.id) as diary_count,
  MAX(d.created_at) as latest_diary_at
`;

// Optional Auth middleware usage needs careful handling.
// Usually we can just assign req.user if token is present, but continue if not.
// Let's assume we can try `requireAuth` logic but not fail?
// Or we can just read header manually as `requireAuth` sends 401.

// We need a new middleware `optionalAuth` or just decode manually here for this specific route.
import jwt from 'jsonwebtoken';

const optionalAuth = (req: any, _res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    try {
      if (process.env.JWT_SECRET) {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        req.user = user;
      }
    } catch (e) {
      // ignore invalid token for optional auth
    }
  }
  next();
};

router.get('/public/list', optionalAuth, async (req, res) => {
  try {
    const maintainerUsername = process.env.MAINTAINER_USERNAME || '羚羊';
    const currentUserId = req.user?.id || -1; // -1 if not logged in

    // Logic: 
    // 1. Me (current user)
    // 2. Pinned users
    // 3. Maintainer
    // 4. Others (Latest update)

    const users = await dbAll(
      `
      SELECT ${publicUserFields}, u.pinned_at
      FROM users u
      LEFT JOIN diaries d ON d.user_id = u.id
      WHERE u.status = 'active'
      GROUP BY u.id
      ORDER BY 
        (u.id = ?) DESC, -- Me First
        (u.pinned_at IS NOT NULL) DESC, -- Pinned Second
        u.pinned_at DESC, -- Newer pins higher?
        (u.username = ?) DESC, -- Maintainer Third
        (latest_diary_at IS NULL), -- Users with diaries first
        latest_diary_at DESC -- Latest diaries first
      `,
      [currentUserId, maintainerUsername]
    );
    res.json({ links: users }); // Normalized response structure
  } catch (error) {
    console.error('获取公开用户失败:', error);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

router.get('/public/profile/:username', async (req, res) => {
  try {
    const profile = await dbGet(
      `
      SELECT ${publicUserFields}
      FROM users u
      LEFT JOIN diaries d ON d.user_id = u.id
      WHERE u.username = ? AND u.status = 'active'
      GROUP BY u.id
      `,
      [req.params.username]
    );

    if (!profile) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json(profile);
  } catch (error) {
    console.error('获取用户简介失败:', error);
    res.status(500).json({ error: '获取用户简介失败' });
  }
});

router.get('/:username/following', async (req, res) => {
  try {
    const user = await dbGet('SELECT id FROM users WHERE username = ?', [req.params.username]);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const following = await dbAll(
      `SELECT ${publicUserFields}
       FROM follows f
       JOIN users u ON f.following_id = u.id
       LEFT JOIN diaries d ON d.user_id = u.id
       WHERE f.follower_id = ? AND u.status = 'active'
       GROUP BY u.id
       ORDER BY f.created_at DESC`,
      [user.id]
    );
    res.json(following);
  } catch (error) {
    console.error('获取关注列表失败:', error);
    res.status(500).json({ error: '获取关注列表失败' });
  }
});

router.get('/:username/followers', async (req, res) => {
  try {
    const user = await dbGet('SELECT id FROM users WHERE username = ?', [req.params.username]);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const followers = await dbAll(
      `SELECT ${publicUserFields}
       FROM follows f
       JOIN users u ON f.follower_id = u.id
       LEFT JOIN diaries d ON d.user_id = u.id
       WHERE f.following_id = ? AND u.status = 'active'
       GROUP BY u.id
       ORDER BY f.created_at DESC`,
      [user.id]
    );
    res.json(followers);
  } catch (error) {
    console.error('获取粉丝列表失败:', error);
    res.status(500).json({ error: '获取粉丝列表失败' });
  }
});

router.get('/', requireAuth, requireStaff, async (_req, res) => {
  try {
    const users = await dbAll(
      `
      SELECT 
        u.id,
        u.username,
        u.display_name,
        u.email,
        u.role,
        u.status,
        u.bio,
        u.created_at,
        u.updated_at,
        u.max_upload_size_bytes,
        u.storage_quota_bytes,
        u.used_storage_bytes,
        COUNT(d.id) as diary_count
      FROM users u
      LEFT JOIN diaries d ON d.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
      `
    );
    res.json(users);
  } catch (error) {
    console.error('获取用户失败:', error);
    res.status(500).json({ error: '获取用户失败' });
  }
});

router.post('/', requireAuth, requireMaintainer, async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      role = 'user',
      display_name,
      bio,
      max_upload_size_bytes,
      storage_quota_bytes,
    } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: '用户名、邮箱和密码不能为空' });
    }

    const existing = await dbGet('SELECT id FROM users WHERE email = ? OR username = ?', [
      email,
      username,
    ]);
    if (existing) {
      return res.status(409).json({ error: '用户名或邮箱已存在' });
    }

    const allowedRoles = ['user', 'admin', 'maintainer'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: '无效的角色类型' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const result = await dbRun(
      `INSERT INTO users (username, display_name, email, password_hash, role, bio, max_upload_size_bytes, storage_quota_bytes, used_storage_bytes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        username,
        display_name || username,
        email,
        hash,
        role,
        bio || null,
        max_upload_size_bytes || 10 * 1024 * 1024,
        storage_quota_bytes || 200 * 1024 * 1024,
      ]
    );

    const user = await dbGet(
      'SELECT id, username, email, role, status, display_name, bio, max_upload_size_bytes, storage_quota_bytes, used_storage_bytes FROM users WHERE id = ?',
      [result.lastID]
    );
    res.status(201).json(user);
  } catch (error) {
    console.error('创建用户失败:', error);
    res.status(500).json({ error: '创建用户失败' });
  }
});

router.put('/:id', requireAuth, requireMaintainer, async (req, res) => {
  try {
    const {
      display_name,
      email,
      role,
      bio,
      username,
      password,
      max_upload_size_bytes,
      storage_quota_bytes,
      used_storage_bytes,
    } = req.body;
    const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.params.id]);

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    if (username && username !== user.username) {
      const existing = await dbGet('SELECT id FROM users WHERE username = ?', [username]);
      if (existing) {
        return res.status(409).json({ error: '用户名已存在' });
      }
    }

    if (email && email !== user.email) {
      const existingEmail = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
      if (existingEmail) {
        return res.status(409).json({ error: '邮箱已存在' });
      }
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (username) {
      updates.push('username = ?');
      params.push(username);
    }

    if (display_name !== undefined) {
      updates.push('display_name = ?');
      params.push(display_name);
    }

    if (email) {
      updates.push('email = ?');
      params.push(email);
    }

    if (role) {
      updates.push('role = ?');
      params.push(role);
    }

    if (bio !== undefined) {
      updates.push('bio = ?');
      params.push(bio);
    }

    if (typeof max_upload_size_bytes === 'number') {
      updates.push('max_upload_size_bytes = ?');
      params.push(max_upload_size_bytes);
    }

    if (typeof storage_quota_bytes === 'number') {
      updates.push('storage_quota_bytes = ?');
      params.push(storage_quota_bytes);
    }

    if (typeof used_storage_bytes === 'number') {
      updates.push('used_storage_bytes = ?');
      params.push(used_storage_bytes);
    }

    if (password) {
      updates.push('password_hash = ?');
      params.push(bcrypt.hashSync(password, 10));
    }

    if (updates.length === 0) {
      return res.json({ message: '无需更新' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');

    await dbRun(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, [...params, req.params.id]);
    const updated = await dbGet(
      'SELECT id, username, email, role, status, display_name, bio, max_upload_size_bytes, storage_quota_bytes, used_storage_bytes FROM users WHERE id = ?',
      [req.params.id]
    );
    res.json(updated);
  } catch (error) {
    console.error('更新用户失败:', error);
    res.status(500).json({ error: '更新用户失败' });
  }
});

router.patch('/:id/status', requireAuth, requireStaff, async (req, res) => {
  try {
    const { status } = req.body as { status: 'active' | 'banned' };
    if (!['active', 'banned'].includes(status)) {
      return res.status(400).json({ error: '无效的状态值' });
    }

    if (Number(req.params.id) === req.user?.id) {
      return res.status(400).json({ error: '不能修改自己的状态' });
    }

    const target = await dbGet('SELECT id, role FROM users WHERE id = ?', [req.params.id]);
    if (!target) {
      return res.status(404).json({ error: '用户不存在' });
    }

    if (target.role === 'maintainer' && req.user?.role !== 'maintainer') {
      return res.status(403).json({ error: '只有维护者可以修改其他维护者的状态' });
    }

    await dbRun('UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
      status,
      req.params.id,
    ]);
    res.json({ id: Number(req.params.id), status });
  } catch (error) {
    console.error('更新用户状态失败:', error);
    res.status(500).json({ error: '更新用户状态失败' });
  }
});

router.delete('/:id', requireAuth, requireMaintainer, async (req, res) => {
  try {
    if (Number(req.params.id) === req.user?.id) {
      return res.status(400).json({ error: '不能删除当前登录账号' });
    }

    const result = await dbRun('DELETE FROM users WHERE id = ?', [req.params.id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: '用户不存在或已被删除' });
    }

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除用户失败:', error);
    res.status(500).json({ error: '删除用户失败' });
  }
});

router.post('/:id/recalculate-storage', requireAuth, requireMaintainer, async (req, res) => {
  try {
    const user = await dbGet('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const total = await dbGet('SELECT COALESCE(SUM(size_bytes), 0) as total FROM user_uploads WHERE user_id = ?', [
      req.params.id,
    ]);

    await dbRun('UPDATE users SET used_storage_bytes = ? WHERE id = ?', [total?.total || 0, req.params.id]);
    res.json({ used_storage_bytes: total?.total || 0 });
  } catch (error) {
    console.error('重新统计存储失败:', error);
    res.status(500).json({ error: '重新统计失败' });
  }
});

router.get('/me/limits', requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '需要身份验证' });
    }

    const info = await dbGet(
      `SELECT max_upload_size_bytes, storage_quota_bytes, used_storage_bytes
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    res.json({
      max_upload_size_bytes: info?.max_upload_size_bytes ?? 10 * 1024 * 1024,
      storage_quota_bytes: info?.storage_quota_bytes ?? 200 * 1024 * 1024,
      used_storage_bytes: info?.used_storage_bytes ?? 0,
    });
  } catch (error) {
    console.error('获取配额失败:', error);
    res.status(500).json({ error: '获取配额失败' });
  }
});

router.get('/export/:username', requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '需要身份验证' });
    }

    const targetUser = await dbGet('SELECT * FROM users WHERE username = ?', [req.params.username]);
    if (!targetUser) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const isOwner = targetUser.id === req.user.id;
    const isStaff = req.user.role === 'maintainer' || req.user.role === 'admin';

    if (!isOwner && !isStaff) {
      return res.status(403).json({ error: '无权导出该用户数据' });
    }

    const diaries = await dbAll(
      `SELECT * FROM diaries WHERE user_id = ? ORDER BY created_at DESC`,
      [targetUser.id]
    );

    const diaryIds = diaries.map((d: any) => d.id);
    let comments: any[] = [];

    if (diaryIds.length > 0) {
      const placeholders = diaryIds.map(() => '?').join(',');
      comments = await dbAll(
        `SELECT * FROM comments WHERE diary_id IN (${placeholders}) ORDER BY created_at ASC`,
        diaryIds
      );
    }

    const payload = {
      generated_at: new Date().toISOString(),
      user: {
        username: targetUser.username,
        display_name: targetUser.display_name,
        email: targetUser.email,
        bio: targetUser.bio,
        role: targetUser.role,
      },
      diaries: diaries.map((diary: any) => ({
        ...diary,
        images: diary.images ? JSON.parse(diary.images) : null,
      })),
      comments,
    };

    res.json(payload);
  } catch (error) {
    console.error('导出用户数据失败:', error);
    res.status(500).json({ error: '导出失败，请稍后再试' });
  }
});

router.get('/:id/follow-status', requireAuth, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const followingId = Number(req.params.id);
    const followerId = req.user.id;

    const follow = await dbGet(
      'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?',
      [followerId, followingId]
    );

    res.json({ isFollowing: !!follow });
  } catch (error) {
    console.error('Check follow status failed:', error);
    res.status(500).json({ error: 'Check failed' });
  }
});

router.post('/:id/follow', requireAuth, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const followingId = Number(req.params.id);
    const followerId = req.user.id;

    if (followingId === followerId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    const targetUser = await dbGet('SELECT id FROM users WHERE id = ?', [followingId]);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    try {
      await dbRun(
        'INSERT INTO follows (follower_id, following_id) VALUES (?, ?)',
        [followerId, followingId]
      );

      // Send notification to target user
      await dbRun(
        'INSERT INTO notifications (user_id, type, content, link) VALUES (?, ?, ?, ?)',
        [
          followingId,
          'follow',
          `${req.user.display_name || req.user.username} 关注了你`,
          `/space/${req.user.username}`
        ]
      );
    } catch (e) {
      // Ignore unique constraint violation
    }

    res.json({ isFollowing: true });
  } catch (error) {
    console.error('Follow failed:', error);
    res.status(500).json({ error: 'Follow failed' });
  }
});

router.delete('/:id/follow', requireAuth, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const followingId = Number(req.params.id);
    const followerId = req.user.id;

    await dbRun(
      'DELETE FROM follows WHERE follower_id = ? AND following_id = ?',
      [followerId, followingId]
    );

    res.json({ isFollowing: false });
  } catch (error) {
    console.error('Unfollow failed:', error);
    res.status(500).json({ error: 'Unfollow failed' });
  }
});

router.post('/:id/pin', requireAuth, requireMaintainer, async (req, res) => {
  try {
    const { is_pinned } = req.body; // true or false

    // SQLite uses CURRENT_TIMESTAMP, Postgres uses same usually or NOW()
    // Using explicit string for safety or NULL
    const pinnedAt = is_pinned ? new Date().toISOString() : null;

    await dbRun(
      'UPDATE users SET pinned_at = ? WHERE id = ?',
      [pinnedAt, req.params.id]
    );

    res.json({ message: '操作成功', pinned_at: pinnedAt });
  } catch (error) {
    console.error('Pin user failed:', error);
    res.status(500).json({ error: 'Pin user failed' });
  }
});

export default router;

