#!/bin/bash
echo "Starting Portable Library..."

# Check for local node runtime
if [ -f "../node_runtime/node" ]; then
    export PATH="$(pwd)/../node_runtime:$PATH"
    echo "Using local Node.js runtime."
else
    echo "Using system Node.js runtime."
fi

echo "Starting server..."
cd app
xdg-open http://localhost:3000 || open http://localhost:3000
npm start
