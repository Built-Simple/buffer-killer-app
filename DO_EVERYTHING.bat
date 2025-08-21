@echo off
cls
echo ================================================
echo     BUFFER KILLER - ONE CLICK COMMIT & CLEAN
echo ================================================
echo.
echo This will:
echo   1. Show current status
echo   2. Commit all changes
echo   3. Clean up project
echo   4. Show final result
echo.
pause

echo.
echo STEP 1: Current Status
echo ----------------------
git status --short | find /c /v ""
echo files changed
echo.

echo STEP 2: Committing Changes
echo --------------------------
git add .
git commit -m "feat: Session 10 - Testing framework, fixes, and documentation"

echo.
echo STEP 3: Cleaning Up Project
echo ---------------------------
echo Creating directories...
if not exist docs mkdir docs
if not exist docs\sessions mkdir docs\sessions
if not exist docs\setup mkdir docs\setup
if not exist archive mkdir archive
if not exist archive\test-files mkdir archive\test-files

echo Moving files...
move test-*.* archive\test-files\ >nul 2>&1
move SESSION_*.md docs\sessions\ >nul 2>&1
move MASTODON_*.md docs\setup\ >nul 2>&1
move *-diagnostic.js archive\test-files\ >nul 2>&1
move fix-*.js archive\test-files\ >nul 2>&1
del package-minimal.json >nul 2>&1
del commit.ps1 >nul 2>&1

echo.
echo STEP 4: Final Commit
echo --------------------
git add .
git commit -m "chore: Organize project structure - move tests and docs"

echo.
echo ================================================
echo                  ALL DONE!
echo ================================================
echo.
git log --oneline -3
echo.
echo Your project is now:
echo   - Committed (all changes saved)
echo   - Organized (files cleaned up)
echo   - Ready for GitHub
echo.
echo Next: Push to GitHub
echo   git push origin main
echo.
pause
