# GitHub Browser-Based OAuth Setup

## Overview
Buffer Killer now uses browser-based OAuth for GitHub authentication - **no API keys required!** This makes it much easier to get started.

## How It Works

1. **Click "Connect GitHub"** - No need to create an OAuth app or get API keys
2. **Authorize in Browser** - Your browser will open to GitHub's authorization page
3. **Grant Permissions** - Allow Buffer Killer to access your repositories
4. **Automatic Connection** - The app automatically receives the authorization and connects your account

## Features

### ✅ No API Keys Required
- Uses Buffer Killer's public OAuth app
- No need to register your own GitHub OAuth application
- No client secrets to manage or secure

### 🔐 Secure Authentication
- Uses OAuth 2.0 flow with CSRF protection
- Tokens stored securely using Electron's safeStorage API
- No credentials are ever exposed to the renderer process

### 📝 Posting to GitHub
Posts are created as GitHub issues in your specified repository:
- Default repository: `social-posts`
- Repository is created automatically if it doesn't exist
- Each post becomes an issue with the post content as the issue body

## Configuration

### Default Repository
You can change the default repository in Settings:
1. Go to Settings page
2. Find the GitHub section
3. Enter your preferred repository name (default: `social-posts`)
4. The repo will be created automatically if it doesn't exist

## Permissions

The app requests the following GitHub scopes:
- `public_repo` - Access public repositories
- `repo` - Access private repositories (optional)
- `gist` - Create gists
- `user` - Read user profile data

## Troubleshooting

### "Authentication Failed" Error
- Make sure you're logged into GitHub in your browser
- Try clearing your browser cookies for GitHub and authenticating again

### "Repository Not Found" Error
- The app will automatically create the repository if it doesn't exist
- Make sure you have permissions to create repositories in your account

### Revoking Access
To revoke Buffer Killer's access to your GitHub account:
1. Go to GitHub Settings > Applications > Authorized OAuth Apps
2. Find "Buffer Killer" 
3. Click "Revoke"

## Technical Details

### OAuth Flow
1. App generates a CSRF state token
2. Opens GitHub authorization URL in system browser
3. User authorizes the application
4. GitHub redirects to `http://127.0.0.1:3000/auth/github/callback`
5. App exchanges authorization code for access token
6. Token is stored securely using Electron's safeStorage

### Public Client Configuration
- Client ID: `Ov23liJhGsLSW0RPuVFp`
- Redirect URI: `http://127.0.0.1:3000/auth/github/callback`
- No client secret required (public OAuth app)

## Security Notes

- Tokens are encrypted at rest using platform-specific encryption
- OAuth server only runs on localhost (127.0.0.1)
- CSRF protection using state parameter
- All API calls use HTTPS

## Alternative: Using Your Own GitHub App

If you prefer to use your own GitHub OAuth app:
1. Create an OAuth app at https://github.com/settings/developers
2. Set Authorization callback URL to `http://127.0.0.1:3000/auth/github/callback`
3. Modify `lib/platforms/github-browser-auth.js` with your Client ID

## API Rate Limits

GitHub API limits for authenticated requests:
- 5,000 requests per hour
- Rate limits are per-account
- The app includes rate limiting to prevent hitting these limits

---

*Last Updated: January 18, 2025*