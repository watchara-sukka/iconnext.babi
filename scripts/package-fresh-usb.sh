#!/bin/bash
set -e

# Define paths
DIST_USB="dist-usb"
STAGING_DIR="dist-usb-fresh"
ZIP_NAME="iconnext-usb-patch.zip"
TEMPLATE_README="scripts/USB_README_TEMPLATE.md"
SOURCE_DB="data/babi.db"
SOURCE_UPLOADS="uploads"

# PATCH MODE: Set to true to skip data/uploads copy
PATCH_MODE=true

if [ "$PATCH_MODE" = true ]; then
    echo "Packaging USB Patch Deployment (Apps Only)..."
else
    echo "Packaging Seeded USB Deployment (Shared Data)..."
    ZIP_NAME="iconnext-usb-seeded.zip"
fi

# Ensure source builds exist
# Ensure source builds exist
# dist-electron is where the fresh build lives
DIST_ELECTRON="dist-electron-vite"

if [ ! -d "$DIST_ELECTRON/win-unpacked" ]; then
    echo "Error: $DIST_ELECTRON/win-unpacked not found. Please run the Windows build first."
    exit 1
fi

if [ ! -d "$DIST_ELECTRON/mac" ]; then
    echo "Error: $DIST_ELECTRON/mac not found. Please run the Mac build first."
    exit 1
fi

# Refresh dist-usb with fresh build
echo "Refreshing dist-usb with fresh build..."
rm -rf "$DIST_USB/Windows"
rm -rf "$DIST_USB/Mac"
mkdir -p "$DIST_USB/Windows"
mkdir -p "$DIST_USB/Mac"

cp -r "$DIST_ELECTRON/win-unpacked/"* "$DIST_USB/Windows/"
cp -r "$DIST_ELECTRON/mac/"* "$DIST_USB/Mac/"

# Clean previous staging
rm -rf "$STAGING_DIR"
mkdir -p "$STAGING_DIR"

echo "Creating staging structure..."

# 1. Create Shared Data & Uploads from Local Source
mkdir -p "$STAGING_DIR/data"
mkdir -p "$STAGING_DIR/uploads"

if [ "$PATCH_MODE" = true ]; then
    echo "Patch Mode: Skipping database and uploads copy."
    # Just create placeholders to ensure structure exists
    touch "$STAGING_DIR/data/.gitkeep"
    touch "$STAGING_DIR/uploads/.gitkeep"
else
    # Copy Database
    if [ -f "$SOURCE_DB" ]; then
        echo "Copying database from $SOURCE_DB..."
        cp "$SOURCE_DB" "$STAGING_DIR/data/babi.db"
    else
        echo "Warning: Source database $SOURCE_DB not found. Creating empty data folder."
        touch "$STAGING_DIR/data/.gitkeep"
    fi

    # Copy Uploads
    if [ -d "$SOURCE_UPLOADS" ]; then
        echo "Copying uploads from $SOURCE_UPLOADS..."
        cp -r "$SOURCE_UPLOADS/"* "$STAGING_DIR/uploads/"
    else
        echo "Warning: Source uploads directory $SOURCE_UPLOADS not found. Creating empty uploads folders."
        mkdir -p "$STAGING_DIR/uploads/books"
        mkdir -p "$STAGING_DIR/uploads/covers"
        touch "$STAGING_DIR/uploads/books/.gitkeep"
        touch "$STAGING_DIR/uploads/covers/.gitkeep"
    fi
fi

# 2. Copy Windows Build
echo "Copying Windows build..."
mkdir -p "$STAGING_DIR/Windows"
# Copy contents of Windows folder (cp works fine for Windows builds)
cp -r "$DIST_USB/Windows/"* "$STAGING_DIR/Windows/"

# Remove data/uploads from inside Windows app folder if they exist (cleanup)
rm -rf "$STAGING_DIR/Windows/data"
rm -rf "$STAGING_DIR/Windows/uploads"

# 3. Copy Mac Build (with symlink-safe method)
echo "Copying Mac build..."
mkdir -p "$STAGING_DIR/Mac"

# Mac .app bundles contain many symlinks in Frameworks
# Using rsync instead of cp to handle symlinks properly and prevent hanging
if command -v rsync &> /dev/null; then
    echo "Using rsync for safe Mac app copy (handles symlinks properly)..."
    # -a: archive mode
    # -L: dereference symlinks (copy actual files instead of links) - CRITICAL for USB portability
    # --info=progress2: shows overall progress
    rsync -aL --info=progress2 "$DIST_USB/Mac/" "$STAGING_DIR/Mac/"
    
    if [ $? -ne 0 ]; then
        echo "Warning: rsync failed, falling back to tar method..."
        rm -rf "$STAGING_DIR/Mac"
        mkdir -p "$STAGING_DIR/Mac"
        # Fallback: use tar to preserve symlinks
        tar -cf - -C "$DIST_USB/Mac" . | tar -xf - -C "$STAGING_DIR/Mac"
    fi
else
    echo "rsync not found, using tar method for safe symlink handling..."
    # Fallback: use tar with --dereference (-h) to preserve actual files instead of links
    tar -chf - -C "$DIST_USB/Mac" . | tar -xf - -C "$STAGING_DIR/Mac"
fi

# Remove data/uploads from inside Mac app folder if they exist
rm -rf "$STAGING_DIR/Mac/data"
rm -rf "$STAGING_DIR/Mac/uploads"

# 4. Create Launcher Scripts
echo "Creating launcher scripts..."

# START_WINDOWS.bat
cat > "$STAGING_DIR/START_WINDOWS.bat" <<EOF
@echo off
start "" "Windows\\Babi E-book Portal.exe"
EOF

# START_MAC.command
cat > "$STAGING_DIR/START_MAC.command" <<EOF
#!/bin/bash
DIR="\$( cd "\$( dirname "\${BASH_SOURCE[0]}" )" && pwd )"
open "\$DIR/Mac/Babi E-book Portal.app"
EOF

# Make Mac script executable
chmod +x "$STAGING_DIR/START_MAC.command"

# 5. Create Zip
echo "Zipping package (using fast compression)..."
cd "$STAGING_DIR"
zip -1 -r "../$ZIP_NAME" . -x "*.DS_Store"

echo "---------------------------------------------------"
echo "Seeded USB Package created: $ZIP_NAME"
echo "---------------------------------------------------"
