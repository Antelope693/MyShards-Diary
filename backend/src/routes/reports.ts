import express from 'express';
import { dbRun, dbGet } from '../database';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

router.post('/', requireAuth, async (req, res) => {
    try {
        const { target_type, target_id, reason } = req.body;

        if (!['diary', 'user', 'comment'].includes(target_type)) {
            return res.status(400).json({ error: '无效的目标类型' });
        }

        if (!reason || !reason.trim()) {
            return res.status(400).json({ error: '举报原因不能为空' });
        }

        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        await dbRun(
            'INSERT INTO reports (reporter_id, target_type, target_id, reason) VALUES (?, ?, ?, ?)',
            [req.user.id, target_type, target_id, reason]
        );

        // Notify admins and maintainers
        try {
            const admins = await import('../database').then(m => m.dbAll(
                "SELECT id FROM users WHERE role IN ('admin', 'maintainer')"
            ));

            const reporterName = req.user.display_name || req.user.username;
            const notificationContent = `收到来自 ${reporterName} 的新举报：${reason.substring(0, 20)}${reason.length > 20 ? '...' : ''}`;
            const notificationLink = '/admin/reports'; // Assuming an admin report page exists or will exist

            if (admins && admins.length > 0) {
                for (const admin of admins) {
                    await dbRun(
                        'INSERT INTO notifications (user_id, type, content, link) VALUES (?, ?, ?, ?)',
                        [admin.id, 'report', notificationContent, notificationLink]
                    );
                }
            }
        } catch (notifError) {
            console.error('Failed to notify admins:', notifError);
            // Don't fail the request if notification fails
        }

        res.status(201).json({ message: '举报已提交，我们会尽快处理' });
    } catch (error) {
        console.error('举报提交失败:', error);
        res.status(500).json({ error: '举报提交失败' });
    }
});

export default router;
