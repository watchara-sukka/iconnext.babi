/**
 * verify_api.js
 * ---------------
 * ทดสอบ API Endpoints ของระบบ
 * รวมถึง: Pagination, Multi-Author Update, Search
 * 
 * วิธีใช้:
 *   1. รัน Server ก่อน: npm run dev
 *   2. รัน Script: node util/verify_api.js
 * 
 * หมายเหตุ:
 *   - ต้องมี Server รันอยู่ที่ http://localhost:3000
 *   - ใช้ทดสอบการทำงานของ API หลังจากแก้โค้ด
 */

const BASE_URL = 'http://localhost:3000/api/books';
const BOOK_ID = '14a6a2b7-3f05-44e7-a93b-de0f87fdd672'; // ตัวอย่าง Book ID

async function runTests() {
    console.log('🧪 เริ่มทดสอบ API');
    console.log('==================\n');

    // 1. Test Pagination (Default Listing)
    console.log('[Test 1] ทดสอบ Pagination...');
    try {
        const res = await fetch(`${BASE_URL}?page=1&limit=50`);
        const data = await res.json();
        if (data.books) {
            console.log(`✅ PASS: ดึงข้อมูล ${data.books.length} เล่ม`);
            if (data.totalPages) console.log(`   📄 Total Pages: ${data.totalPages}`);
        } else {
            console.error('❌ FAIL: ไม่มีข้อมูลหนังสือ', data);
        }
    } catch (e) {
        console.error('❌ FAIL: Fetch error', e.message);
    }

    // 2. Test Multi-Author Update
    console.log('\n[Test 2] ทดสอบอัปเดตหลาย Author...');
    const newAuthors = "TestUser A; TestOrg B";
    try {
        const res = await fetch(`${BASE_URL}/${BOOK_ID}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: "Integration Test Book",
                author: newAuthors,
                description: "Testing API",
                fileName: "test.pdf",
                folderPath: "uploads/test"
            })
        });
        const data = await res.json();
        if (data.success && data.book.author === newAuthors) {
            console.log(`✅ PASS: อัปเดต Author สำเร็จ: "${data.book.author}"`);
        } else {
            console.error('❌ FAIL: อัปเดตล้มเหลว', data);
        }
    } catch (e) {
        console.error('❌ FAIL: Update error', e.message);
    }

    // 3. Test Search
    console.log('\n[Test 3] ทดสอบ Search...');
    try {
        const searchTerm = "TestOrg";
        const res = await fetch(`${BASE_URL}?query=${searchTerm}`);
        const data = await res.json();
        const found = data.books && data.books.some(b => b.id === BOOK_ID);

        if (found) {
            console.log(`✅ PASS: ค้นหา "${searchTerm}" พบหนังสือที่ต้องการ`);
        } else {
            console.log(`⚠️ WARN: ค้นหา "${searchTerm}" พบ ${data.books ? data.books.length : 0} ผลลัพธ์`);
        }
    } catch (e) {
        console.error('❌ FAIL: Search error', e.message);
    }

    console.log('\n==================');
    console.log('🏁 ทดสอบเสร็จสิ้น');
}

runTests();
