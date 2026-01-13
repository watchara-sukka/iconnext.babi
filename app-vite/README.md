# Babi E-book Portal

ระบบจัดการ E-book แบบพกพา (Portable) พัฒนาโดยใช้เทคโนโลยี Electron, React, TypeScript และ Vite

## 🛠️ DevEx: การพัฒนาและทดสอบในเครื่อง (Inner Loop)
กระบวนการสำหรับนักพัฒนาเพื่อรันและทดสอบระบบในสภาพแวดล้อม Local (Local Environment)

1.  **เข้าสู่ไดเรกทอรีโปรเจกต์:**
    ```bash
    cd app-vite
    ```

2.  **ติดตั้ง Dependencies (หากยังไม่ได้ติดตั้ง):**
    ```bash
    npm install
    ```

3.  **เริ่มระบบ Development Server:**
    ```bash
    npm run dev:electron
    ```
    *คำสั่งนี้จะรัน Vite dev server (สำหรับ Frontend HMR) และ Electron main process ควบคู่กัน*

---

## 🚀 Release Engineering: กระบวนการส่งมอบซอฟต์แวร์ (CI/CD)

### 1. Local Build Operation (การสร้าง Artifacts ด้วยตนเอง)
การสร้างไฟล์ติดตั้งหรือไฟล์สำหรับแจกจ่าย (Distributables) บนเครื่องของนักพัฒนา

*   **สำหรับ macOS (Universal - Intel & Apple Silicon):**
    ```bash
    npm run build:mac
    ```
    *Output ที่ได้: `dist-electron-vite/mac-universal/*.zip`*

*   **สำหรับ Windows (Portable):**
    ```bash
    npm run build:win
    ```
    *Output ที่ได้: `dist-electron-vite/win-unpacked` (หรือไฟล์ portable exe)*

### 2. Automated Pipeline (ระบบอัตโนมัติผ่าน GitHub Actions)
โปรเจกต์นี้ได้รับการกำหนดค่า CI/CD Pipeline ไว้สมบูรณ์แล้ว ระบบจะทำการ Build และ Publish Release ขึ้น GitHub โดยอัตโนมัติเมื่อมีการ push Tag ใหม่

1.  **Commit การเปลี่ยนแปลง (Version Control):**
    ```bash
    git add .
    git commit -m "feat: คำอธิบายการเปลี่ยนแปลง"
    git push origin main
    ```

2.  **Trigger Release Pipeline (สร้าง Tag ใหม่):**
    ```bash
    # เปลี่ยน v0.6.9 เป็นเลขเวอร์ชันที่คุณต้องการ
    git tag v0.6.9
    git push origin main --tags
    ```

3.  **Monitoring & Validation:**
    *   ไปที่แท็บ **Actions** ใน GitHub Repository เพื่อดูสถานะการทำงานของ Pipeline
    *   เมื่อเสร็จสมบูรณ์ เวอร์ชันใหม่จะปรากฏในหน้า **Releases** ในสถานะ "Latest Release"
    *   ระบบ **Auto-Update** ของแอปพลิเคชันจะตรวจพบเวอร์ชันใหม่นี้ทันที

---

## 🏗️ System Architecture (โครงสร้างระบบ)

*   **Frontend (User Interface):** React + TypeScript + Vite (`src/`)
*   **Backend (Core Process):** Electron Main Process (`electron/`)
*   **Artifacts (Build Output):** `dist-electron-vite/`

### System Overview Diagram

```mermaid
graph TD
    subgraph "Local Environment (User Machine)"
        User[User / ผู้ใช้งาน] -->|Interacts with| UI[Frontend UI (React + Vite)]
        UI -->|IPC Calls| Main[Electron Main Process (Node.js)]
        Main -->|Reads/Writes| DB[(SQLite Database)]
        Main -->|Accesses| Files[Local File System / USB Storage]
    end

    subgraph "CI/CD & Updates (GitHub)"
        Dev[Developer] -->|Push Tag| GH[GitHub Repository]
        GH -->|Triggers| Actions[GitHub Actions (CI/CD Pipeline)]
        Actions -->|Builds & Publishes| Release[GitHub Releases (Artifacts)]
        Release -.->|Auto-Update Check| Main
    end

    style UI fill:#61dafb,stroke:#20232a,stroke-width:2px
    style Main fill:#9feaf9,stroke:#20232a,stroke-width:2px
    style DB fill:#f29111,stroke:#20232a,stroke-width:2px
    style Actions fill:#2088ff,stroke:#20232a,stroke-width:2px
```

---

# React + TypeScript + Vite (Original Template Reference)

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
