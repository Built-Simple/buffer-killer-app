# 🔧 BUFFER KILLER - SYSTEMATIC FIX PLAN

## Current State Analysis (from test results)

### ✅ What's Working:
- Basic IPC communication
- Database connection
- 1 workspace exists (Personal)
- 1 account record exists
- Some API methods work (getAccounts, schedulePost, etc.)

### ❌ What's Broken:

#### 1. **CORRUPTED ACCOUNT DATA** (CRITICAL)
```json
{
  "id": 1,
  "platform": "mastodon",
  "username": null,        // ❌ NULL
  "access_token": null,     // ❌ NULL - Can't post without this!
  "refresh_token": null,    // ❌ NULL
  "profile_data": null,     // ❌ NULL
  "workspace_id": null      // ❌ Not linked to workspace
}
```

#### 2. **MISSING API METHODS** (5 methods)
- addAccount
- removeAccount
- postNow
- getCurrentWorkspace
- removeAccountFromWorkspace

#### 3. **UI ELEMENTS WITH WRONG IDS**
- Schedule button: Looking for #schedule-post, actual is #schedule-btn
- Post now button: Looking for #post-now, actual is #post-now-btn
- Account list: Looking for #account-list, actual might be #accounts-list
- Platform tabs: Wrong selector
- Add account buttons: Wrong selector

#### 4. **WORKSPACE NOT LINKED**
- Account exists but workspace_id is NULL
- Workspace shows 0 accounts

## Fix Order (Priority)

### PHASE 1: Fix Corrupted Account (IMMEDIATE)
1. Delete the corrupted account
2. Re-add with proper data
3. Link to workspace

### PHASE 2: Fix Missing API Methods
1. Add missing methods to preload.js
2. Implement in main.js

### PHASE 3: Fix UI Selectors
1. Update test suite with correct IDs
2. Verify all elements exist

### PHASE 4: Fix OAuth Flow
1. Ensure OAuth saves complete account data
2. Auto-link to current workspace

## Quick Fix Commands

### Fix 1: Clean and Re-add Account
```javascript
// 1. Remove corrupted account
await window.bufferKillerAPI.query('DELETE FROM accounts WHERE id = 1');

// 2. Add proper test account
const testAccount = {
  platform: 'mastodon',
  username: 'testuser',
  instance: 'mastodon.social',
  access_token: 'test_token_' + Date.now(),
  profile_data: JSON.stringify({
    id: '12345',
    username: 'testuser',
    display_name: 'Test User',
    avatar: 'https://mastodon.social/avatars/original/missing.png'
  })
};

// 3. Insert with workspace link
await window.bufferKillerAPI.query(`
  INSERT INTO accounts (platform, username, access_token, profile_data, workspace_id, is_active)
  VALUES (?, ?, ?, ?, 1, 1)
`, ['mastodon', testAccount.username, testAccount.access_token, testAccount.profile_data]);

// 4. Add to workspace
await window.bufferKillerAPI.addAccountToWorkspace(1, 2); // workspace 1, new account id 2
```

### Fix 2: Add Missing API Methods
Need to add to preload.js:
```javascript
addAccount: (platform, username, instance, data) => 
  ipcRenderer.invoke('add-account', platform, username, instance, data),
removeAccount: (accountId) => 
  ipcRenderer.invoke('remove-account', accountId),
postNow: (content, platforms, accounts) => 
  ipcRenderer.invoke('post-now', content, platforms, accounts),
getCurrentWorkspace: () => 
  ipcRenderer.invoke('get-current-workspace'),
removeAccountFromWorkspace: (workspaceId, accountId) => 
  ipcRenderer.invoke('remove-account-from-workspace', workspaceId, accountId)
```

### Fix 3: Update UI Selectors
```javascript
// Correct selectors
const elements = {
  'Schedule button': document.querySelector('#schedule-btn'),
  'Post now button': document.querySelector('#post-now-btn'),
  'Account list': document.querySelector('#accounts-list'),
  'Add account buttons': document.querySelectorAll('.connect-platform')
};
```

## Verification Steps

After fixes, run:
```javascript
// 1. Check account is fixed
const accounts = await window.bufferKillerAPI.getAccounts();
console.log('Fixed account:', accounts[0]);

// 2. Check workspace link
const workspace = await window.bufferKillerAPI.getWorkspaces();
console.log('Workspace accounts:', workspace[0].accounts);

// 3. Test posting
await bufferKillerTests.testPostFunctionality();
```

## Expected Result After Fixes

Account should look like:
```json
{
  "id": 2,
  "platform": "mastodon",
  "username": "testuser",
  "access_token": "test_token_xxx",
  "profile_data": "{...}",
  "workspace_id": 1,
  "is_active": 1
}
```

Workspace should show:
```json
{
  "id": 1,
  "name": "Personal",
  "accounts": [2]
}
```
