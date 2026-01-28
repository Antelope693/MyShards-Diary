
import express from 'express';
import { dbRun, dbGet } from '../database';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

router.get('/:id/collect-status', requireAuth, async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        const diaryId = Number(req.params.id);
        const userId = req.user.id;

        const collect = await dbGet(
            'SELECT id FROM diary_collects WHERE user_id = ? AND diary_id = ?',
            [userId, diaryId]
        );

        res.json({ isCollected: !!collect });
    } catch (error) {
        console.error('Check collect status failed:', error);
        res.status(500).json({ error: 'Check failed' });
    }
});

router.post('/:id/collect', requireAuth, async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        const diaryId = Number(req.params.id);
        const userId = req.user.id;

        const diary = await dbGet('SELECT id FROM diaries WHERE id = ?', [diaryId]);
        if (!diary) return res.status(404).json({ error: 'Diary not found' });

        try {
            await dbRun(
                'INSERT INTO diary_collects (user_id, diary_id) VALUES (?, ?)',
                [userId, diaryId]
            );
        } catch (e) {
            // Ignore unique constraint violation
        }

        res.json({ isCollected: true });
    } catch (error) {
        console.error('Collect failed:', error);
        res.status(500).json({ error: 'Collect failed' });
    }
});

router.get('/list/:username', async (req, res) => {
    try {
        const targetUsername = req.params.username;
        const user = await dbGet('SELECT id FROM users WHERE username = ?', [targetUsername]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const diaries = await import('../database').then(db => db.dbAll(
            `SELECT d.*, u.username as author_username, u.display_name as author_name 
             FROM diary_collects dc 
             JOIN diaries d ON dc.diary_id = d.id 
             JOIN users u ON d.user_id = u.id 
             WHERE dc.user_id = ? 
             ORDER BY dc.created_at DESC`,
            [user.id]
        ));

        // Parse images if needed, similar to other endpoints
        const mapped = diaries.map((d: any) => ({
            ...d,
            images: d.images ? JSON.parse(d.images) : null
        }));

        res.json(mapped);
    } catch (error) {
        console.error('Get collected diaries failed:', error);
        res.status(500).json({ error: 'Get collected diaries failed' });
    }
});

router.delete('/:id/collect', requireAuth, async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        const diaryId = Number(req.params.id);
        const userId = req.user.id;

        await dbRun(
            'DELETE FROM diary_collects WHERE user_id = ? AND diary_id = ?',
            [userId, diaryId]
        );

        res.json({ isCollected: false });
    } catch (error) {
        console.error('Uncollect failed:', error);
        res.status(500).json({ error: 'Uncollect failed' });
    }
});

export default router;
