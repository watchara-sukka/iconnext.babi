# Babi E-book Portal - ชุดข้อมูลจำเพาะ (Spec-Kit)

## 1. ภาพรวมโปรเจกต์
**ชื่อ**: Babi E-book Portal
**คำอธิบาย**: ระบบจัดการหนังสืออิเล็กทรอนิกส์ (E-book) แบบพกพา ที่ออกแบบมาให้ทำงานได้โดยตรงจากอุปกรณ์จัดเก็บข้อมูลแบบถอดได้ (USB/External HDD) ช่วยให้ผู้ใช้สามารถจัดการ ค้นหา และอ่านคอลเลกชัน PDF และ EPUB ของตนเองได้บนทุกเครื่องคอมพิวเตอร์โดยไม่ต้องติดตั้งโปรแกรมที่มีความซับซ้อน
**เวอร์ชัน**: 0.5.0

## 2. ข้อมูลจำเพาะทางเทคนิค

### 2.1 เทคโนโลยีที่ใช้ (Technology Stack)
- **Runtime**: Electron 39.2.7
- **Bundler**: Vite 6.0.0
- **Frontend Framework**: React 19.2.0
- **Language**: TypeScript 5.9.3
- **Styling**: TailwindCSS 4.1.18
- **Database**: SQLite (ผ่าน `sql.js` สำหรับ Browser environment ใน Electron)
- **PDF Processing**: `pdfjs-dist`
- **Icons**: `lucide-react`

### 2.2 สภาพแวดล้อม (Environment)
- **Platform**: รองรับ Cross-platform (Windows, macOS, Linux)
- **Portability**: ออกแบบมาให้มีทุกอย่างครบจบในโฟลเดอร์เดียว (Self-contained) รองรับฟังก์ชัน "Plug & Play" บน USB drive
- **Data Persistence**: เก็บฐานข้อมูลและไฟล์แนบไว้ในโฟลเดอร์ `data` และ `uploads` ที่อยู่ระดับเดียวกันกับตัวแอปพลิเคชัน (Portable Mode)

## 3. สถาปัตยกรรมระบบ

### 3.1 โครงสร้างไดเรกทอรี (สำหรับนักพัฒนา)
```
iconnext.babi/
├── app-vite/             # แอปพลิเคชัน Electron + Vite หลัก
│   ├── src/              # React Frontend Source
│   ├── electron/         # Electron Main Process & Preload
│   ├── public/           # Static Assets
│   └── package.json      # Dependencies และ Scripts
├── data/                 # ชั้นข้อมูล (Data Persistence Layer) - Portable babi.db
├── uploads/              # ที่เก็บไฟล์หนังสือ (Portable Storage)
├── scripts/              # สคริปต์สำหรับช่วย Build / Sync / Packaging
└── README.md             # เอกสารทั่วไป
```

### 3.2 โครงสร้างไดเรกทอรี (USB Version - Deployment)
เมื่อ Build และวางบน USB แล้ว โครงสร้างจะเป็นดังนี้:
```
[USB Drive Root]/
├── data/                 # ฐานข้อมูล SQLite (ใช้งานร่วมกันทุก Platform)
│   └── babi.db
├── uploads/              # ที่เก็บไฟล์หนังสือและรูปปก
├── Windows/              # ตัวโปรแกรมสำหรับ Windows (win-unpacked)
│   └── Babi E-book Portal.exe
└── Mac/                  # ตัวโปรแกรมสำหรับ macOS (.app bundle)
    └── Babi E-book Portal.app
```

### 3.2 โครงสร้างฐานข้อมูล (Database Schema)
ระบบใช้ฐานข้อมูลเชิงสัมพันธ์ SQLite (`data/babi.db`)

#### ตาราง `books`
เก็บ metadata ของหนังสือแต่ละเล่ม
| คอลัมน์ | ประเภท | คำอธิบาย |
| :--- | :--- | :--- |
| `id` | TEXT (PK) | UUID ของหนังสือ |
| `title` | TEXT | ชื่อหนังสือ |
| `author` | TEXT | ชื่อผู้แต่งหลัก |
| `description` | TEXT | เรื่องย่อ/คำอธิบาย |
| `category` | TEXT | หมวดหมู่ |
| `isbn` | TEXT | ISBN-10 หรือ ISBN-13 |
| `folderPath` | TEXT | Path สัมพัทธ์ไปยังโฟลเดอร์เก็บไฟล์หนังสือ |
| `fileName` | TEXT | ชื่อไฟล์ของ E-book |
| `coverImage` | TEXT | Path ไปยังรูปหน้าปกที่แคชไว้ |
| `fileSize` | INTEGER | ขนาดไฟล์ (bytes) |
| `pageCount` | INTEGER | จำนวนหน้า |
| `publisher` | TEXT | สำนักพิมพ์ |
| `year` | INTEGER | ปีที่พิมพ์ |
| `language` | TEXT | รหัสภาษา (เช่น 'en', 'th') |
| `fileHash` | TEXT | SHA-256 hash สำหรับตรวจสอบความซ้ำซ้อน |
| `createdAt` | DATETIME | เวลาที่นำเข้า |
| `updatedAt` | DATETIME | เวลาที่แก้ไขล่าสุด |

