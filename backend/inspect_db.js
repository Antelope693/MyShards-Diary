
const sqlite3 = require('sqlite3');
const path = require('path');

const dbPath = 'd:/work/Diary/backend/data/diary.db';
const db = new sqlite3.Database(dbPath);

console.log('Inspecting data at:', dbPath);

db.all('SELECT id, username, email, role, status, password_hash FROM users', [], (err, rows) => {
    if (err) {
        console.error('Error querying users:', err);
    } else {
        console.log('Users in database:');
        rows.forEach(row => {
            console.log(`ID: ${row.id}, Username: ${row.username}, Email: ${row.email}, Role: ${row.role}, Status: ${row.status}`);
            // We don't print the full hash for security in logs, but maybe check if it's there
            console.log(`Password Hash starts with: ${row.password_hash.substring(0, 10)}...`);
        });
    }
    db.close();
});
