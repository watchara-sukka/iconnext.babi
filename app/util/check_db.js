/**
 * check_db.js
 * ------------
 * แสดง Schema และตัวอย่างข้อมูลจากฐานข้อมูล SQLite
 * รวมถึงตาราง books, authors, book_authors
 * 
 * วิธีใช้:
 *   node util/check_db.js
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
    console.log('🔍 ตรวจสอบโครงสร้างฐานข้อมูล');
    console.log('DB Path:', dbPath);

    if (!fs.existsSync(dbPath)) {
        console.error('❌ ไม่พบไฟล์ฐานข้อมูล:', dbPath);
        process.exit(1);
    }

    const SQL = await initSqlJs();
    const fileBuffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(fileBuffer);

    // Get Schema
    console.log('\n--- Books Table Schema ---');
    const schemaResult = db.exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='books'");
    if (schemaResult.length > 0 && schemaResult[0].values.length > 0) {
        console.log(schemaResult[0].values[0][0]);
    } else {
        console.log('Table not found');
    }
    console.log('--------------------------\n');

    // Get Columns Info
    console.log('--- Columns ---');
    const columnsResult = db.exec('PRAGMA table_info(books)');
    if (columnsResult.length > 0) {
        console.table(columnsResult[0].values.map(row => ({
            cid: row[0],
            name: row[1],
            type: row[2],
            notnull: row[3],
            dflt_value: row[4],
            pk: row[5]
        })));
    }

    // Get 1 book
    console.log('\n--- Sample Book ---');
    const bookResult = db.exec('SELECT * FROM books LIMIT 1');
    if (bookResult.length > 0 && bookResult[0].values.length > 0) {
        const columns = bookResult[0].columns;
        const values = bookResult[0].values[0];
        const book = {};
        columns.forEach((col, i) => book[col] = values[i]);
        console.log(book);
    } else {
        console.log('No books found');
    }

    // Authors table
    console.log('\n--- Authors Table ---');
    const authorsResult = db.exec('SELECT * FROM authors');
    if (authorsResult.length > 0) {
        console.table(authorsResult[0].values.map(row => {
            const obj = {};
            authorsResult[0].columns.forEach((col, i) => obj[col] = row[i]);
            return obj;
        }));
    } else {
        console.log('No authors found');
    }

    // Book Authors link table
    console.log('\n--- Book Authors Link Table ---');
    const linksResult = db.exec('SELECT * FROM book_authors');
    if (linksResult.length > 0) {
        console.table(linksResult[0].values.map(row => {
            const obj = {};
            linksResult[0].columns.forEach((col, i) => obj[col] = row[i]);
            return obj;
        }));
    } else {
        console.log('No links found');
    }

    db.close();
}

main().catch(console.error);
