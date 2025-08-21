@echo off
cls
echo ========================================
echo     BUFFER KILLER - QUICK COMMIT
echo ========================================
echo.

REM Initialize if needed
if not exist .git (
    echo Initializing Git...
    git init
)

REM Add everything
echo Adding all files...
git add .

echo.
echo Creating commit...
git commit -m "feat: Buffer Killer v0.9.0-beta - Working social media scheduler with testing framework"

echo.
echo DONE! Your code is committed.
echo.
echo Next steps:
echo 1. Create repo on GitHub
echo 2. git remote add origin [YOUR_REPO_URL]
echo 3. git push -u origin main
echo.
pause
