
import express from 'express';
import { dbAll } from '../database';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const { type = 'random' } = req.query; // 'random', 'newest', 'hot'

        let orderBy = 'RANDOM()';
        if (type === 'newest') {
            orderBy = 'd.created_at DESC';
        } else if (type === 'hot') {
            // Algorithm: (Collects * 5 + Comments * 2) / (DaysOld + 1)
            // Balances high engagement with recency.
            orderBy = `(
              ((SELECT COUNT(*) FROM diary_collects WHERE diary_id = d.id) * 5 + 
               (SELECT COUNT(*) FROM comments WHERE diary_id = d.id) * 2) / 
              (CAST(julianday('now') - julianday(d.created_at) AS REAL) + 1)
            ) DESC`;
        }

        // Limit to 10 items
        const diaries = await dbAll(
            `
            SELECT d.id, d.title, d.content, d.created_at, d.user_id, u.username, u.display_name
            FROM diaries d
            JOIN users u ON d.user_id = u.id
            WHERE d.is_locked = 0
            ORDER BY ${orderBy}
            LIMIT 10
            `
        );

        // Helper to parse content preview if needed, or send full content and let frontend truncate
        const response = diaries.map((d: any) => ({
            ...d,
            preview: d.content.substring(0, 100) + (d.content.length > 100 ? '...' : '')
        }));

        res.json(response);
    } catch (error) {
        console.error('Fetch recommendations failed:', error);
        res.status(500).json({ error: 'Fetch failed' });
    }
});

export default router;
