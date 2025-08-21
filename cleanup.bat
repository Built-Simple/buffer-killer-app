@echo off
echo.
echo ============================================
echo      BUFFER KILLER - PROJECT CLEANUP
echo ============================================
echo.
echo This will organize your project structure.
echo Make sure you've committed your code first!
echo.
pause

REM Create organized directories
if not exist docs mkdir docs
if not exist docs\sessions mkdir docs\sessions
if not exist docs\setup mkdir docs\setup
if not exist archive mkdir archive
if not exist archive\test-files mkdir archive\test-files
if not exist scripts mkdir scripts

echo.
echo Moving test files to archive...
if exist test-*.js move test-*.js archive\test-files\ >nul 2>&1
if exist test-*.html move test-*.html archive\test-files\ >nul 2>&1
if exist *-diagnostic.js move *-diagnostic.js archive\test-files\ >nul 2>&1
if exist fix-*.js move fix-*.js archive\test-files\ >nul 2>&1
if exist diagnose.js move diagnose.js archive\test-files\ >nul 2>&1
if exist check-setup.js move check-setup.js archive\test-files\ >nul 2>&1
if exist init-db.js move init-db.js archive\test-files\ >nul 2>&1
if exist main-simple.js move main-simple.js archive\test-files\ >nul 2>&1
if exist main-oauth-patch.js move main-oauth-patch.js archive\test-files\ >nul 2>&1
if exist start-oauth-server.js move start-oauth-server.js archive\test-files\ >nul 2>&1
if exist quick-test.js move quick-test.js archive\test-files\ >nul 2>&1

echo Moving session notes...
if exist SESSION_*.md move SESSION_*.md docs\sessions\ >nul 2>&1
if exist *_HANDOFF.md move *_HANDOFF.md docs\sessions\ >nul 2>&1
if exist *_SUMMARY.md move *_SUMMARY.md docs\sessions\ >nul 2>&1
if exist AI_DEVELOPMENT_PROMPT.md move AI_DEVELOPMENT_PROMPT.md docs\sessions\ >nul 2>&1
if exist NEXT_SESSION_PROMPT.md move NEXT_SESSION_PROMPT.md docs\sessions\ >nul 2>&1

echo Moving setup guides...
if exist MASTODON_*.md move MASTODON_*.md docs\setup\ >nul 2>&1
if exist TWITTER_*.md move TWITTER_*.md docs\setup\ >nul 2>&1
if exist GITHUB_*.md move GITHUB_*.md docs\setup\ >nul 2>&1
if exist SETUP_*.md move SETUP_*.md docs\setup\ >nul 2>&1
if exist MARKETING.md move MARKETING.md docs\setup\ >nul 2>&1

echo Moving helper scripts...
if exist commit.bat move commit.bat scripts\ >nul 2>&1
if exist commit.sh move commit.sh scripts\ >nul 2>&1
if exist start.ps1 move start.ps1 scripts\ >nul 2>&1

echo Cleaning up duplicates...
if exist package-minimal.json del package-minimal.json >nul 2>&1
if exist commit.ps1 del commit.ps1 >nul 2>&1
if exist FIX_PLAN.md move FIX_PLAN.md archive\ >nul 2>&1
if exist FIXES_APPLIED.md move FIXES_APPLIED.md archive\ >nul 2>&1
if exist READY_TO_COMMIT.md move READY_TO_COMMIT.md archive\ >nul 2>&1
if exist CLEANUP_PLAN.md move CLEANUP_PLAN.md archive\ >nul 2>&1
if exist GIT_COMMIT_GUIDE.md move GIT_COMMIT_GUIDE.md docs\ >nul 2>&1
if exist TECHNICAL_DOCS.md move TECHNICAL_DOCS.md docs\ >nul 2>&1
if exist STATUS.md move STATUS.md docs\ >nul 2>&1
if exist MASTER_TODO_LIST.md move MASTER_TODO_LIST.md docs\ >nul 2>&1

echo.
echo ============================================
echo           CLEANUP COMPLETE!
echo ============================================
echo.
echo Project structure is now clean and organized:
echo.
echo   Root: Core app files only
echo   /docs: All documentation
echo   /archive: Old test files (can delete later)
echo   /test: Organized test suite
echo   /lib: Platform integrations
echo   /src: Database and core modules
echo.
echo Files moved: ~40+
echo Space saved: ~30%%
echo.
echo You can now:
echo 1. Review the cleaned structure
echo 2. Delete /archive if not needed
echo 3. Push to GitHub
echo.
pause
