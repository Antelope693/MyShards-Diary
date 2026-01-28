
import sqlite3 from 'sqlite3';
import { Pool, QueryResult } from 'pg';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const isPostgres = process.env.DB_TYPE === 'postgres';

let dbSqlite: sqlite3.Database | null = null;
let dbPostgres: Pool | null = null;

if (isPostgres) {
  dbPostgres = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'diary_user',
    password: process.env.DB_PASSWORD || 'diary_pass',
    database: process.env.DB_NAME || 'diary_db',
  });
  console.log('🐘 正在连接到 PostgreSQL...');
} else {
  const dbPath = path.join(__dirname, '../data/diary.db');
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  dbSqlite = new sqlite3.Database(dbPath);
  console.log('💾 使用 SQLite 数据库');
}

// 统一 SQL 参数占位符处理
function transformSql(sql: string): string {
  if (!isPostgres) return sql;
  let count = 0;
  return sql.replace(/\?/g, () => `$${++count}`);
}

// 统一运行逻辑
async function dbRun(sql: string, params?: any[]): Promise<{ lastID: number; changes: number }> {
  const transformedSql = transformSql(sql);
  if (isPostgres && dbPostgres) {
    // PostgreSQL 需要通过 RETURNING id 来获取 lastID
    let runSql = transformedSql;
    if (sql.toLowerCase().includes('insert into')) {
      runSql += ' RETURNING id';
    }
    const res = await dbPostgres.query(runSql, params || []);
    return {
      lastID: res.rows[0]?.id || 0,
      changes: res.rowCount || 0
    };
  } else if (dbSqlite) {
    return new Promise((resolve, reject) => {
      dbSqlite!.run(sql, params || [], function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }
  throw new Error('Database not initialized');
}

async function dbAll(sql: string, params?: any[]): Promise<any[]> {
  const transformedSql = transformSql(sql);
  if (isPostgres && dbPostgres) {
    const res = await dbPostgres.query(transformedSql, params || []);
    return res.rows;
  } else if (dbSqlite) {
    return new Promise((resolve, reject) => {
      dbSqlite!.all(sql, params || [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
  throw new Error('Database not initialized');
}

async function dbGet(sql: string, params?: any[]): Promise<any> {
  const transformedSql = transformSql(sql);
  if (isPostgres && dbPostgres) {
    const res = await dbPostgres.query(transformedSql, params || []);
    return res.rows[0];
  } else if (dbSqlite) {
    return new Promise((resolve, reject) => {
      dbSqlite!.get(sql, params || [], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
  throw new Error('Database not initialized');
}

export interface User {
  id?: number;
  username: string;
  display_name?: string;
  email: string;
  password_hash: string;
  role: 'user' | 'admin' | 'maintainer';
  status?: 'active' | 'banned';
  bio?: string;
  max_upload_size_bytes?: number;
  storage_quota_bytes?: number;
  used_storage_bytes?: number;
}

// ... 其他接口定义保持不变 ...

export async function initDatabase() {
  const pkType = isPostgres ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
  const textType = isPostgres ? 'TEXT' : 'TEXT';
  const timestampType = isPostgres ? 'TIMESTAMP' : 'DATETIME';
  const timestampDefault = isPostgres ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP';

  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id ${pkType},
      username ${textType} NOT NULL UNIQUE,
      display_name ${textType},
      email ${textType} NOT NULL UNIQUE,
      password_hash ${textType} NOT NULL,
      role ${textType} NOT NULL DEFAULT 'user',
      status ${textType} NOT NULL DEFAULT 'active',
      bio ${textType},
      max_upload_size_bytes BIGINT DEFAULT 10485760,
      storage_quota_bytes BIGINT DEFAULT 209715200,
      used_storage_bytes BIGINT DEFAULT 0,
      created_at ${timestampType} DEFAULT ${timestampDefault},
      updated_at ${timestampType} DEFAULT ${timestampDefault}
    )
  `);

  const maintainerUsername = process.env.MAINTAINER_USERNAME || '羚羊';
  const maintainerEmail = process.env.MAINTAINER_EMAIL || 'antelope@example.com';
  const maintainerPassword =
    process.env.MAINTAINER_PASSWORD || process.env.ADMIN_PASSWORD || 'ChangeMe123!';

  let maintainer = await dbGet('SELECT * FROM users WHERE role = $1 LIMIT 1', ['maintainer']);

  if (!maintainer) {
    const passwordHash = bcrypt.hashSync(maintainerPassword, 10);
    const insertResult = await dbRun(
      'INSERT INTO users (username, display_name, email, password_hash, role, bio) VALUES (?, ?, ?, ?, ?, ?)',
      [maintainerUsername, maintainerUsername, maintainerEmail, passwordHash, 'maintainer', '站点维护者']
    );
    maintainer = await dbGet('SELECT * FROM users WHERE id = ?', [insertResult.lastID]);
    console.log(`✅ 已创建默认维护者账号 ${maintainerUsername}`);
  }

  await dbRun(`
    CREATE TABLE IF NOT EXISTS diaries (
      id ${pkType},
      title ${textType} NOT NULL,
      content ${textType} NOT NULL,
      cover_image ${textType},
      images ${textType},
      is_pinned INTEGER DEFAULT 0,
      is_locked INTEGER DEFAULT 0,
      user_id INTEGER,
      created_at ${timestampType} DEFAULT ${timestampDefault},
      updated_at ${timestampType} DEFAULT ${timestampDefault}
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS greetings (
      id ${pkType},
      content ${textType} NOT NULL,
      updated_at ${timestampType} DEFAULT ${timestampDefault}
    )
  `);

  // 问候语初始化
  const existingGreeting = await dbGet('SELECT id FROM greetings LIMIT 1');
  if (!existingGreeting) {
    await dbRun('INSERT INTO greetings (content) VALUES (?)', ['欢迎来到我的日记']);
  }

  // 留言表
  await dbRun(`
    CREATE TABLE IF NOT EXISTS comments (
      id ${pkType},
      diary_id INTEGER NOT NULL,
      author ${textType} NOT NULL,
      content ${textType} NOT NULL,
      reply_to INTEGER,
      user_id INTEGER,
      created_at ${timestampType} DEFAULT ${timestampDefault},
      CONSTRAINT fk_diary FOREIGN KEY (diary_id) REFERENCES diaries(id) ON DELETE CASCADE,
      CONSTRAINT fk_reply FOREIGN KEY (reply_to) REFERENCES comments(id) ON DELETE CASCADE
    )
  `);

  // 协作编辑表
  await dbRun(`
    CREATE TABLE IF NOT EXISTS diary_editors (
      id ${pkType},
      diary_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      status ${textType} NOT NULL DEFAULT 'pending',
      approved_by INTEGER,
      approved_at ${timestampType},
      created_at ${timestampType} DEFAULT ${timestampDefault},
      UNIQUE(diary_id, user_id),
      CONSTRAINT fk_diary_edit FOREIGN KEY (diary_id) REFERENCES diaries(id) ON DELETE CASCADE,
      CONSTRAINT fk_user_edit FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_approved FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // 上传记录
  await dbRun(`
    CREATE TABLE IF NOT EXISTS user_uploads (
      id ${pkType},
      user_id INTEGER NOT NULL,
      diary_id INTEGER,
      filename ${textType} NOT NULL,
      size_bytes BIGINT NOT NULL,
      mime_type ${textType},
      created_at ${timestampType} DEFAULT ${timestampDefault},
      CONSTRAINT fk_user_upload FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_diary_upload FOREIGN KEY (diary_id) REFERENCES diaries(id) ON DELETE SET NULL
    )
  `);

  // 合集表
  await dbRun(`
    CREATE TABLE IF NOT EXISTS collections (
      id ${pkType},
      title ${textType} NOT NULL,
      description ${textType},
      cover_image ${textType},
      user_id INTEGER NOT NULL,
      created_at ${timestampType} DEFAULT ${timestampDefault},
      updated_at ${timestampType} DEFAULT ${timestampDefault},
      CONSTRAINT fk_user_collection FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 通知表
  await dbRun(`
    CREATE TABLE IF NOT EXISTS notifications (
      id ${pkType},
      user_id INTEGER NOT NULL,
      type ${textType} NOT NULL,
      content ${textType} NOT NULL,
      link ${textType},
      is_read BOOLEAN DEFAULT FALSE,
      created_at ${timestampType} DEFAULT ${timestampDefault},
      CONSTRAINT fk_user_notif FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 关注表
  await dbRun(`
    CREATE TABLE IF NOT EXISTS follows (
      id ${pkType},
      follower_id INTEGER NOT NULL,
      following_id INTEGER NOT NULL,
      created_at ${timestampType} DEFAULT ${timestampDefault},
      UNIQUE(follower_id, following_id),
      CONSTRAINT fk_follower FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_following FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 举报表
  await dbRun(`
    CREATE TABLE IF NOT EXISTS reports (
      id ${pkType},
      reporter_id INTEGER NOT NULL,
      target_type ${textType} NOT NULL, -- 'diary', 'user', 'comment'
      target_id INTEGER NOT NULL,
      reason ${textType} NOT NULL,
      status ${textType} DEFAULT 'pending', -- 'pending', 'resolved', 'dismissed'
      created_at ${timestampType} DEFAULT ${timestampDefault},
      CONSTRAINT fk_reporter FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 收藏表 (Collect/Star)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS diary_collects (
      id ${pkType},
      user_id INTEGER NOT NULL,
      diary_id INTEGER NOT NULL,
      created_at ${timestampType} DEFAULT ${timestampDefault},
      UNIQUE(user_id, diary_id),
      CONSTRAINT fk_user_collect FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_diary_collect FOREIGN KEY (diary_id) REFERENCES diaries(id) ON DELETE CASCADE
    )
  `);

  // 尝试为 diaries 添加 collection_id 字段
  try {
    await dbRun('ALTER TABLE diaries ADD COLUMN collection_id INTEGER');
  } catch (e: any) {
    // Ignore if exists
  }

  // 尝试为 users 添加 pinned_at 字段 (用于排序)
  try {
    await dbRun('ALTER TABLE users ADD COLUMN pinned_at ' + timestampType);
  } catch (e: any) {
    // Ignore if exists
  }

  // 索引
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_diaries_user_id ON diaries(user_id)`);
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_comments_diary_id ON comments(diary_id)`);
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_user_uploads_user_id ON user_uploads(user_id)`);
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id)`);
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_diaries_collection_id ON diaries(collection_id)`);
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id)`);
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id)`);
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_diary_collects_user ON diary_collects(user_id)`);
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_diary_collects_diary ON diary_collects(diary_id)`);

  // 问答(Issues)表
  await dbRun(`
    CREATE TABLE IF NOT EXISTS issues (
      id ${pkType},
      user_id INTEGER NOT NULL,
      title ${textType} NOT NULL,
      content ${textType} NOT NULL,
      reply_content ${textType},
      status ${textType} NOT NULL DEFAULT 'open', -- 'open', 'replied', 'closed'
      created_at ${timestampType} DEFAULT ${timestampDefault},
      updated_at ${timestampType} DEFAULT ${timestampDefault},
      CONSTRAINT fk_issue_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  console.log('✅ 数据库初始化完成');
}

export { dbRun, dbAll, dbGet };
export const db = isPostgres ? dbPostgres : dbSqlite;
