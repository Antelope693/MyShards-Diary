import express from 'express';
import { dbRun, dbAll, dbGet } from '../database';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Get all issues (Public board, maybe strictly newest first)
router.get('/', requireAuth, async (req, res) => {
    try {
        const issues = await dbAll(`
      SELECT i.*, u.username, u.display_name, u.role
      FROM issues i
      JOIN users u ON i.user_id = u.id
      ORDER BY i.created_at DESC
      LIMIT 100
    `);
        res.json(issues);
    } catch (error) {
        console.error('Fetch issues error:', error);
        res.status(500).json({ error: 'Failed to fetch issues' });
    }
});

// Create an issue
router.post('/', requireAuth, async (req, res) => {
    try {
        const { title, content } = req.body;
        if (!title || !content) {
            return res.status(400).json({ error: '标题和内容不能为空' });
        }

        if (!req.user) return res.status(401).json({ error: 'Auth required' });

        const result = await dbRun(
            'INSERT INTO issues (user_id, title, content) VALUES (?, ?, ?)',
            [req.user.id, title, content]
        );

        const newIssue = await dbGet('SELECT * FROM issues WHERE id = ?', [result.lastID]);
        res.status(201).json(newIssue);
    } catch (error) {
        console.error('Create issue error:', error);
        res.status(500).json({ error: 'Failed to create issue' });
    }
});

// Reply (Admin/Maintainer/Author?) 
// User said: "Send issues to admin... and wait for response."
// So only Admin/Maintainer should reply?
// Or maybe the user can reply to their own thread?
// For simplicity MVP: Admin replies. Status changes to 'replied'.
router.post('/:id/reply', requireAuth, async (req, res) => {
    try {
        const { reply_content } = req.body;
        if (!req.user) return res.status(401).json({ error: 'Auth required' });

        // Check permissions
        const isStaff = req.user.role === 'admin' || req.user.role === 'maintainer';
        if (!isStaff) {
            return res.status(403).json({ error: '只有管理员可以回复' });
        }

        await dbRun(
            'UPDATE issues SET reply_content = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [reply_content, 'replied', req.params.id]
        );

        res.json({ message: 'Reply sent' });
    } catch (error) {
        console.error('Reply issue error:', error);
        res.status(500).json({ error: 'Failed to reply' });
    }
});

export default router;
