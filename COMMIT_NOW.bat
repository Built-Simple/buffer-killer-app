@echo off
cls
echo ============================================
echo    BUFFER KILLER - COMMIT YOUR CHANGES
echo ============================================
echo.

REM Check for git
where git >nul 2>&1
if errorlevel 1 (
    echo ERROR: Git not installed!
    pause
    exit /b
)

echo Checking repository status...
git status --short
echo.

echo You already have commits in this repo!
git log --oneline -3
echo.

echo ============================================
echo Adding all changes...
git add .

echo.
echo Creating new commit...
git commit -m "feat: Session 10 - Testing framework and fixes

- Added comprehensive testing framework
- Fixed 5 missing API methods
- Fixed UI selectors
- Database repair utilities
- 75%% tests passing

Known issue: Account data not saving after OAuth"

if errorlevel 0 (
    echo.
    echo ============================================
    echo         COMMIT SUCCESSFUL!
    echo ============================================
    echo.
    echo Latest commits:
    git log --oneline -3
    echo.
    echo TO PUSH TO GITHUB:
    echo ------------------
    echo 1. Create repo on GitHub if not done
    echo 2. git remote add origin [URL] (if needed)
    echo 3. git push origin main
    echo.
    echo TO CLEAN UP PROJECT:
    echo --------------------
    echo Run: cleanup.bat
    echo.
)

pause
