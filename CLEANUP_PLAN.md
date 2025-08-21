# 🧹 BUFFER KILLER - CLEANUP PLAN

## Current State: Too Many Files!
We have **85+ files** in the root directory. Most are debug scripts, test files, and session notes.

## 🗑️ Files to DELETE (Not Needed):

### Debug/Test Scripts (can delete):
- diagnose.js
- fix-mastodon-oauth.js
- mastodon-oauth-diagnostic.js
- quick-test.js
- test-mastodon-exchange.js
- test-mastodon-flow.js
- test-mastodon-oauth.js
- test-node.js
- test-oauth-flow.js
- test-oauth-server.js
- test-oauth.html
- test-twitter-auth.js
- test-video.html
- test.js
- start-oauth-server.js
- main-oauth-patch.js
- main-simple.js
- check-setup.js
- init-db.js

### Session Notes (archive or delete):
- SESSION_2_COMPLETE.md
- SESSION_3_ANALYTICS_COMPLETE.md
- SESSION_6_SUMMARY.md
- SESSION_9_HANDOFF.md
- SESSION_9_SUMMARY.md
- NEXT_SESSION_PROMPT.md
- AI_DEVELOPMENT_PROMPT.md

### Setup Guides (can consolidate):
- MASTODON_CONNECTED.md
- MASTODON_DEBUG_GUIDE.md
- MASTODON_OAUTH_FIX.md
- MASTODON_SETUP.md
- MASTODON_SUCCESS.md
- TWITTER_SETUP.md
- GITHUB_SETUP.md
- SETUP_AND_TEST.md
- MARKETING.md

### Duplicate Files:
- package-minimal.json (not needed)
- commit.ps1 (broken)
- commit.sh (not for Windows)
- FIX_PLAN.md
- FIXES_APPLIED.md
- READY_TO_COMMIT.md

## ✅ Files to KEEP:

### Core App Files:
- main.js
- preload.js
- renderer.js
- index.html
- package.json
- package-lock.json

### Documentation:
- README.md
- CHANGELOG.md
- LICENSE
- CONTRIBUTORS.md
- VERSION.json

### Directories (keep):
- lib/ (platform code)
- src/ (database, drafts)
- components/ (UI components)
- assets/ (icons, images)
- test/ (organized tests)
- node_modules/ (dependencies)
- .git/ (version control)

### Config:
- .gitignore
- .env.example

### Helper Scripts:
- quick-commit.bat (for committing)
- start.bat (for starting app)

## 📁 Suggested Structure:

```
buffer-killer-app/
├── main.js
├── preload.js
├── renderer.js
├── index.html
├── package.json
├── README.md
├── LICENSE
├── .gitignore
├── .env.example
├── lib/           # Platform integrations
├── src/           # Core app code
├── components/    # UI components
├── assets/        # Images, icons
├── test/          # Test suite
├── docs/          # Move all MD files here
│   ├── sessions/  # Session notes
│   └── setup/     # Setup guides
└── scripts/       # Helper scripts
    ├── commit.bat
    └── start.bat
```

## 🎯 Cleanup Commands:

```bash
# 1. First, commit current state
git add .
git commit -m "chore: Pre-cleanup commit - saving all work"

# 2. Create archive directory
mkdir archive\old-files

# 3. Move test files
move test-*.* archive\old-files\
move diagnose.js archive\old-files\
move fix-*.js archive\old-files\
move *-diagnostic.js archive\old-files\

# 4. Move session notes
mkdir docs\sessions
move SESSION_*.md docs\sessions\

# 5. Move setup guides  
mkdir docs\setup
move MASTODON_*.md docs\setup\
move TWITTER_*.md docs\setup\
move GITHUB_*.md docs\setup\

# 6. Delete truly unnecessary files
del package-minimal.json
del commit.ps1
del commit.sh
del main-simple.js
del main-oauth-patch.js

# 7. Commit cleanup
git add .
git commit -m "chore: Clean up project structure - remove test files and organize docs"
```

## 💡 After Cleanup:

Your project will be:
- **50% smaller** (file count)
- **Better organized**
- **Easier to navigate**
- **Professional structure**
- **Ready for GitHub**

## ⚠️ Before Deleting:

Make sure to:
1. **Commit current state first**
2. **Keep backups if unsure**
3. **Test app still works after cleanup**
