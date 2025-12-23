#!/bin/bash
# Combined Deploy Script for Babi Portal
# Handles both building the release and optionally copying to USB
# Usage: ./deploy.sh [USB_PATH]

# Exit on error
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   Babi Portal - Deploy Script${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# ------------------------------------------------------------------
# PART 1: BUILD
# ------------------------------------------------------------------

echo -e "${BLUE}🚀 [Phase 1] Starting optimized portable build...${NC}"
echo "---------------------------------------"

# Check if we are in the project root
if [ ! -d "app" ]; then
    echo -e "${RED}❌ Error: Please run this script from the project root directory (where 'app' folder is).${NC}"
    exit 1
fi

# Clean previous release
if [ -d "release" ]; then
    echo "🧹 Cleaning previous release..."
    rm -rf release
fi

# 1. Build the Application
echo "📦 Building Next.js application (this may take a minute)..."
cd app
npm install
npm run build

# 2. Prepare Release Directory
echo "📂 Preparing release folder structure..."
cd ..
mkdir -p release/app/public
mkdir -p release/app/.next/static
mkdir -p release/data

# 3. Copy Standalone Files
echo "Vk Copying standalone server files..."
cp -R app/.next/standalone/* release/app/

# 4. Copy Static Assets (REQUIRED for standalone)
echo "🖼️  Copying static assets..."
cp -R app/.next/static/* release/app/.next/static/
cp -R app/public/* release/app/public/

# 5. Copy Startup Scripts
echo "Vk Copying startup scripts..."
cp start.sh release/
cp start.bat release/
# Create helper to run the node server directly
echo "node app/server.js" > release/run_portable.bat
echo -e "#!/bin/bash\nnode app/server.js" > release/run_portable.sh
chmod +x release/run_portable.sh

echo "---------------------------------------"
echo -e "${GREEN}✅ Build Complete!${NC}"
echo "---------------------------------------"

# ------------------------------------------------------------------
# PART 2: COPY TO USB (OPTIONAL)
# ------------------------------------------------------------------

USB_PATH="$1"

if [ -z "$USB_PATH" ]; then
    echo -e "${YELLOW}No USB path provided. Skipping copy step.${NC}"
    echo ""
    echo "To copy to USB automatically next time, run:"
    echo "  ./deploy.sh /Volumes/YourUSBName"
    echo ""
    echo "👉 The build is available in the 'release' folder."
    exit 0
fi

# Check if USB path exists
if [ ! -d "$USB_PATH" ]; then
    echo -e "${RED}Error: USB path does not exist: $USB_PATH${NC}"
    echo ""
    echo "Available volumes:"
    ls -1 /Volumes/ 2>/dev/null || echo "Could not list volumes"
    exit 1
fi

echo ""
echo -e "${BLUE}🚀 [Phase 2] Copying to USB...${NC}"
echo "---------------------------------------"
echo -e "Destination: ${GREEN}$USB_PATH${NC}"
echo ""

# Confirm before copying
echo -e "${YELLOW}This will copy the following to USB:${NC}"
echo "  - start_mac.sh (startup script)"
echo "  - start_win.bat (Windows startup)"
echo "  - bin/mac/ (Portable Node.js for Mac)"
echo "  - bin/win/ (Portable Node.js for Windows)"
echo "  - app/ (from release/app - standalone build)"
echo "  - data/ (SQLite database)"
echo "  - uploads/ (ebook files)"
echo ""
read -p "Continue? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Cancelled copy.${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}Starting copy...${NC}"

# 1. Copy startup scripts
echo -e "${GREEN}[1/7]${NC} Copying startup scripts..."
cp -v "$SCRIPT_DIR/start_mac.sh" "$USB_PATH/"
cp -v "$SCRIPT_DIR/start_win.bat" "$USB_PATH/" 2>/dev/null || echo "  (start_win.bat not found, skipping)"
chmod +x "$USB_PATH/start_mac.sh"

# 2. Copy bin/mac (Portable Node.js for Mac)
echo -e "${GREEN}[2/7]${NC} Copying Portable Node.js for Mac..."
if [ -d "$SCRIPT_DIR/bin/mac" ]; then
    mkdir -p "$USB_PATH/bin"
    rsync -av --progress "$SCRIPT_DIR/bin/mac" "$USB_PATH/bin/"
else
    echo -e "  ${YELLOW}Warning: bin/mac not found, skipping${NC}"
fi

# 3. Copy bin/win (Portable Node.js for Windows)
echo -e "${GREEN}[3/7]${NC} Copying Portable Node.js for Windows..."
if [ -d "$SCRIPT_DIR/bin/win" ]; then
    mkdir -p "$USB_PATH/bin"
    rsync -av --progress "$SCRIPT_DIR/bin/win" "$USB_PATH/bin/"
else
    echo -e "  ${YELLOW}Warning: bin/win not found, skipping${NC}"
fi

# 4. Copy app from release (standalone build)
echo -e "${GREEN}[4/7]${NC} Copying standalone app (this may take a while)..."
mkdir -p "$USB_PATH/app"
rsync -av --progress --delete "$SCRIPT_DIR/release/app/" "$USB_PATH/app/"

# 5. Copy data (SQLite database)
echo -e "${GREEN}[5/7]${NC} Copying database..."
if [ -d "$SCRIPT_DIR/data" ]; then
    mkdir -p "$USB_PATH/data"
    rsync -av --progress "$SCRIPT_DIR/data/" "$USB_PATH/data/"
else
    echo -e "  ${YELLOW}Warning: data/ not found, creating empty directory${NC}"
    mkdir -p "$USB_PATH/data"
fi

# 6. Copy uploads (ebook files)
echo -e "${GREEN}[6/7]${NC} Copying ebook files (this may take a while)..."
if [ -d "$SCRIPT_DIR/uploads" ]; then
    mkdir -p "$USB_PATH/uploads"
    rsync -av --progress "$SCRIPT_DIR/uploads/" "$USB_PATH/uploads/"
else
    echo -e "  ${YELLOW}Warning: uploads/ not found, creating empty directory${NC}"
    mkdir -p "$USB_PATH/uploads"
fi

# 7. Verify
echo -e "${GREEN}[7/7]${NC} Verifying..."
echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${GREEN}   Deploy Complete!${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo "USB Contents:"
ls -lah "$USB_PATH/"
echo ""
echo -e "${GREEN}To run on Mac:${NC}"
echo "  1. Open Terminal"
echo "  2. cd $USB_PATH"
echo "  3. ./start_mac.sh"
echo ""
