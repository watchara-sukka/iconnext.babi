
<img src="./docs/logo-full.png" alt="APP LOGO" width="100px" /> 
#Babi Portable E-Book Portal

![CI/CD Status](https://img.shields.io/github/actions/workflow/status/[user]/[repo]/main.yml?style=flat-square)
![Release](https://img.shields.io/github/v/release/[user]/[repo]?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS-lightgrey?style=flat-square)

## ภาพรวม

**Babi Portable E-Book Portal** เป็น Portable Application(สำหรับ Windows/Mac) ในการบริหารจัดการ e-book โดยทำงานบน Removavle Storage 


โดยพัฒนาผ่าน **Electron**, **React**, **Vite**, and **Tailwind CSS**.

![Project Overview](./docs/project%20overview.jpg)

**จุดเด่น**: 

    - **Fast Startup**: ปรับปรุงความเร็วในการเปิดโปรแกรมโดยการเปลี่ยนจาก Next.js มาเป็น Vite
    - **True Portability**: จัดเตรียมข้อมูล (Database/Uploads) ไว้ข้างตัวแอปบน USB ได้โดยตรง
    - **No Port Conflicts**: ไม่ต้องรัน Local Server (Node.js) ในพื้นหลัง ทำให้ไม่มีปัญหาเรื่องพอร์ตถูกใช้งานซ้ำ
---

## สถาปัตยกรรมระบบ

The system is designed for **portability** and **isolation**.

![Architecture Diagram](./docs/app-architecture.png)

### Tech Stack
* **Runtime:** Electron (Main Process)
* **Frontend:** React + Vite + Tailwind CSS (Renderer Process)
* **ฐานข้อมูล:** SQLite(ผ่าน [sql.js](https://sql.js.org/)สำหรับ Browser environment ใน Electron)
* **การเก็บข้อมูล:** เก็บข้อมูลผบน removable storage (Relative path to the executable)
* **ภาษาในการพัฒนา:** TypeScript / JavaScript

---

## การเริ่มต้นใช้งาน

 เราใช้ **Dev Containers**เพื่อให้มั่นใจได้ว่าสภาพแวดล้อมการพัฒนามีความสม่ำเสมอสำหรับนักพัฒนาทุกคน โดยไม่จำเป็นต้องติดตั้ง Node.js หรือส่วนประกอบอื่นๆ ในเครื่อง

### ความต้องการขั้นต้น
1.  [Docker Desktop](https://www.docker.com/products/docker-desktop)
2.  [Visual Studio Code](https://code.visualstudio.com/)
    - [Dev Containers Extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

### ขั้นตอนการติดตั้ง project
1.  โคลนrepository ผ่านคำสั่ง
```bash
 `git clone https://github.com/watchara-sukka/iconnext.babi.git`.
 ```
2.  เปิดโฟลเดอร์ใน VS Code.
3.  คลิก  **"Reopen in Container"** เมื่อขึนข้อความ (หรือกด `F1` > `Dev Containers: Reopen in Container`).
4.  รอจนกว่าจะเริ่มสรา้ง devcontain สำเร็จโดยจะทำการติดตั้งสิ่งที่จำเป็นทั้งหมดโดยอัติโนมัติ.

### โครงสร้างproject
```
/workspaces/iconnext.babi/
├── app-vite/             # แอปพลิเคชัน Electron + Vite (Source Code ปัจจุบัน)
│   ├── src/              # React Frontend
│   ├── electron/         # Electron Main/Preload scripts
│   ├── public/           # Assets
│   └── package.json
├── data/                 # ฐานข้อมูล SQLite (Shared)
├── uploads/              # โฟลเดอร์เก็บไฟล์หนังสือ (Shared)
├── scripts/              # สคริปต์สำหรับช่วย Build และ Sync ลง USB
└── README.md
```

---

## กระพัฒนาแอพ 

ภายใน Dev Container, เราสามารถใช้คำสั่ง terminal ทั่วไปได้:

| Task | Command | Description |
| :--- | :--- | :--- |
| **Start Dev Server** | `dev:electron` | ทำงาน Vite and Electron in watch mode with Hot Reload.(แสดงหน้าจอโปรแกรมผ่าน webbrowser) |
| **Lint Code** | `npm run lint` | ตรวจสอบรูปแบบการเขียนโค้ดผ่าน ESLint. |
| **Build Local(Win)** | `npm run build:win` | สรา้ง  package สำหรับ Windows(.exe). |
| **Build Local(MacOS)** | `npm run build:mac` | สรา้ง  package สำหรับ MacOS(.app) |

### Database Management
The SQLite database file is located at `./data/library.db` (gitignored).
* To reset the DB: `npm run db:reset`
* To seed mock data: `npm run db:seed`

---

## ⚙️ CI/CD Pipeline 

ในกระบวนการติดตั้งเราใช้ **GitHub Actions**  ซึ่งจะเริ่ม pipeline ผ่าน **Git Tags**.

![CI/CD Architecture](./docs/pipe-line.png)

### การบวนการปล่อยโปรแกรม
ในการสรา้งโปรแกรมเวอร์ชั่นใหม่ (Windows .exe & macOS .dmg), ให้ดำเนอนการตามนี้:

1.  **Commit & Push** การเปลี่ยนแปลงของ code ไปยัง `main`.
2.  **Create a Tag:** สรา้ง tag ตามรูปแบบ semantic version (e.g., `v1.0.0`)ผ่านคำสั่ง. 
    ```bash
    git tag v1.0.0
    git push origin v1.0.0
    ```
3.  **ตรวจสอบวการทำงาน Github Action:**
    * workflow จะถูกสรา้งโดยอัตโนมัติ.
    * มันจะแบ่งงานในการสรา้ง **Windows** and **macOS** แอพขนานกันไป.
    * หลักจากทำงานสำเร็จแอพจะถูกสรา้งไปไว้ที่**[GitHub Releases](https://github.com/watchara-sukka/iconnext.babi/releases)**.


### โครงสร้างไดเรกทอรี (USB Version - Deployment)
เมื่อ Build และวางบน USB แล้ว โครงสร้างจะเป็นดังนี้:
```
[USB Drive Root]/
├── data/                 # ฐานข้อมูล SQLite (ใช้งานร่วมกันทุก Platform)
│   └── babi.db
├── uploads/              # ที่เก็บไฟล์หนังสือและรูปปก
│   └── {id}
│       └── {filename}.pdf
│       └── cover.jpg
├── Windows/              # ตัวโปรแกรมสำหรับ Windows
│   └── Babi E-book Portal.exe
└── Mac/                  # ตัวโปรแกรมสำหรับ macOS (.app bundle)
    └── Babi E-book Portal.app
```


## ฟีเจอร์

- **แสดงรายชื่อหนังสือ**: 
- [] เลือกดูหนังสือ
- [x] ระบบแบ่งหน้า
- **ข้อมูลหนังสือ**: 
- [x] รายละเอียดหนังสือ
- [] รายละเอียดผู้แต่ง
- [] รายละเอียดหมวดหมู่
- [] รายละเอียด ISBN
- [] รายละเอียด ภาษาของหนังสือ
- [] รายละเอียด Edition หนังสือ
- **ค้นหา**: 
- [] ค้นหาแบบเรียลไทม์จากชื่อเรื่อง, ผู้แต่ง, หมวดหมู่ หรือ ISBN
- **นำเข้าหนังสือ**: 
- [x] อัปโหลดไฟล์ PDF และ EPUB ได้โดยตรงผ่านแอปพลิเคชัน
- [x] Ask Google เรียกข้อมูลหนังสือจาก Google Books API
- [x] ป้องกันการอัพโหลดไฟล์หนังสือซ้ำได้(ตรวจสอบจาก hash file)
- [] ข้อมูลรายละเอียดหนังสือที่อยู่ใน meta data ไฟล์ PDF จะต้องตรงกับในฐานข้อมูลระบบ 
- **พกพาได้**: ออกแบบมาให้รันได้ด้วย Node.js runtime ในเครื่อง หรือ system runtime
- **เครื่องมืออ่านหนังสือ**
- **รายงาน**:
- **เครื่องมือ**:
- [x]สร้าง hash file หนังสือบางเล่มในฐานข้อมูลไม่มี hash file มาก่อนให้สรา้งปุ่มใต้หน้าปกหนังสือในกรณีไม่พบค่า hash file ของหนังสือเล่นนั้นเมื่อกดจะหาค่า hashfile  และบันทึกลงในฐานข้อมูลทันที และถ้ามีค่า hash file ของ ebook อยู่แล้วให้แสดงค่าแทนปุ่ม(อ้างอิงจากป้องกันการอัพโหลดไฟล์หนังสือซ้ำได้)
- [x] เพิ่มไอคอนช่วยเหลือ(?) อธิบายส่วนต่างๆ ของโปรแกรมว่าทำอะไร
- [x] ปรับจากการเปิดหน้า web browser โดย nodejs ไปยัง Cross Platform Framework เช่น **Electron** แทน (รองรับ Single Executable File)
- [x] เพิ่มแนวทางการ update program ผ่านการใช้ git tag, git้ัิhub action, github release เพื่อ 
- [x] ปรับปรุงการติดตั้งโปรแกรมครั้งแรกมี ความช้ามากๆ เนื่องจากใช้ nextjs ใช้เวลาในcopy node_module นานมาก


