import express from 'express';
import { requireAuth } from '../middleware/auth';
import { dbAll, dbGet, dbRun } from '../database';

const router = express.Router();

// 获取我的通知列表
router.get('/', requireAuth, async (req, res) => {
    try {
        const userId = (req.user as any).id;
        const rows = await dbAll(
            `SELECT * FROM notifications 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 50`,
            [userId]
        );
        res.json(rows);
    } catch (error) {
        console.error('获取通知失败:', error);
        res.status(500).json({ error: '获取通知失败' });
    }
});

// 获取未读通知数量
router.get('/unread-count', requireAuth, async (req, res) => {
    try {
        const userId = (req.user as any).id;
        // 使用 is_read = false 在 PG 中通常有效，transformSql 会转 ? 为 $1
        // 如果 dbGet 内部逻辑正确处理了参数，这里传 false 没问题。
        // 为了最大兼容性，SQL 中也可以写 is_read = FALSE
        const result = await dbGet(
            `SELECT COUNT(*) as count FROM notifications 
       WHERE user_id = ? AND is_read = false`,
            [userId]
        );
        // dbGet 返回的是行对象，res.rows[0] 在 dbGet 内部已经处理了，它返回 row
        res.json({ count: Number(result?.count || 0) });
    } catch (error) {
        console.error('获取未读数失败:', error);
        res.status(500).json({ error: '获取未读数失败' });
    }
});

// 标记单条通知为已读
router.put('/:id/read', requireAuth, async (req, res) => {
    try {
        const userId = (req.user as any).id;
        const notificationId = req.params.id;

        await dbRun(
            `UPDATE notifications 
       SET is_read = true 
       WHERE id = ? AND user_id = ?`,
            [notificationId, userId]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('标记已读失败:', error);
        res.status(500).json({ error: '操作失败' });
    }
});

// 标记所有通知为已读
router.put('/read-all', requireAuth, async (req, res) => {
    try {
        const userId = (req.user as any).id;
        await dbRun(
            `UPDATE notifications 
       SET is_read = true 
       WHERE user_id = ? AND is_read = false`,
            [userId]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('全部已读失败:', error);
        res.status(500).json({ error: '操作失败' });
    }
});

export default router;
