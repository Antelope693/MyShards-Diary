
-- Complete Schema Re-creation to eliminate all smallint/varchar artifacts
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
ALTER SCHEMA public OWNER TO diary_user;

-- Set session parameters
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

-- 1. users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    display_name TEXT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    status TEXT NOT NULL DEFAULT 'active',
    bio TEXT,
    max_upload_size_bytes BIGINT DEFAULT 10485760,
    storage_quota_bytes BIGINT DEFAULT 209715200,
    used_storage_bytes BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. diaries
CREATE TABLE diaries (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    cover_image TEXT,
    images TEXT,
    is_pinned INTEGER DEFAULT 0,
    is_locked INTEGER DEFAULT 0,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. greetings
CREATE TABLE greetings (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. comments
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    diary_id INTEGER NOT NULL REFERENCES diaries(id) ON DELETE CASCADE,
    author TEXT NOT NULL,
    content TEXT NOT NULL,
    reply_to INTEGER REFERENCES comments(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. diary_editors
CREATE TABLE diary_editors (
    id SERIAL PRIMARY KEY,
    diary_id INTEGER NOT NULL REFERENCES diaries(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending',
    approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(diary_id, user_id)
);

-- 6. user_uploads
CREATE TABLE user_uploads (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    diary_id INTEGER REFERENCES diaries(id) ON DELETE SET NULL,
    filename TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    mime_type TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_diaries_user_id ON diaries(user_id);
CREATE INDEX idx_comments_diary_id ON comments(diary_id);
CREATE INDEX idx_user_uploads_user_id ON user_uploads(user_id);

-- Initial Data (Backup from data.sql logic, but with clean types)
-- Insert the maintainer manually here if initDatabase fails to do it properly in the race
-- But we'll let initDatabase handle it first.
