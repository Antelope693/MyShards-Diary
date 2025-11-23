import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { initDatabase } from './database';
import diaryRoutes from './routes/diary';
import commentRoutes from './routes/comments';
import authRoutes from './routes/auth';
import uploadRoutes from './routes/upload';
import greetingRoutes from './routes/greeting';

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
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

