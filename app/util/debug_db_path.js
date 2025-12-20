/**
 * debug_db_path.js
 * ------------------
 * ตรวจสอบ Path ของฐานข้อมูลว่าถูกต้องและไฟล์มีอยู่จริงหรือไม่
 * 
 * วิธีใช้:
 *   node util/debug_db_path.js
 * 
 * หมายเหตุ:
 *   - ใช้สำหรับ Debug เมื่อระบบหาไฟล์ฐานข้อมูลไม่เจอ
 */

const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_URL
    ? path.resolve(process.env.DATABASE_URL)
    : path.join(process.cwd(), '..', 'data', 'babi.db');

console.log('🔧 Debug Database Path');
console.log('======================');
console.log('CWD:', process.cwd());
console.log('Resolved DB Path:', dbPath);
console.log('Exists:', fs.existsSync(dbPath) ? '✅ Yes' : '❌ No');

if (fs.existsSync(dbPath)) {
    const stats = fs.statSync(dbPath);
    console.log('File Size:', (stats.size / 1024).toFixed(2), 'KB');
    console.log('Last Modified:', stats.mtime);
}
