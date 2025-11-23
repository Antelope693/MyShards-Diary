import express from 'express';
import { dbRun, dbGet } from '../database';

const router = express.Router();

// 默认管理员密码（可以通过环境变量设置）
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// 登录
router.post('/login', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: '密码不能为空' });
    }

    if (password === ADMIN_PASSWORD) {
      // 简单的会话管理（生产环境应使用JWT或更安全的方案）
      res.json({ 
        success: true, 
        message: '登录成功',
        token: 'authenticated' // 简化版本，实际应使用JWT
      });
    } else {
      res.status(401).json({ error: '密码错误' });
    }
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ error: '登录失败' });
  }
});

// 验证token（简化版本）
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (token === 'authenticated') {
      res.json({ authenticated: true });
    } else {
      res.status(401).json({ authenticated: false });
    }
  } catch (error) {
    console.error('验证失败:', error);
    res.status(500).json({ error: '验证失败' });
  }
});

export default router;

