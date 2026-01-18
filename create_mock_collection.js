
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend/data/diary.db');
const db = new sqlite3.Database(dbPath);

const collectionTitle = '2025 年度总结';
const collectionDesc = '这一年的点点滴滴，汇总于此。';
const userId = 1; // Assuming '羚羊' or maintainer has ID 1

db.serialize(() => {
    // 1. Create Collection
    db.run(
        `INSERT INTO collections (title, description, user_id, created_at, updated_at) VALUES (?, ?, ?, datetime('now'), datetime('now'))`,
        [collectionTitle, collectionDesc, userId],
        function (err) {
            if (err) {
                return console.error('插入合集失败:', err.message);
            }
            const collectionId = this.lastID;
            console.log(`✅ 已创建合集 ID: ${collectionId}, 标题: ${collectionTitle}`);

            // 2. update some diaries to this collection
            // Let's create a new diary specifically for this
            const diaryTitle = '春日游记';
            const diaryContent = '今天天气真好，去公园玩了一圈。';

            db.run(
                `INSERT INTO diaries (title, content, user_id, collection_id, created_at, updated_at) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
                [diaryTitle, diaryContent, userId, collectionId],
                function (err) {
                    if (err) return console.error(err);
                    console.log(`✅ 已创建并在合集中的日记 ID: ${this.lastID}`);
                }
            );

            // 3. update another diary to this collection
            const diaryTitle2 = '夏日海边';
            const diaryContent2 = '大海啊全是水。';

            db.run(
                `INSERT INTO diaries (title, content, user_id, collection_id, created_at, updated_at) VALUES (?, ?, ?, ?, datetime('now', '-3 months'), datetime('now'))`,
                [diaryTitle2, diaryContent2, userId, collectionId],
                function (err) {
                    if (err) return console.error(err);
                    console.log(`✅ 已创建并在合集中的日记 ID: ${this.lastID}`);
                }
            );
        }
    );
});

db.close();
