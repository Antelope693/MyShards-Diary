import express from 'express';
import { dbRun, dbAll, dbGet } from '../database';

const router = express.Router();

// 获取某篇日记的所有留言
router.get('/diary/:diaryId', async (req, res) => {
  try {
    const comments = await dbAll(
      `SELECT c.*, 
       (SELECT author FROM comments WHERE id = c.reply_to) as reply_to_author
       FROM comments c 
       WHERE c.diary_id = ? 
       ORDER BY c.created_at ASC`,
      [req.params.diaryId]
    );
    res.json(comments);
  } catch (error) {
    console.error('获取留言失败:', error);
    res.status(500).json({ error: '获取留言失败' });
  }
});

// 创建新留言
router.post('/', async (req, res) => {
  try {
    const { diary_id, author, content, reply_to } = req.body;
    if (!diary_id || !author || !content) {
      return res.status(400).json({ error: '日记ID、作者和内容不能为空' });
    }

    // 验证日记是否存在
    const diary = await dbGet('SELECT id FROM diaries WHERE id = ?', [diary_id]);
    if (!diary) {
      return res.status(404).json({ error: '日记不存在' });
    }

    // 如果回复留言，验证被回复的留言是否存在
    if (reply_to) {
      const replyComment = await dbGet('SELECT id FROM comments WHERE id = ?', [reply_to]);
      if (!replyComment) {
        return res.status(404).json({ error: '被回复的留言不存在' });
      }
    }

    const result = await dbRun(
      'INSERT INTO comments (diary_id, author, content, reply_to) VALUES (?, ?, ?, ?)',
      [diary_id, author, content, reply_to || null]
    );

    const newComment = await dbGet(
      `SELECT c.*, 
       (SELECT author FROM comments WHERE id = c.reply_to) as reply_to_author
       FROM comments c 
       WHERE c.id = ?`,
      [result.lastID]
    );

    res.status(201).json(newComment);
  } catch (error) {
    console.error('创建留言失败:', error);
    res.status(500).json({ error: '创建留言失败' });
  }
});

// 删除留言
router.delete('/:id', async (req, res) => {
  try {
    const result = await dbRun('DELETE FROM comments WHERE id = ?', [req.params.id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: '留言不存在' });
    }
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除留言失败:', error);
    res.status(500).json({ error: '删除留言失败' });
  }
});

export default router;

