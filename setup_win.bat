@echo off
setlocal
cd /d "%~dp0"

echo ==============================================
echo  Babi Portal - USB Setup Script (Windows)
echo ==============================================

REM Check for portable node
if exist "bin\win\node.exe" (
    set "PATH=%~dp0bin\win;%PATH%"
    echo [OK] Found portable Node.js.
) else (
    echo [ERROR] bin\win\node.exe not found!
    echo Please download Node.js Windows Binary (.zip) and extract it to bin/win first.
    pause
    exit /b 1
)

echo.
echo Installing dependencies...
cd app
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm install failed.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo Building application...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ==============================================
echo  Setup Complete! 
echo  You can now run start.bat or start_win.bat
echo ==============================================
pause
