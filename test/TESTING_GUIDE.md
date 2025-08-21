# 🧪 BUFFER KILLER TESTING GUIDE

## Quick Start Testing

1. **Start the app**:
   ```bash
   npm run dev
   ```

2. **Open Developer Console**:
   - Press `Ctrl+Shift+I` (or `Cmd+Option+I` on Mac)
   - Go to the "Console" tab

3. **Load the test suite**:
   - Copy ALL the code from `test/console-test-suite.js`
   - Paste it into the console
   - Press Enter

4. **Run comprehensive tests**:
   ```javascript
   bufferKillerTests.runAllTests()
   ```

## 🔍 What Each Test Does

### TEST 1: API Availability
- Checks if all API methods are available
- Shows ✅ for available, ❌ for missing

### TEST 2: Account Management
- Gets all accounts from database
- Shows account details in a table

### TEST 3: Workspace System
- Checks workspace functionality
- Shows current workspace and its accounts

### TEST 4: OAuth Flow
- Guides you through OAuth testing
- Checks if buttons exist

### TEST 5: Manual Account Addition
- Adds a test account without OAuth
- Verifies it saves and retrieves correctly

### TEST 6: UI Elements
- Checks if all UI elements exist
- Shows which buttons/fields are missing

### TEST 7: Post Functionality
- Tests if posting works
- Requires at least one account

### TEST 8: IPC Communication
- Tests Electron IPC bridge
- Verifies main/renderer communication

### TEST 9: Account Display Refresh
- Checks UI update functions
- Tests if accounts display properly

## 🔧 Quick Fixes

If tests fail, load the diagnostic script:

1. Copy ALL code from `test/quick-fix-diagnostic.js`
2. Paste into console
3. Run diagnostics:
   ```javascript
   bufferKillerFixes.runDiagnostics()
   ```

This will:
- Identify the exact problem
- Attempt automatic fixes
- Provide manual fix commands

## 📝 Common Issues & Solutions

### Issue: "No accounts displayed"
```javascript
// Force refresh the UI
bufferKillerTests.forceUIRefresh()

// Or rebuild account list
bufferKillerFixes.fixForceAccountRefresh()
```

### Issue: "OAuth completes but account doesn't save"
```javascript
// Rebuild the OAuth handler
bufferKillerFixes.fixRebuildOAuthHandler()

// Then try OAuth again
```

### Issue: "Can't post - no account selected"
```javascript
// First, check if accounts exist
bufferKillerTests.testAccountManagement()

// If no accounts, add a test one
bufferKillerTests.testManualAccountAdd()

// Then try posting
bufferKillerTests.testPostFunctionality()
```

### Issue: "Want to test without real OAuth"
```javascript
// Add a test account manually
bufferKillerTests.testManualAccountAdd()

// This creates a working account for testing
```

## 🎯 Step-by-Step Debugging

1. **Check what's available**:
   ```javascript
   bufferKillerTests.testAPIAvailability()
   ```

2. **Check accounts**:
   ```javascript
   bufferKillerTests.testAccountManagement()
   ```

3. **If no accounts, add test account**:
   ```javascript
   bufferKillerTests.testManualAccountAdd()
   ```

4. **Force UI refresh**:
   ```javascript
   bufferKillerTests.forceUIRefresh()
   ```

5. **Test posting**:
   ```javascript
   bufferKillerTests.testPostFunctionality()
   ```

## 💡 Pro Tips

1. **See all available test commands**:
   ```javascript
   Object.keys(bufferKillerTests)
   ```

2. **Debug a specific account**:
   ```javascript
   bufferKillerTests.debugAccount('account-id-here')
   ```

3. **Clear everything and start fresh**:
   ```javascript
   bufferKillerTests.clearAllAccounts()
   ```

4. **Watch OAuth flow**:
   ```javascript
   // This wraps the OAuth handler to log everything
   bufferKillerFixes.diagnoseOAuthCallback()
   // Now do OAuth - you'll see detailed logs
   ```

5. **Manually complete OAuth** (if you have a token):
   ```javascript
   bufferKillerFixes.fixManualOAuthComplete('your-token', 'mastodon.social')
   ```

## 🚨 Emergency Reset

If everything is broken:

```javascript
// 1. Clear all accounts
bufferKillerTests.clearAllAccounts()

// 2. Add a test account
bufferKillerTests.testManualAccountAdd()

// 3. Force refresh UI
bufferKillerTests.forceUIRefresh()

// 4. Test posting
bufferKillerTests.testPostFunctionality()
```

## 📊 Expected Test Results

When everything works, you should see:

```
✅ API Availability: All methods available
✅ Account Management: Shows accounts in table
✅ Workspace System: Has default workspace
✅ UI Elements: All elements found
✅ IPC Communication: Working
✅ Post Functionality: Posts successfully
```

## 🐛 Still Having Issues?

1. Check the browser console for red error messages
2. Look at the Network tab for failed requests
3. Check if the OAuth server is running (port 3000)
4. Verify database file exists at `data/buffer-killer.db`

## 📋 Test Commands Reference

```javascript
// Full test suite
bufferKillerTests.runAllTests()

// Individual tests
bufferKillerTests.testAPIAvailability()
bufferKillerTests.testAccountManagement()
bufferKillerTests.testWorkspaceSystem()
bufferKillerTests.testManualAccountAdd()
bufferKillerTests.testUIElements()
bufferKillerTests.testPostFunctionality()

// Fixes
bufferKillerFixes.runDiagnostics()
bufferKillerFixes.fixForceAccountRefresh()
bufferKillerFixes.fixRebuildOAuthHandler()

// Utilities
bufferKillerTests.forceUIRefresh()
bufferKillerTests.clearAllAccounts()
bufferKillerTests.debugAccount(id)
```

---

💪 **You now have complete debugging power!** Run these tests to find exactly what's broken and fix it!
