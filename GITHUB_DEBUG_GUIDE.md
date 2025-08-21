# GitHub Integration Debugging Guide

## Current Issue
You're getting a 404 error when trying to authenticate with GitHub. This means the OAuth callback isn't being handled properly.

## Quick Fix Steps

### 1. First, verify the OAuth server is running:
```bash
node test-scripts/test-oauth-server.js
```

This will:
- Check if the OAuth server is running
- Start it if it's not
- Test the GitHub callback route

### 2. Make sure the Electron app's OAuth server starts properly:

The OAuth server should start automatically when the app launches. Check the console output in the Electron app for:
- `[MAIN] Starting OAuth server...`
- `[MAIN] OAuth server started successfully ✓`

If you don't see these messages, the OAuth server isn't starting.

### 3. Verify your GitHub OAuth App settings:

Go to https://github.com/settings/developers and check your OAuth App:

**Required settings:**
- **Application name:** Buffer Killer (or any name)
- **Homepage URL:** http://127.0.0.1:3000 (or any URL)
- **Authorization callback URL:** `http://127.0.0.1:3000/auth/github/callback`
  - ⚠️ MUST be exactly this URL
  - ⚠️ Use `http://` not `https://`
  - ⚠️ Use `127.0.0.1` not `localhost`

### 4. Test GitHub authentication manually:
```bash
node test-scripts/test-github-auth.js
```

This will walk you through the entire authentication flow step by step.

### 5. Test posting to GitHub (after authentication):
```bash
node test-scripts/test-github.js
```

## Common Issues and Solutions

### Issue 1: 404 Error on Callback
**Cause:** OAuth server not running
**Solution:** 
1. Make sure the Electron app is running
2. Check if port 3000 is blocked by firewall
3. Run the OAuth server manually: `node test-scripts/test-oauth-server.js`

### Issue 2: "Invalid redirect_uri" error
**Cause:** GitHub OAuth app has wrong callback URL
**Solution:** 
1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Edit your app
3. Set Authorization callback URL to exactly: `http://127.0.0.1:3000/auth/github/callback`

### Issue 3: Port 3000 already in use
**Cause:** Another application is using port 3000
**Solution:**
1. Find what's using port 3000: `netstat -ano | findstr :3000`
2. Kill the process or change the OAuth server port in the code

### Issue 4: Authentication works but posting fails
**Cause:** Missing repository or wrong permissions
**Solution:**
1. The app will create a `social-posts` repository automatically
2. Make sure your GitHub token has `repo` scope
3. Check rate limits: `node test-scripts/test-github.js`

## Manual OAuth Flow Test

If the automated tests don't work, try this manual flow:

1. **Start OAuth server:**
   ```bash
   node -e "const OAuthServer = require('./src/main/auth/oauth-server'); const server = new OAuthServer(3000); server.start().then(() => console.log('Server running')); setTimeout(() => {}, 1000000)"
   ```

2. **Open browser and visit:**
   ```
   https://github.com/login/oauth/authorize?client_id=Ov23liJhGsLSW0RPuVFp&redirect_uri=http%3A%2F%2F127.0.0.1%3A3000%2Fauth%2Fgithub%2Fcallback&scope=public_repo+repo+gist+user&state=test123&allow_signup=true
   ```

3. **After authorizing, you should be redirected to:**
   ```
   http://127.0.0.1:3000/auth/github/callback?code=XXXXX&state=test123
   ```

4. If you see a success page, the OAuth server is working!

## Debugging Commands

```bash
# Check if OAuth server is accessible
curl http://127.0.0.1:3000/health

# Test GitHub callback route
curl "http://127.0.0.1:3000/auth/github/callback?error=test"

# Check what's using port 3000 (Windows)
netstat -ano | findstr :3000

# Check what's using port 3000 (Mac/Linux)
lsof -i :3000
```

## If Nothing Works

1. **Restart the Electron app completely**
2. **Check Windows Firewall** - allow Node.js through firewall
3. **Run as Administrator** (Windows) or with sudo (Mac/Linux)
4. **Check antivirus software** - may be blocking local servers
5. **Try a different port** - change 3000 to 3001 in all files

## Contact GitHub OAuth App

If you need to create a new GitHub OAuth App:
1. Go to: https://github.com/settings/developers
2. Click "New OAuth App"
3. Use these settings:
   - Application name: Buffer Killer
   - Homepage URL: http://127.0.0.1:3000
   - Authorization callback URL: http://127.0.0.1:3000/auth/github/callback
4. After creating, you'll get a Client ID
5. Update `lib/platforms/github-browser-auth.js` with your new Client ID

## Success Indicators

When everything is working, you should see:
1. ✅ OAuth server running on port 3000
2. ✅ Browser opens GitHub authorization page
3. ✅ After authorizing, redirected to success page
4. ✅ Account appears in the app's connected accounts
5. ✅ Can post to GitHub successfully

## Need More Help?

Run the diagnostic tool:
```bash
node test-scripts/test-oauth-server.js
```

This will tell you exactly what's wrong and try to fix it.
