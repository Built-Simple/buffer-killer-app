# 📦 INSTALL ALL DEPENDENCIES - QUICK GUIDE

## 🚀 ONE-CLICK INSTALLATION

### Option 1: Run the Batch File (Easiest)
1. **Double-click** `install-dependencies.bat`
2. Wait for installation to complete
3. Done! All dependencies installed

### Option 2: PowerShell Script
1. Open PowerShell as Administrator
2. Navigate to app: `cd C:\buffer-killer-app`
3. Run: `.\install-dependencies.ps1`

### Option 3: Manual Installation
```powershell
cd C:\buffer-killer-app
npm install
```

---

## 📋 WHAT GETS INSTALLED

### Core Dependencies:
- ✅ **axios** - HTTP requests for API calls
- ✅ **express** - OAuth callback server
- ✅ **sqlite3** - Database for posts
- ✅ **electron** - Desktop app framework
- ✅ **bottleneck** - Rate limiting
- ✅ **node-schedule** - Post scheduling

### Platform-Specific:
- ✅ **googleapis** - YouTube integration
- ✅ **oauth** - OAuth 1.0a support
- ✅ **pkce-challenge** - Secure OAuth 2.0
- ✅ **crypto-js** - Token encryption

### Utilities:
- ✅ **puppeteer** - Image generation
- ✅ **sharp** - Image processing
- ✅ **csv-parse** - Bulk import
- ✅ **dotenv** - Environment variables

---

## ✨ AFTER INSTALLATION

### Test Everything Works:
```bash
# Test all platforms
npm test

# Quick post test
npm run test:quick

# Test specific platforms
npm run test:twitter
npm run test:github

# Run the main app
npm start
```

---

## 🔧 TROUBLESHOOTING

### If npm is not recognized:
1. Install Node.js from https://nodejs.org
2. Restart your terminal
3. Try again

### If installation fails:
1. Run as Administrator
2. Clear npm cache: `npm cache clean --force`
3. Delete node_modules: `rmdir /s node_modules`
4. Try again

### If sqlite3 fails to build:
```bash
# Install with pre-built binaries
npm install sqlite3 --build-from-source
```

---

## 🎯 QUICK CHECK

Run this to verify all dependencies:
```bash
node -e "console.log('Checking dependencies...'); ['axios','express','sqlite3','googleapis','oauth','pkce-challenge'].forEach(m => { try { require(m); console.log('✅', m); } catch { console.log('❌', m, '- run npm install'); } })"
```

---

## ✅ SUCCESS INDICATORS

When everything is installed correctly:
1. `npm start` launches the app
2. `npm test` shows platform status
3. No red error messages
4. All platforms can connect

---

## 🚀 YOU'RE READY!

Once dependencies are installed:
1. **Run the app**: `npm start`
2. **Connect your accounts**: Click connect buttons
3. **Schedule posts**: No more Buffer fees!

Total install time: ~2-5 minutes
Monthly cost: $0 forever! 🎉