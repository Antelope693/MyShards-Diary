import express from 'express';
import { dbAll } from '../database';

const router = express.Router();

// Basic optional auth middleware
const optionalAuth = (req: any, _res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    import('jsonwebtoken').then(jwt => {
      try {
        if (process.env.JWT_SECRET) {
          const token = authHeader.split(' ')[1];
          req.user = jwt.default.verify(token, process.env.JWT_SECRET);
        }
      } catch (e) { }
      next();
    });
    return;
  }
  next();
};

router.get('/', optionalAuth, async (req, res) => {
  try {
    const maintainerUsername = process.env.MAINTAINER_USERNAME || '羚羊';
    const currentUserId = req.user?.id || -1;

    const links = await dbAll(
      `SELECT 
        u.id, 
        u.username,
        u.display_name,
        u.bio,
        u.role,
        u.pinned_at,
        COUNT(d.id) as diary_count,
        MAX(d.created_at) as latest_diary_at
       FROM users u
       LEFT JOIN diaries d ON d.user_id = u.id
       WHERE u.status = 'active'
       GROUP BY u.id
       ORDER BY 
        (u.id = ?) DESC,
        (u.pinned_at IS NOT NULL) DESC,
        u.pinned_at DESC,
        (u.username = ?) DESC,
        (MAX(d.created_at) IS NULL) ASC, 
        MAX(d.created_at) DESC
      `,
      [currentUserId, maintainerUsername]
    );

    const mapped = links.map((link: any) => {
      const roleLabel =
        link.role === 'maintainer' ? '维护者' : link.role === 'admin' ? '管理员' : '创作者';
      return {
        name: link.display_name || link.username,
        url: `/space/${encodeURIComponent(link.username)}`,
        description: link.bio || `共 ${link.diary_count || 0} 篇日记`,
        region: roleLabel,
        contact: null,
        username: link.username,
        diary_count: link.diary_count || 0,
        latest_diary_at: link.latest_diary_at,
      };
    });

    res.json({
      links: mapped,
      submissionEnabled: false,
      source: 'local-users',
      lastSyncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('获取“我们”列表失败:', error);
    res.status(500).json({ error: '获取“我们”列表失败' });
  }
});

router.post('/', (_req, res) => {
  res.status(403).json({ error: '当前版本不支持在线提交“我们”数据' });
});

export default router;
