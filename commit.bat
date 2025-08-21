@echo off
echo ========================================
echo Buffer Killer - Git Commit Helper
echo ========================================
echo.

REM Check if git is installed
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Git is not installed!
    echo Please install Git from https://git-scm.com/
    pause
    exit /b 1
)

REM Check if in correct directory
if not exist package.json (
    echo ERROR: Not in Buffer Killer directory!
    echo Please run this from C:\buffer-killer-app\
    pause
    exit /b 1
)

REM Initialize git if needed
if not exist .git (
    echo Initializing Git repository...
    git init
    echo Git initialized!
) else (
    echo Git repository exists
)

echo.
echo Current Status:
git status --short

echo.
echo Adding all files...
git add .

echo.
echo Creating commit...
git commit -m "feat: Major improvements and testing framework - Session 10 | Added testing framework, fixed API methods, fixed UI selectors, database utilities | 75%% tests passing"

if %errorlevel% equ 0 (
    echo.
    echo SUCCESS! Commit created.
    echo.
    git log -1 --oneline
    echo.
    echo Next steps:
    echo 1. Create a GitHub repository
    echo 2. Run: git remote add origin YOUR_REPO_URL
    echo 3. Run: git push -u origin main
    echo.
    echo To tag this version:
    echo git tag -a v0.9.0-beta -m "Beta release"
) else (
    echo.
    echo WARNING: Commit may have failed. Check errors above.
)

echo.
pause
