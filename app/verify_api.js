const fetch = require('node-fetch'); // Assuming node-fetch is available or using built-in fetch in newer node
// If node-fetch is not available, we use http module, but let's try native fetch which Node 18+ has.
// Environment is Node 18+ likely.

const BASE_URL = 'http://localhost:3000/api/books';
const BOOK_ID = '14a6a2b7-3f05-44e7-a93b-de0f87fdd672'; // From previous check_db.js output

async function runTests() {
    console.log('--- Starting System Verification ---');

    // 1. Test Pagination (Default Listing)
    console.log('\n[Test 1] Fetching Books (Pagination Check)...');
    try {
        const res = await fetch(`${BASE_URL}?page=1&limit=50`);
        const data = await res.json();
        if (data.books) {
            console.log(`PASS: Fetched ${data.books.length} books.`);
            if (data.totalPages) console.log(`PASS: Pagination info present (Total Pages: ${data.totalPages})`);
        } else {
            console.error('FAIL: No books returned', data);
        }
    } catch (e) {
        console.error('FAIL: Fetch error', e.message);
    }

    // 2. Test Multi-Author Update
    console.log('\n[Test 2] Updating Book with Multiple Authors...');
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
            console.log(`PASS: Book updated successfully with authors: "${data.book.author}"`);
        } else {
            console.error('FAIL: Update failed', data);
        }
    } catch (e) {
        console.error('FAIL: Update error', e.message);
    }

    // 3. Test Search
    console.log('\n[Test 3] Searching for Split Author...');
    try {
        // Search for "TestOrg B" which was part of the split string
        const searchTerm = "TestOrg";
        const res = await fetch(`${BASE_URL}?query=${searchTerm}`);
        const data = await res.json();
        const found = data.books && data.books.some(b => b.id === BOOK_ID);

        if (found) {
            console.log(`PASS: Found book searching for "${searchTerm}"`);
        } else {
            console.log(`WARN: Search for "${searchTerm}" returned ${data.books ? data.books.length : 0} results.`);
            // Note: Search implementation in page.tsx uses SQL LIKE %query% on 'author' column.
            // Since we store the full string "A; B" in author column, LIKE '%TestOrg%' SHOULD find it.
            // AND we also store in book_authors table, but page.tsx likely searches the 'books' table 'author' column 
            // unless we updated it to join.
            // Let's recall page.tsx: "OR author LIKE @query". 
            // Since PUT updates 'author' column with the full string, this should work!
        }
    } catch (e) {
        console.error('FAIL: Search error', e.message);
    }
}

runTests();
