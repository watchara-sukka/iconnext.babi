@echo off
setlocal
cd /d "%~dp0"

echo ==============================================
echo  Babi Portal - Deploy Script (Windows)
echo ==============================================

REM ------------------------------------------------------------------
REM PART 1: BUILD
REM ------------------------------------------------------------------

echo.
echo [Phase 1] Starting optimized portable build...
echo ---------------------------------------

REM Check if node exists locally or in path
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    if exist "bin\win\node.exe" (
        set "PATH=%~dp0bin\win;%PATH%"
        echo [OK] Using portable Node.js from bin\win
    ) else (
        echo [ERROR] Node.js not found! Please install Node.js or put it in bin\win.
        pause
        exit /b 1
    )
)

REM Clean previous release
if exist "release" (
    echo Cleaning previous release...
    rmdir /s /q "release"
)

REM 1. Build the Application
echo.
echo Building Next.js application...
cd app
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm install failed.
    pause
    exit /b %ERRORLEVEL%
)

call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed.
    pause
    exit /b %ERRORLEVEL%
)
cd ..

REM 2. Prepare Release Directory
echo.
echo Preparing release folder structure...
mkdir "release\app\public" 2>nul
mkdir "release\app\.next\static" 2>nul
mkdir "release\data" 2>nul

REM 3. Copy Standalone Files
echo Copying standalone server files...
xcopy /E /I /Y "app\.next\standalone\*" "release\app\" >nul

REM 4. Copy Static Assets
echo Copying static assets...
xcopy /E /I /Y "app\.next\static\*" "release\app\.next\static\" >nul
xcopy /E /I /Y "app\public\*" "release\app\public\" >nul

REM 5. Copy Startup Scripts
echo Copying startup scripts...
copy /Y "start.sh" "release\" >nul
copy /Y "start.bat" "release\" >nul
REM Create helper to run portable
echo node app\server.js > "release\run_portable.bat"

echo ---------------------------------------
echo [SUCCESS] Build Complete!
echo ---------------------------------------

REM ------------------------------------------------------------------
REM PART 2: COPY TO USB (OPTIONAL)
REM ------------------------------------------------------------------

set "USB_PATH=%~1"

if "%USB_PATH%"=="" (
    echo [INFO] No USB path provided. Skipping copy step.
    echo.
    echo To copy to USB automatically next time, run:
    echo   deploy.bat E:\
    echo.
    echo The build is available in the 'release' folder.
    goto :END
)

REM Check if USB path exists
if not exist "%USB_PATH%" (
    echo [ERROR] USB path does not exist: %USB_PATH%
    pause
    exit /b 1
)

echo.
echo [Phase 2] Copying to USB...
echo ---------------------------------------
echo Destination: %USB_PATH%
echo.

echo This will copy files to your USB drive.
set /p CONTINUE="Continue? (Y/N): "
if /I "%CONTINUE%" NEQ "Y" (
    echo Cancelled copy.
    goto :END
)

echo.
echo Starting copy (Robust File Copy)...

REM Robocopy options: /E (recursive), /XO (exclude older), /NP (no progress), /NDL (no dir list), /NFL (no file list)
REM We want to see some progress, but maybe not spam.
REM For App: Mirror (/MIR) to delete clean.
REM For Data/Uploads: Update only (/E), do not delete.

echo [1/7] Copying startup scripts...
copy /Y "%~dp0start_mac.sh" "%USB_PATH%\" >nul
copy /Y "%~dp0start_win.bat" "%USB_PATH%\" >nul

echo [2/7] Copying Portable Node.js (Mac)...
if exist "bin\mac" (
    robocopy "bin\mac" "%USB_PATH%\bin\mac" /E /NFL /NDL /NJH /NJS
)

echo [3/7] Copying Portable Node.js (Windows)...
if exist "bin\win" (
    robocopy "bin\win" "%USB_PATH%\bin\win" /E /NFL /NDL /NJH /NJS
)

echo [4/7] Copying Standalone App (Mirroring)...
REM /MIR = /E + /PURGE (Delete dest files that no longer exist in source)
mkdir "%USB_PATH%\app" 2>nul
robocopy "release\app" "%USB_PATH%\app" /MIR /NFL /NDL /NJH /NJS

echo [5/7] Copying Database (Update only)...
mkdir "%USB_PATH%\data" 2>nul
robocopy "data" "%USB_PATH%\data" /E /XO /NFL /NDL /NJH /NJS

echo [6/7] Copying E-books (Update only)...
mkdir "%USB_PATH%\uploads" 2>nul
robocopy "uploads" "%USB_PATH%\uploads" /E /XO /NFL /NDL /NJH /NJS

echo [7/7] Verifying...
echo.
echo ==============================================
echo  Deploy Complete!
echo ==============================================
echo.
echo To run on Windows:
echo   1. Open USB Drive
echo   2. Double click start_win.bat
echo.

:END
pause
