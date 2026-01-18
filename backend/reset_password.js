
const sqlite3 = require('sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = 'd:/work/Diary/backend/data/diary.db';
const db = new sqlite3.Database(dbPath);

const newPassword = 'admin123';
const newEmail = 'antelope@example.com';
const username = '羚羊';

const hash = bcrypt.hashSync(newPassword, 10);

db.run(
    'UPDATE users SET password_hash = ?, email = ? WHERE username = ? AND role = ?',
    [hash, newEmail, username, 'maintainer'],
    function (err) {
        if (err) {
            console.error('Error updating password:', err);
        } else {
            console.log(`Successfully updated credentials for user ${username}. Changes: ${this.changes}`);
        }
        db.close();
    }
);