#### ตาราง `authors`
เก็บข้อมูลผู้แต่งที่ไม่ซ้ำกัน
| คอลัมน์ | ประเภท | คำอธิบาย |
| :--- | :--- | :--- |
| `id` | INTEGER (PK) | ID แบบเพิ่มอัตโนมัติ |
| `name` | TEXT | ชื่อผู้แต่ง (ห้ามซ้ำ) |
| `bio` | TEXT | ชีวประวัติผู้แต่ง |
| `photoPath` | TEXT | Path ไปยังรูปภาพผู้แต่ง |

#### ตาราง `book_authors`
ตารางเชื่อมความสัมพันธ์แบบ Many-to-Many ระหว่างหนังสือและผู้แต่ง
| คอลัมน์ | ประเภท | คำอธิบาย |
| :--- | :--- | :--- |
| `book_id` | TEXT (FK) | อ้างอิง `books.id` |
| `author_id` | INTEGER (FK)| อ้างอิง `authors.id` |
| `role` | TEXT | บทบาท เช่น 'author', 'editor' |

## 4. ฟีเจอร์หลักและกระบวนการทำงาน

### 4.1 กระบวนการนำเข้าหนังสือ (Import Process)
1.  **อัปโหลด**: ผู้ใช้อัปโหลดไฟล์ PDF/EPUB ผ่านหน้า UI
2.  **ตรวจสอบ**: API ตรวจสอบประเภทไฟล์และคำนวณค่า `fileHash`
3.  **เช็คความซ้ำซ้อน**: ระบบตรวจสอบใน DB ว่ามี `fileHash` นี้อยู่แล้วหรือไม่
4.  **ดึงข้อมูล Metadata**:
    - ดึงข้อมูลพื้นฐาน (ชื่อไฟล์, ขนาด)
    - ฟีเจอร์ "Ask Google" เรียก Google Books API โดยใช้ชื่อเรื่อง/ISBN เพื่อดึงข้อมูลเพิ่มเติม
5.  **จัดเก็บ**: บันทึกไฟล์ลงใน `uploads/<uuid>/`
    - ไฟล์หนังสือ: `uploads/<uuid>/<fileName>.pdf`
    - ไฟล์ปก: `uploads/<uuid>/cover.jpg`
6.  **บันทึกฐานข้อมูล**: เพิ่มข้อมูลลงในตาราง `books` และเชื่อมโยงกับ `authors`

### 4.2 การค้นหาและเรียกดู (Search & Discovery)
- กรองข้อมูลแบบ Real-time ตามชื่อเรื่อง, ผู้แต่ง หรือ ISBN
- รองรับ Pagination สำหรับคอลเลกชันขนาดใหญ่

## 5. คำแนะนำการติดตั้งและใช้งาน

### 5.1 สำหรับนักพัฒนา (Local Development)
1.  เข้าไปที่โฟลเดอร์ `app/`
2.  รันคำสั่ง `npm install`
3.  รันคำสั่ง `npm run dev` เพื่อเริ่มเซิร์ฟเวอร์ที่ `http://localhost:3000`

### 5.2 การ Build เพื่อพกพา/ใช้งานจริง (Portable/Production)
### 5.2 การ Build เพื่อพกพา/ใช้งานจริง (Portable/Production - เร็วและเล็กกว่าเดิม)
1.  รันคำสั่ง `npm run build` ในโฟลเดอร์ `app/` (ระบบจะสร้างโฟลเดอร์ `.next/standalone` อัตโนมัติ)
2.  **สำหรับการติดตั้งลง USB**:
    - คัดลอกไฟล์ทั้งหมดจาก **`.next/standalone`** ไปยังโฟลเดอร์ `app/` บน USB (ขั้นตอนนี้จะเร็วกว่าเดิมมาก เพราะไม่ต้องก๊อปปี้ `node_modules` ทั้งหมด)
    - คัดลอกโฟลเดอร์ **`.next/static`** ไปวางที่ `app/.next/static` บน USB
    - คัดลอกโฟลเดอร์ **`public`** ไปวางที่ `app/public` บน USB
    - ตรวจสอบให้แน่ใจว่ามีโฟลเดอร์ `data/` อยู่ที่ root ของ USB (ระดับเดียวกับ `app/`)
    - ในการรันโปรแกรม ให้ใช้คำสั่ง `node server.js` (หรือแก้ไขไฟล์ start.bat/sh ให้เรียกคำสั่งนี้แทน `npm start`)

## 6. แผนงานในอนาคต (Future Roadmap)
- [ ] พัฒนาด้วย Tuari (Rust) เพื่อประสบการณ์การใช้งานแบบ Desktop App ที่สมบูรณ์
- [ ] เครื่องมืออ่าน PDF/EPUB ภายในแอพ โดยใช้ `react-pdf` หรือไลบรารีที่คล้ายกัน
- [ ] เพิ่มความสามารถในการแก้ไข Metadata ให้ดียิ่งขึ้น
