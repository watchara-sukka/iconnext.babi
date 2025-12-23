@echo off
echo Starting Portable Library...

REM Check for local node runtime
if exist "..\node_runtime\node.exe" (
    set "PATH=%~dp0..\node_runtime;%PATH%"
    echo Using local Node.js runtime.
) else (
    echo Using system Node.js runtime.
)

echo Starting server...
cd app
start http://localhost:3000
npm start
pause
