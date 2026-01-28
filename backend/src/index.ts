import 'dotenv/config';
import express from 'express';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bodyParser from 'body-parser';
import path from 'path';
import { initDatabase } from './database';
import diaryRoutes from './routes/diary';
import commentRoutes from './routes/comments';
import authRoutes from './routes/auth';
import uploadRoutes from './routes/upload';
import greetingRoutes from './routes/greeting';
import globalLinksRoutes from './routes/globalLinks';
import userRoutes from './routes/users';
import notificationRoutes from './routes/notifications';
import collectionRoutes from './routes/collections';
import reportRoutes from './routes/reports';
import collectRoutes from './routes/collects';
import recommendationRoutes from './routes/recommendations';
import issueRoutes from './routes/issues';

const app = express();
const PORT = process.env.PORT || 3001;
const RATE_LIMIT_WINDOW_MS = Math.max(
  Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  60 * 1000
);
const RATE_LIMIT_GENERAL_MAX = Math.max(
  Number(process.env.RATE_LIMIT_GENERAL_MAX || 1000),
  100
);

const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions: CorsOptions = allowedOrigins.length
  ? { origin: allowedOrigins, credentials: true }
  : { origin: true, credentials: true };

const generalLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_GENERAL_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '请求过于频繁，请稍后再试' },
});

app.set('trust proxy', 1);
app.disable('x-powered-by');

// 中间件
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(cors(corsOptions));
app.use(generalLimiter);
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件服务（用于提供上传的图片）
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/diaries', diaryRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/greeting', greetingRoutes);
app.use('/api/global-links', globalLinksRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/collects', collectRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/issues', issueRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Diary API is running' });
});

// 初始化数据库并启动服务器
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  });
}).catch((error) => {
  console.error('❌ 数据库初始化失败:', error);
  process.exit(1);
});

