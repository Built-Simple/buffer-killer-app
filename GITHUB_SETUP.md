# GITHUB SETUP GUIDE

## 🐙 GitHub as Your Blog Backend!

Turn your GitHub repository into a blog/social media archive! Every post becomes a permanent, searchable, version-controlled piece of content.

## 🎯 Why GitHub for Social Posts?

### Benefits:
- **Version Control** - Every edit is tracked
- **Permanent Archive** - Your posts live forever
- **Free Hosting** - GitHub Pages can display them
- **Developer-Friendly** - Use git, markdown, issues
- **SEO Friendly** - Public repos are indexed by Google
- **Comments** - Issues support native commenting
- **API Access** - 5000 requests/hour authenticated

### Post Storage Options:
1. **Issues** (Default) - Great for discussions, supports comments
2. **Markdown Files** - Perfect for blog posts, can use with Jekyll/Hugo
3. **Gists** - Good for code snippets, standalone posts
4. **Discussions** - For community engagement (if enabled)

## 🚀 Quick Setup

### Step 1: Create GitHub OAuth App

1. Go to: https://github.com/settings/developers
2. Click **"New OAuth App"**
3. Fill in:
   - **Application name:** Buffer Killer
   - **Homepage URL:** http://localhost:3000
   - **Authorization callback URL:** `http://127.0.0.1:3000/auth/github/callback`
4. Click **"Register application"**
5. Copy your **Client ID**
6. Click **"Generate a new client secret"**
7. Copy your **Client Secret**

### Step 2: Add Credentials to .env

```env
GITHUB_CLIENT_ID=your_actual_client_id_here
GITHUB_CLIENT_SECRET=your_actual_client_secret_here
GITHUB_DEFAULT_REPO=social-posts
GITHUB_POST_TYPE=issue
```

### Step 3: Create Your Posts Repository

1. Go to: https://github.com/new
2. Create a repository called `social-posts` (or whatever you prefer)
3. Make it **Public** (for blog visibility) or **Private** (for personal archive)
4. Initialize with README
5. (Optional) Enable GitHub Pages for public blog

### Step 4: Connect in Buffer Killer

1. Restart the app
2. Click **"+ Add Account"**
3. Click **"🐙 Connect GitHub"**
4. Authorize in your browser
5. Test with **"🐙 Test GitHub Post"** button

## 📝 How Posts Are Stored

### As Issues (Default)
```markdown
Title: First 50 characters of your post...
Body: Full post content
Labels: social-post
URL: https://github.com/you/social-posts/issues/1
```

### As Markdown Files
```markdown
posts/2025/01/1737456789.md
---
title: Your Post Title
date: 2025-01-21T12:34:56Z
---

Your post content here...
```

### As Gists
```
Filename: 1737456789.md
Description: First 50 characters...
Content: Full post
URL: https://gist.github.com/you/abc123
```

## 🎨 Advanced Configuration

### Custom Repository Structure
```
social-posts/
├── README.md
├── posts/
│   ├── 2025/
│   │   ├── 01/
│   │   │   ├── post-1.md
│   │   │   ├── post-2.md
│   │   └── 02/
│   └── index.md
├── _config.yml (for Jekyll)
└── .github/
    └── workflows/
        └── build.yml (for automation)
```

### Jekyll Blog Integration
Add `_config.yml` to your repo:
```yaml
theme: jekyll-theme-minimal
title: My Social Archive
description: Automated posts from Buffer Killer
```

### GitHub Pages Setup
1. Go to repo Settings → Pages
2. Source: Deploy from branch
3. Branch: main / root
4. Your blog: `https://[username].github.io/social-posts`

## 🔧 Customization Options

### Change Post Type
In your `.env` file:
```env
GITHUB_POST_TYPE=file    # For markdown files
GITHUB_POST_TYPE=issue   # For issues (default)
GITHUB_POST_TYPE=gist    # For gists
```

### Change Default Repository
```env
GITHUB_DEFAULT_REPO=my-blog
```

### Post Templates
Coming soon: Custom templates for different post types!

## 💡 Use Cases

### 1. Developer Blog
- Post coding tips, snippets, thoughts
- Each post becomes a markdown file
- Use with static site generators

### 2. Social Media Archive
- Backup all your social posts
- Searchable, permanent record
- Export anytime with git clone

### 3. Team Updates
- Post to a private team repo
- Team members can comment on issues
- Track project updates

### 4. Learning Journal
- Document your learning journey
- Tag posts with technologies
- Build a knowledge base

## 🔍 Searching Your Posts

### GitHub Search
```
repo:you/social-posts "search term"
```

### Using git
```bash
git clone https://github.com/you/social-posts
grep -r "search term" posts/
```

### API Access
```javascript
// Get all your posts
GET https://api.github.com/repos/you/social-posts/issues
```

## 📊 Analytics

Since everything is in GitHub:
- View traffic in Insights
- See popular posts
- Track engagement (issue comments)
- Fork/star counts

## 🚨 Troubleshooting

### "Repository not found"
1. Create the repository first at github.com/new
2. Make sure the name matches your .env setting

### "Bad credentials"
1. Check your Client ID and Secret
2. Make sure they're copied correctly (no spaces)
3. Regenerate secret if needed

### "Not found" when posting
1. Check repository exists
2. Verify you have write access
3. For private repos, ensure 'repo' scope

### Rate Limiting
- Authenticated: 5000 requests/hour
- Plenty for normal use
- Check limit: `GET /rate_limit`

## 🎯 Best Practices

1. **Use Labels** - Categorize posts with issue labels
2. **Add Metadata** - Use YAML frontmatter in markdown
3. **Regular Backups** - Clone your repo periodically
4. **Use Branches** - For draft posts
5. **Automate** - Use GitHub Actions for processing

## 🌟 Advanced Ideas

### Auto-Blog Generation
Use GitHub Actions to:
- Generate index pages
- Create RSS feeds
- Build static site
- Deploy to GitHub Pages

### Cross-Posting
- Post to GitHub + other platforms
- GitHub as source of truth
- Sync to dev.to, Medium, etc.

### Team Collaboration
- Multiple contributors
- Review process with PRs
- Scheduled publishing

## 📚 Resources

- GitHub OAuth Apps: https://docs.github.com/en/developers/apps/building-oauth-apps
- GitHub Pages: https://pages.github.com
- Jekyll: https://jekyllrb.com
- GitHub API: https://docs.github.com/en/rest

## 🎉 You're All Set!

Your GitHub is now a powerful blog backend. Every post is:
- Version controlled
- Permanently archived
- Searchable
- Commentable
- Free to host

**No monthly fees. No limits. Just git and markdown!** 🚀