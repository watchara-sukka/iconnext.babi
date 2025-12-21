#!/bin/bash
# ==============================================================================
# download_node_runtime.sh
# ==============================================================================
# ดาวน์โหลด Node.js Runtime สำหรับ Windows และ macOS
# เพื่อใช้งานกับ USB Portable
#
# วิธีใช้:
#   chmod +x download_node_runtime.sh
#   ./download_node_runtime.sh
#
# หมายเหตุ:
#   - ต้องรันบนเครื่องที่มี curl และ tar
#   - จะดาวน์โหลด Node.js v20.x LTS
# ==============================================================================

set -e

# Node.js Version (LTS)
NODE_VERSION="v20.10.0"

# URLs
WIN_URL="https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-win-x64.zip"
MAC_URL="https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-darwin-x64.tar.gz"

# Directories
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BIN_DIR="${SCRIPT_DIR}/bin"
WIN_DIR="${BIN_DIR}/win"
MAC_DIR="${BIN_DIR}/mac"
TEMP_DIR="${SCRIPT_DIR}/.temp_node_download"

echo "=============================================="
echo "  📦 Node.js Runtime Downloader"
echo "  Version: ${NODE_VERSION}"
echo "=============================================="
echo ""

# Create directories
mkdir -p "${WIN_DIR}" "${MAC_DIR}" "${TEMP_DIR}"

# ==============================================================================
# Download Windows Node.js
# ==============================================================================
echo "🪟 กำลังดาวน์โหลด Node.js สำหรับ Windows..."
WIN_ZIP="${TEMP_DIR}/node-win.zip"

if [ -f "${WIN_DIR}/node.exe" ]; then
    echo "   ⏭️  พบ node.exe อยู่แล้ว ข้ามขั้นตอนนี้"
else
    curl -L -o "${WIN_ZIP}" "${WIN_URL}"
    echo "   📂 กำลังแตกไฟล์..."
    
    # Check if unzip is available
    if command -v unzip &> /dev/null; then
        unzip -q "${WIN_ZIP}" -d "${TEMP_DIR}"
    else
        echo "   ⚠️  ไม่พบ unzip, ใช้ Python แทน..."
        python3 -c "import zipfile; zipfile.ZipFile('${WIN_ZIP}').extractall('${TEMP_DIR}')"
    fi
    
    # Move files to bin/win
    cp -r "${TEMP_DIR}/node-${NODE_VERSION}-win-x64/"* "${WIN_DIR}/"
    echo "   ✅ Windows: เสร็จสิ้น"
fi

# ==============================================================================
# Download macOS Node.js
# ==============================================================================
echo ""
echo "🍎 กำลังดาวน์โหลด Node.js สำหรับ macOS..."
MAC_TAR="${TEMP_DIR}/node-mac.tar.gz"

if [ -f "${MAC_DIR}/bin/node" ]; then
    echo "   ⏭️  พบ node อยู่แล้ว ข้ามขั้นตอนนี้"
else
    curl -L -o "${MAC_TAR}" "${MAC_URL}"
    echo "   📂 กำลังแตกไฟล์..."
    tar -xzf "${MAC_TAR}" -C "${TEMP_DIR}"
    
    # Move files to bin/mac
    cp -r "${TEMP_DIR}/node-${NODE_VERSION}-darwin-x64/"* "${MAC_DIR}/"
    echo "   ✅ macOS: เสร็จสิ้น"
fi

# ==============================================================================
# Cleanup
# ==============================================================================
echo ""
echo "🧹 กำลังลบไฟล์ชั่วคราว..."
rm -rf "${TEMP_DIR}"

# ==============================================================================
# Summary
# ==============================================================================
echo ""
echo "=============================================="
echo "  ✅ ดาวน์โหลดเสร็จสิ้น!"
echo "=============================================="
echo ""
echo "โครงสร้างไฟล์:"
echo "  bin/"
echo "  ├── win/"
if [ -f "${WIN_DIR}/node.exe" ]; then
    echo "  │   ├── node.exe ✅"
    echo "  │   ├── npm.cmd"
    echo "  │   └── ..."
else
    echo "  │   └── (ไม่พบ node.exe ❌)"
fi
echo "  └── mac/"
if [ -f "${MAC_DIR}/bin/node" ]; then
    echo "      ├── bin/node ✅"
    echo "      ├── bin/npm"
    echo "      └── ..."
else
    echo "      └── (ไม่พบ node ❌)"
fi
echo ""
echo "พร้อมใช้งาน! 🎉"
