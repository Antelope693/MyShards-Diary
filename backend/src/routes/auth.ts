import express from 'express';
import bcrypt from 'bcryptjs';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { dbRun, dbGet } from '../database';
import { requireAuth } from '../middleware/auth';

const router = express.Router();
const resolvedSecret = process.env.JWT_SECRET;
if (!resolvedSecret && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET 未配置，无法在生产环境启动');
}
const JWT_SECRET: Secret = resolvedSecret || 'dev-secret';
const TOKEN_TTL: SignOptions['expiresIn'] = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];

const authLimiter = rateLimit({
  windowMs: Math.max(Number(process.env.RATE_LIMIT_AUTH_WINDOW_MS || 15 * 60 * 1000), 60 * 1000),
  max: Math.max(Number(process.env.RATE_LIMIT_AUTH_MAX || 20), 5),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '认证请求过于频繁，请稍后再试' },
});

router.use(['/login', '/register'], authLimiter);

const sanitizeUser = (user: any) => {
  if (!user) return null;
  const { password_hash, ...rest } = user;
  return rest;
};

const createToken = (user: any) =>
  jwt.sign(
    {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      email: user.email,
      role: user.role,
      status: user.status,
    },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: '用户名、邮箱和密码均不能为空' });
    }

    if (username.length < 2 || username.length > 24) {
      return res.status(400).json({ error: '用户名长度需在 2-24 个字符之间' });
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ error: '邮箱格式不正确' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度至少 6 位' });
    }

    const existingUser = await dbGet('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);
    if (existingUser) {
      return res.status(409).json({ error: '用户名或邮箱已被注册' });
    }

    const hashed = bcrypt.hashSync(password, 10);
    const result = await dbRun(
      'INSERT INTO users (username, display_name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?)',
      [username, username, email, hashed, 'user', 'active']
    );

    const newUser = await dbGet('SELECT * FROM users WHERE id = ?', [result.lastID]);
    const token = createToken(newUser);
    res.status(201).json({ user: sanitizeUser(newUser), token });
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({ error: '注册失败，请稍后再试' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      return res.status(400).json({ error: '请输入账号和密码' });
    }

    const user = await dbGet(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [emailOrUsername, emailOrUsername]
    );

    if (!user) {
      return res.status(401).json({ error: '账号或密码错误' });
    }

    if (user.status === 'banned') {
      return res.status(403).json({ error: '该账号已被封禁，请联系维护者' });
    }

    const matched = bcrypt.compareSync(password, user.password_hash);
    if (!matched) {
      return res.status(401).json({ error: '账号或密码错误' });
    }

    const token = createToken(user);
    res.json({ user: sanitizeUser(user), token });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ error: '登录失败，请稍后再试' });
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

router.get('/verify', requireAuth, (req, res) => {
  res.json({ authenticated: true, user: req.user });
});

export default router;

