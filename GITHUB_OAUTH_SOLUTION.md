# 🔧 GitHub OAuth Fix - Complete Solution

## The Problem
You're getting a **404 error** when trying to authenticate with GitHub. This happens when GitHub redirects back to `http://127.0.0.1:3000/auth/github/callback` but the OAuth server isn't running to handle the callback.

## Quick Solution

### Step 1: Install Missing Package
First, install the missing 'open' package:
```bash
npm install open
```

### Step 2: Run the OAuth Fix Script
This will start a dedicated OAuth server and handle GitHub authentication:
```bash
node test-scripts/github-oauth-fix.js
```

This script will:
1. Start an OAuth server on port 3000
2. Open your browser to GitHub's authorization page
3. Handle the callback after you authorize
4. Save your credentials to the database
5. Confirm everything is working

### Step 3: Verify Authentication
After successful authentication, test posting:
```bash
node test-scripts/test-github.js
```

## Root Cause Analysis

The issue occurs because:
1. **OAuth Server Not Running**: The Electron app's OAuth server might not be starting properly when the app launches
2. **Port 3000 Blocked**: Firewall or another app might be using port 3000
3. **Callback URL Mismatch**: GitHub OAuth app might have wrong callback URL

## Permanent Fix

### Option 1: Ensure OAuth Server Starts with App
The main.js file should start the OAuth server automatically. Check the Electron console for:
- `[MAIN] Starting OAuth server...`
- `[MAIN] OAuth server started successfully ✓`

If you don't see these, the server isn't starting.

### Option 2: Use the OAuth Server Fix Module
Import the fix module in main.js:
```javascript
const { ensureOAuthServer } = require('./lib/auth/oauth-server-fix');

// In app.whenReady()
await ensureOAuthServer();
```

### Option 3: Verify GitHub OAuth App Settings
Go to: https://github.com/settings/developers

Your OAuth App **MUST** have:
- **Authorization callback URL**: `http://127.0.0.1:3000/auth/github/callback`
  - ⚠️ Use `http://` not `https://`
  - ⚠️ Use `127.0.0.1` not `localhost`
  - ⚠️ Must be EXACTLY this URL

## Testing Tools Available

### 1. OAuth Server Test
```bash
node test-scripts/test-oauth-server.js
```
Checks if OAuth server is running and starts it if needed.

### 2. GitHub OAuth Diagnostic
```bash
node test-scripts/github-oauth-diagnostic.js
```
Comprehensive diagnostic of OAuth configuration.

### 3. GitHub Authentication Test
```bash
node test-scripts/test-github-auth.js
```
Complete authentication flow test (requires Electron environment).

### 4. GitHub OAuth Quick Fix
```bash
node test-scripts/github-oauth-fix.js
```
Standalone OAuth server that handles GitHub authentication.

## How GitHub OAuth Works in Buffer Killer

1. **User clicks "Connect GitHub"** in the app
2. **App starts OAuth server** on port 3000 (if not already running)
3. **Browser opens** GitHub authorization page
4. **User authorizes** the app on GitHub
5. **GitHub redirects** to `http://127.0.0.1:3000/auth/github/callback`
6. **OAuth server receives** the authorization code
7. **App exchanges** code for access token
8. **Token is saved** to database
9. **User can now post** to GitHub

## Common Issues & Solutions

### Issue: "Port 3000 already in use"
**Solution**: 
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <process_id> /F

# Mac/Linux
lsof -i :3000
kill -9 <process_id>
```

### Issue: "ECONNREFUSED"
**Solution**: OAuth server not running. Run:
```bash
node test-scripts/github-oauth-fix.js
```

### Issue: "Invalid redirect_uri"
**Solution**: Update GitHub OAuth App callback URL to exactly:
```
http://127.0.0.1:3000/auth/github/callback
```

### Issue: Firewall blocking
**Solution**: 
1. Allow Node.js through Windows Firewall
2. Add exception for port 3000
3. Run as Administrator

## Success Checklist

✅ OAuth server runs on port 3000  
✅ GitHub OAuth app has correct callback URL  
✅ Browser opens GitHub authorization page  
✅ After authorizing, redirected to success page  
✅ GitHub account appears in connected accounts  
✅ Can post to GitHub successfully  

## Next Steps

1. **Run the fix script**: `node test-scripts/github-oauth-fix.js`
2. **Authorize the app** in your browser
3. **Test posting**: `node test-scripts/test-github.js`
4. **Check your GitHub**: View posts at `https://github.com/YOUR_USERNAME/social-posts`

## Still Having Issues?

If the problem persists:
1. **Restart your computer** (clears port conflicts)
2. **Disable antivirus** temporarily (might block local servers)
3. **Create new GitHub OAuth App** with correct settings
4. **Check Windows Event Viewer** for Node.js errors
5. **Run as Administrator**

## Working Example

When everything works correctly, you'll see:
```
✅ OAuth server running at http://127.0.0.1:3000
🌐 Opening browser for authentication...
📨 Received GitHub callback!
  Code: ✅ Present
✅ Access token received!
✅ User authenticated: YOUR_USERNAME
✅ Added new GitHub account
🎉 SUCCESS! GitHub account connected!
```

---

**The fix script (`github-oauth-fix.js`) is your best bet** - it handles everything automatically and will get GitHub working immediately! 🚀
