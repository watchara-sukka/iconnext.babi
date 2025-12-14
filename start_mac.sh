#!/bin/bash
cd "$(dirname "$0")"

echo "Starting Babi Portal..."

# Check for portable node
if [ -f "bin/mac/node" ]; then
    export PATH="$(pwd)/bin/mac:$PATH"
    echo "Using portable Node.js."
else
    echo "Portable Node.js not found. Using system Node.js."
fi

# Open Browser
open http://localhost:3000 || xdg-open http://localhost:3000

# Run App
if [ -f "app/server.js" ]; then
    node app/server.js
else
    echo "Standalone build not found. Trying npm start..."
    cd app
    npm start
fi
