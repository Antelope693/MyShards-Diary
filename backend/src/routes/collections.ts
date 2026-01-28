
import express from 'express';
import { dbRun, dbAll, dbGet } from '../database';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Get all collections for a user (public or filtered by user param)
router.get('/', async (req, res) => {
    try {
        const { user: username } = req.query;
        let sql = 'SELECT c.*, u.username, u.display_name FROM collections c JOIN users u ON c.user_id = u.id';
        const params: any[] = [];

        if (username) {
            sql += ' WHERE u.username = ?';
            params.push(username);
        }

        sql += ' ORDER BY c.updated_at DESC';

        const collections = await dbAll(sql, params);

        // Optional: Get diary count for each collection
        // For simple implementations, maybe do a separate query or subquery.
        // Let's do a subquery approach for count if performance allows, or just let frontend count if we send all diaries.
        // Actually, getting count is good.
        // Enhanced SQL:
        // SELECT c.*, u.username, u.display_name, (SELECT COUNT(*) FROM diaries d WHERE d.collection_id = c.id) as diary_count ...

        const enhancedSql = `
        SELECT c.*, u.username, u.display_name, 
        (SELECT COUNT(*) FROM diaries d WHERE d.collection_id = c.id) as diary_count 
        FROM collections c 
        JOIN users u ON c.user_id = u.id
        ${username ? 'WHERE u.username = ?' : ''}
        ORDER BY c.updated_at DESC
    `;

        const results = await dbAll(enhancedSql, params);
        res.json(results);
    } catch (error) {
        console.error('Get collections failed:', error);
        res.status(500).json({ error: '获取合集列表失败' });
    }
});

// Get single collection
router.get('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const collection = await dbGet(`
            SELECT c.*, u.username, u.display_name
            FROM collections c 
            JOIN users u ON c.user_id = u.id 
            WHERE c.id = ?
        `, [id]);

        if (!collection) {
            return res.status(404).json({ error: '合集未找到' });
        }

        // Also fetch diaries in this collection
        const diaries = await dbAll(`
            SELECT d.*, u.username, u.display_name
            FROM diaries d 
            JOIN users u ON d.user_id = u.id 
            WHERE d.collection_id = ? 
            ORDER BY d.created_at DESC
        `, [id]);

        res.json({ ...collection, diaries });
    } catch (error) {
        console.error('Get collection failed:', error);
        res.status(500).json({ error: '获取合集详情失败' });
    }
});

// Create collection
router.post('/', requireAuth, async (req, res) => {
    try {
        const { title, description, cover_image } = req.body;
        if (!title) return res.status(400).json({ error: '标题不能为空' });

        const result = await dbRun(
            'INSERT INTO collections (title, description, cover_image, user_id) VALUES (?, ?, ?, ?)',
            [title, description || '', cover_image || null, (req as any).user.id]
        );

        const newCollection = await dbGet('SELECT * FROM collections WHERE id = ?', [result.lastID]);
        res.status(201).json(newCollection);
    } catch (error) {
        console.error('Create collection failed:', error);
        res.status(500).json({ error: '创建合集失败' });
    }
});

// Update collection
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const id = req.params.id;
        const { title, description, cover_image } = req.body;
        const userId = (req as any).user.id;

        const existing = await dbGet('SELECT * FROM collections WHERE id = ?', [id]);
        if (!existing) return res.status(404).json({ error: '合集未找到' });

        // Check permission (only owner or maintainer)
        if (existing.user_id !== userId && (req as any).user.role !== 'maintainer') {
            return res.status(403).json({ error: '无权修改此合集' });
        }

        await dbRun(
            'UPDATE collections SET title = ?, description = ?, cover_image = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [title || existing.title, description !== undefined ? description : existing.description, cover_image !== undefined ? cover_image : existing.cover_image, id]
        );

        const updated = await dbGet('SELECT * FROM collections WHERE id = ?', [id]);
        res.json(updated);
    } catch (error) {
        console.error('Update collection failed:', error);
        res.status(500).json({ error: '更新合集失败' });
    }
});

// Delete collection
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const id = req.params.id;
        const userId = (req as any).user.id;

        const existing = await dbGet('SELECT * FROM collections WHERE id = ?', [id]);
        if (!existing) return res.status(404).json({ error: '合集未找到' });

        if (existing.user_id !== userId && (req as any).user.role !== 'maintainer') {
            return res.status(403).json({ error: '无权删除此合集' });
        }

        await dbRun('DELETE FROM collections WHERE id = ?', [id]);
        // Note: Diaries have ON DELETE SET NULL, so they won't be deleted, just detached.

        res.json({ message: '合集已删除' });
    } catch (error) {
        console.error('Delete collection failed:', error);
        res.status(500).json({ error: '删除合集失败' });
    }
});

export default router;
