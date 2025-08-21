@echo off
cls
echo ============================================
echo      BUFFER KILLER - GIT STATUS CHECK
echo ============================================
echo.

echo Current branch:
git branch --show-current
echo.

echo Recent commits:
git log --oneline -5
echo.

echo ============================================
echo Files changed:
git status --short
echo.

echo ============================================
echo Repository info:
echo Remote: 
git remote -v
echo.

echo File count: 
dir /b /s /a-d | find /c /v ""
echo.

echo Project size:
dir /s | findstr "File(s)"
echo.

pause
