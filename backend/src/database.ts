import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(__dirname, '../data/diary.db');
const dbDir = path.dirname(dbPath);

// 确保数据目录存在
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

// 自定义 dbRun 以正确返回 lastID 和 changes
function dbRun(sql: string, params?: any[]): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve, reject) => {
    db.run(sql, params || [], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}

// 自定义 dbAll 以支持参数化查询
function dbAll(sql: string, params?: any[]): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params || [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// 自定义 dbGet 以支持参数化查询
function dbGet(sql: string, params?: any[]): Promise<any> {
  return new Promise((resolve, reject) => {
    db.get(sql, params || [], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

export interface Diary {
  id?: number;
  title: string;
  content: string;
  cover_image?: string;
  images?: string; // JSON array of image URLs
  created_at?: string;
  updated_at?: string;
}

export interface Comment {
  id?: number;
  diary_id: number;
  author: string;
  content: string;
  reply_to?: number;
  created_at?: string;
}

export async function initDatabase() {
  // 创建MyShards表
  await dbRun(`
    CREATE TABLE IF NOT EXISTS diaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      cover_image TEXT,
      images TEXT,
      is_pinned INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 创建问候语表
  await dbRun(`
    CREATE TABLE IF NOT EXISTS greetings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 迁移现有数据：添加新列（如果表已存在）
  try {
    await dbRun(`ALTER TABLE diaries ADD COLUMN cover_image TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }
  try {
    await dbRun(`ALTER TABLE diaries ADD COLUMN images TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }
  try {
    await dbRun(`ALTER TABLE diaries ADD COLUMN is_pinned INTEGER DEFAULT 0`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }

  // 初始化默认问候语
  const existingGreeting = await dbGet('SELECT id FROM greetings LIMIT 1');
  if (!existingGreeting) {
    await dbRun('INSERT INTO greetings (content) VALUES (?)', ['欢迎来到我的日记']);
  }

  // 创建留言表
  await dbRun(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      diary_id INTEGER NOT NULL,
      author TEXT NOT NULL,
      content TEXT NOT NULL,
      reply_to INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (diary_id) REFERENCES diaries(id) ON DELETE CASCADE,
      FOREIGN KEY (reply_to) REFERENCES comments(id) ON DELETE CASCADE
    )
  `);

  // 创建索引
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_comments_diary_id ON comments(diary_id)`);
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_comments_reply_to ON comments(reply_to)`);

  console.log('✅ 数据库初始化完成');
}

export { dbRun, dbAll, dbGet, db };

