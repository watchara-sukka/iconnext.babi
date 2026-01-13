import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'chrome114', // ตรงกับเวอร์ชัน Chrome ใน Electron 25+ ช่วยลด Polyfills
    cssCodeSplit: true,
    assetsInlineLimit: 4096, // Inline เล็กๆ เพื่อลดจำนวน Request
    chunkSizeWarningLimit: 1000,
    reportCompressedSize: false, // เร่งสปีดตอน Build
    rollupOptions: {
      output: {
        manualChunks: {
          'pdf-vendor': ['pdfjs-dist'],
          'react-core': ['react', 'react-dom'],
          'ui-icons': ['lucide-react'],
        }
      }
    }
  }
})
