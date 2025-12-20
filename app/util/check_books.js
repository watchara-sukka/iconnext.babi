/**
 * check_books.js
 * ---------------
 * แสดงรายการหนังสือทั้งหมดในฐานข้อมูล (id, title, folderPath)
 * 
 * วิธีใช้:
 *   node util/check_books.js
 * 
 * หมายเหตุ:
 *   - ใช้ sql.js สำหรับ Cross-Platform Compatibility
 *   - ฐานข้อมูลอยู่ที่ ../data/babi.db
 */

const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', '..', 'data', 'babi.db');

async function main() {
    console.log('📚 ตรวจสอบหนังสือในฐานข้อมูล');
    console.log('DB Path:', dbPath);

    if (!fs.existsSync(dbPath)) {
        console.error('❌ ไม่พบไฟล์ฐานข้อมูล:', dbPath);
        process.exit(1);
    }

    const SQL = await initSqlJs();
    const fileBuffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(fileBuffer);

    const result = db.exec('SELECT id, title, folderPath FROM books');

    if (result.length > 0) {
        const columns = result[0].columns;
        const books = result[0].values.map(row => {
            const obj = {};
            columns.forEach((col, i) => obj[col] = row[i]);
            return obj;
        });
        console.log(JSON.stringify(books, null, 2));
        console.log(`\n✅ พบ ${books.length} เล่ม`);
    } else {
        console.log('📭 ไม่มีหนังสือในฐานข้อมูล');
    }

    db.close();
}

main().catch(console.error);
