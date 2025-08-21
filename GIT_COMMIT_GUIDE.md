# Git Commands to Commit Your Buffer Killer App

## First Time Setup (if not already done):
```bash
git init
git add .
git commit -m "Initial commit: Buffer Killer v0.9.0 Beta - Working social media scheduler"
```

## If Already Initialized:
```bash
git add .
git commit -m "feat: Major fixes and improvements - Session 10

- Added 5 missing API methods (addAccount, removeAccount, postNow, etc.)
- Fixed IPC handlers in main process
- Fixed UI element selectors in test suite
- Created comprehensive testing framework
- Added database fix utilities
- Improved OAuth flow debugging
- Fixed workspace system integration
- Added quick fix scripts for common issues

Working:
- Core Electron app structure
- OAuth authentication flow
- Mastodon integration (90% complete)
- Database system with SQLite
- Post scheduling system
- Draft management
- CSV import/export
- Media upload support
- Testing framework

Known issues:
- Account persistence after OAuth needs work
- Some UI components missing
- Workspace linking inconsistent

Next: Fix account persistence and test real posting"
```

## Create GitHub Repository:
```bash
# Create repo on GitHub first, then:
git remote add origin https://github.com/YOUR_USERNAME/buffer-killer-app.git
git branch -M main
git push -u origin main
```

## Useful Git Commands:
```bash
# Check status
git status

# See what changed
git diff

# Create a branch for new features
git checkout -b feature/fix-account-persistence

# Tag this version
git tag -a v0.9.0-beta -m "Beta release with core functionality"
git push origin v0.9.0-beta
```

## Commit Message Template for Future Commits:
```
type: Short description

- What was changed
- Why it was changed
- Any breaking changes

Fixes: #issue_number (if applicable)
```

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Formatting
- refactor: Code restructuring
- test: Testing
- chore: Maintenance
