import express from 'express';
import { dbRun, dbGet } from '../database';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// 获取问候语
router.get('/', async (req, res) => {
  try {
    const greeting = await dbGet('SELECT * FROM greetings ORDER BY id DESC LIMIT 1');
    res.json(greeting || { content: '欢迎来到我的日记' });
  } catch (error) {
    console.error('获取问候语失败:', error);
    res.status(500).json({ error: '获取问候语失败' });
  }
});

// 更新问候语（需要身份验证）
router.put('/', requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: '问候语内容不能为空' });
    }

    // 检查是否已存在问候语
    const existing = await dbGet('SELECT id FROM greetings ORDER BY id DESC LIMIT 1');
    if (existing) {
      await dbRun(
        'UPDATE greetings SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [content, existing.id]
      );
    } else {
      await dbRun('INSERT INTO greetings (content) VALUES (?)', [content]);
    }

    const updatedGreeting = await dbGet('SELECT * FROM greetings ORDER BY id DESC LIMIT 1');
    res.json(updatedGreeting);
  } catch (error) {
    console.error('更新问候语失败:', error);
    res.status(500).json({ error: '更新问候语失败' });
  }
});

export default router;

