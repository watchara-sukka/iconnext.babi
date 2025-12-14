@echo off
setlocal
cd /d "%~dp0"

echo Starting Babi Portal...

REM Check for portable node
if exist "bin\win\node.exe" (
    set "PATH=%~dp0bin\win;%PATH%"
    echo Using portable Node.js.
) else (
    echo Portable Node.js not found. Using system Node.js.
)

REM Open Browser
start http://localhost:3000

REM Run App
if exist "app\server.js" (
    node app\server.js
) else (
    echo Standalone build not found. Trying npm start...
    cd app
    npm start
)

pause
