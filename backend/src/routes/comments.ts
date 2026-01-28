import express from 'express';
import { dbRun, dbAll, dbGet } from '../database';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

router.get('/diary/:diaryId', async (req, res) => {
  try {
    const comments = await dbAll(
      `SELECT c.*, 
       u.username as author_username,
       u.display_name as author_display_name,
       (SELECT author FROM comments WHERE id = c.reply_to) as reply_to_author
       FROM comments c 
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.diary_id = ? 
       ORDER BY c.created_at ASC`,
      [req.params.diaryId]
    );
    res.json(
      comments.map((comment) => ({
        ...comment,
        display_name: comment.author_display_name || comment.author_username || comment.author,
      }))
    );
  } catch (error) {
    console.error('获取留言失败:', error);
    res.status(500).json({ error: '获取留言失败' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { diary_id, content, reply_to } = req.body;
    if (!diary_id || !content) {
      return res.status(400).json({ error: '日记ID和内容不能为空' });
    }

    if (!req.user) {
      return res.status(401).json({ error: '需要身份验证' });
    }

    const diary = await dbGet('SELECT id FROM diaries WHERE id = ?', [diary_id]);
    if (!diary) {
      return res.status(404).json({ error: '日记不存在' });
    }

    if (reply_to) {
      const replyComment = await dbGet('SELECT id FROM comments WHERE id = ?', [reply_to]);
      if (!replyComment) {
        return res.status(404).json({ error: '被回复的留言不存在' });
      }
    }

    const authorDisplay = req.user.display_name || req.user.username;
    const result = await dbRun(
      'INSERT INTO comments (diary_id, author, content, reply_to, user_id) VALUES (?, ?, ?, ?, ?)',
      [diary_id, authorDisplay, content, reply_to || null, req.user.id]
    );

    const newComment = await dbGet(
      `SELECT c.*, 
       u.username as author_username,
       u.display_name as author_display_name,
       (SELECT author FROM comments WHERE id = c.reply_to) as reply_to_author
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [result.lastID]
    );

    // 1. Notify Diary Owner (if comment author is not diary owner)
    const diaryOwner = await dbGet('SELECT user_id, title FROM diaries WHERE id = ?', [diary_id]);
    if (diaryOwner && diaryOwner.user_id !== req.user.id) {
      await dbRun(
        'INSERT INTO notifications (user_id, type, content, link) VALUES (?, ?, ?, ?)',
        [
          diaryOwner.user_id,
          'comment',
          `${authorDisplay} 评论了你的日记《${diaryOwner.title}》`,
          `/diary/${diary_id}`
        ]
      );
    }

    // 2. Notify Parent Comment Author (if reply and parent author is not current user)
    if (reply_to) {
      const parentComment = await dbGet('SELECT user_id, content FROM comments WHERE id = ?', [reply_to]);
      // If parent comment author exists and is not the current user (avoid self-notification)
      // Also ensure we don't double notify if diary owner is same as parent comment author (optional, but good for UX)
      // For simplicity, we notify reply target regardless, but check user_id != params
      if (parentComment && parentComment.user_id && parentComment.user_id !== req.user.id) {
        // Truncate parent content for preview
        const preview = parentComment.content.length > 20 ? parentComment.content.substring(0, 20) + '...' : parentComment.content;
        await dbRun(
          'INSERT INTO notifications (user_id, type, content, link) VALUES (?, ?, ?, ?)',
          [
            parentComment.user_id,
            'reply',
            `${authorDisplay} 回复了你的评论: "${preview}"`,
            `/diary/${diary_id}`
          ]
        );
      }
    }

    res.status(201).json({
      ...newComment,
      author_username: newComment?.author_username || req.user.username,
      display_name: newComment.author_display_name || newComment.author_username || newComment.author,
    });
  } catch (error) {
    console.error('创建留言失败:', error);
    res.status(500).json({ error: '创建留言失败' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '需要身份验证' });
    }

    const comment = await dbGet(
      `SELECT c.*, d.user_id as diary_owner_id
       FROM comments c
       JOIN diaries d ON c.diary_id = d.id
       WHERE c.id = ?`,
      [req.params.id]
    );

    if (!comment) {
      return res.status(404).json({ error: '留言不存在' });
    }

    const isOwner = comment.user_id === req.user.id;
    const isDiaryOwner = comment.diary_owner_id === req.user.id;
    const isStaff = req.user.role === 'maintainer' || req.user.role === 'admin';

    if (!isOwner && !isDiaryOwner && !isStaff) {
      return res.status(403).json({ error: '无权删除该留言' });
    }

    await dbRun('DELETE FROM comments WHERE id = ?', [req.params.id]);
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除留言失败:', error);
    res.status(500).json({ error: '删除留言失败' });
  }
});

export default router;

