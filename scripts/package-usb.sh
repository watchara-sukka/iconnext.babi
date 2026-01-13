#!/bin/bash
set -e

# Define paths
DIST_USB="dist-usb"
SOURCE_DATA="data"
SOURCE_UPLOADS="uploads"
ZIP_NAME="iconnext-usb.zip"

echo "Packaging USB deployment..."

# Ensure dist-usb exists
if [ ! -d "$DIST_USB" ]; then
    echo "Error: $DIST_USB directory not found. Please run the build process first."
    exit 1
fi

# Copy data directory
if [ -d "$SOURCE_DATA" ]; then
    echo "Copying data..."
    cp -r "$SOURCE_DATA" "$DIST_USB/"
else
    echo "Warning: Source data directory not found."
fi

# Copy uploads directory
if [ -d "$SOURCE_UPLOADS" ]; then
    echo "Copying uploads..."
    cp -r "$SOURCE_UPLOADS" "$DIST_USB/"
else
    echo "Warning: Source uploads directory not found."
fi

# Create Zip
echo "Creating $ZIP_NAME..."
# cd into dist-usb so the zip root doesn't contain 'dist-usb' folder itself, but its contents
cd "$DIST_USB"
zip -r "$ZIP_NAME" . -x "*.DS_Store"

echo "Package created at $DIST_USB/$ZIP_NAME"
echo "Done."
