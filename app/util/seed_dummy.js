/**
 * seed_dummy.js
 * ---------------
 * สร้างข้อมูลหนังสือ Dummy สำหรับทดสอบระบบ
 * 
 * ⚠️ คำเตือน: Script นี้จะเพิ่มข้อมูลทดสอบลงฐานข้อมูลจริง
 *    ใช้เฉพาะตอนพัฒนา/ทดสอบเท่านั้น
 * 
 * วิธีใช้:
 *   node util/seed_dummy.js
 * 
 * หมายเหตุ:
 *   - ใช้ sql.js สำหรับ Cross-Platform Compatibility
 *   - จะสร้างหนังสือ Dummy 60 เล่ม
 */

const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');

const dbPath = path.join(__dirname, '..', '..', 'data', 'babi.db');

async function main() {
    console.log('🌱 สร้างข้อมูลหนังสือ Dummy...');
    console.log('DB Path:', dbPath);

    const SQL = await initSqlJs();

    let db;
    if (fs.existsSync(dbPath)) {
        const fileBuffer = fs.readFileSync(dbPath);
        db = new SQL.Database(fileBuffer);
    } else {
        console.log('📝 สร้างฐานข้อมูลใหม่...');
        db = new SQL.Database();
    }

    // Ensure table exists
    db.run(`
        CREATE TABLE IF NOT EXISTS books (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            author TEXT,
            description TEXT,
            category TEXT,
            folderPath TEXT NOT NULL,
            fileName TEXT NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run('BEGIN TRANSACTION');

    for (let i = 1; i <= 60; i++) {
        const id = randomUUID();
        db.run(
            `INSERT INTO books (id, title, author, description, category, folderPath, fileName, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [id, `Dummy Book ${i}`, `Author ${i}`, `Description for book ${i}`, 'Fiction', `uploads/${id}`, `dummy_${i}.pdf`]
        );
    }

    db.run('COMMIT');

    // Save to file
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);

    console.log('✅ เพิ่มหนังสือ Dummy 60 เล่มเรียบร้อย');
    db.close();
}

main().catch(console.error);
