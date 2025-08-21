#!/bin/bash
# Simple commit script for Buffer Killer

echo "🚀 Buffer Killer - Quick Commit"
echo "================================"
echo ""

# Initialize git if needed
if [ ! -d ".git" ]; then
    echo "Initializing Git repository..."
    git init
fi

# Add all files
echo "Adding files..."
git add .

# Show what will be committed
echo ""
echo "Files to commit:"
git status --short

# Create commit
echo ""
echo "Creating commit..."
git commit -m "feat: Buffer Killer v0.9.0-beta - Working social media scheduler

- Complete Electron app with OAuth
- Testing framework (75% passing)
- Mastodon integration
- SQLite database
- Post scheduling
- Draft management
- CSV import/export

Known issue: Account data not saving after OAuth"

echo ""
echo "✅ Done! Now you can:"
echo "1. Create repo on GitHub"
echo "2. git remote add origin YOUR_REPO_URL"
echo "3. git push -u origin main"
