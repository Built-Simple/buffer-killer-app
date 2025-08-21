@echo off
echo =====================================
echo   BUFFER KILLER - DEPENDENCY INSTALLER
echo =====================================
echo.
echo Installing all required dependencies...
echo This may take a few minutes.
echo.

REM Navigate to the app directory
cd /d C:\buffer-killer-app

REM Install all dependencies
echo [1/3] Installing core dependencies...
call npm install

REM Install any missing packages explicitly
echo.
echo [2/3] Ensuring all packages are installed...
call npm install googleapis oauth pkce-challenge crypto-js

REM Install electron-builder for building the app
echo.
echo [3/3] Installing build tools...
call npm install --save-dev electron-builder

echo.
echo =====================================
echo   INSTALLATION COMPLETE!
echo =====================================
echo.
echo All dependencies have been installed.
echo.
echo You can now:
echo   1. Run the app: npm start
echo   2. Test platforms: npm test
echo   3. Quick test: npm run test:quick
echo.
pause