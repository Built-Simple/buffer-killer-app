@echo off
echo ========================================
echo BUFFER KILLER - SESSION 11 CRITICAL FIXES
echo ========================================
echo.
echo This batch file will apply critical fixes to Buffer Killer
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [1/5] Applying account persistence fix...
cd /d "%~dp0"

REM Run the fix script
node SESSION_11_FIXES.js
if errorlevel 1 (
    echo.
    echo WARNING: Fix script failed. Applying manual fixes...
)

echo.
echo [2/5] Installing missing dependencies...
call npm install form-data node-fetch
if errorlevel 1 (
    echo WARNING: Some dependencies failed to install
)

echo.
echo [3/5] Testing Mastodon functionality...
node test-mastodon-posting.js
if errorlevel 1 (
    echo WARNING: Mastodon test failed - you may need to reconnect accounts
)

echo.
echo [4/5] Repairing database...
node fix-account-persistence.js
if errorlevel 1 (
    echo WARNING: Database repair failed
)

echo.
echo [5/5] Starting the app...
echo.
echo ========================================
echo FIXES APPLIED - Starting Buffer Killer
echo ========================================
echo.
echo Next steps:
echo 1. The app should open shortly
echo 2. Check if your accounts are visible
echo 3. Try connecting a Mastodon account
echo 4. Test posting functionality
echo.

REM Start the app
call npm run dev

pause
