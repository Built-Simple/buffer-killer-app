# 🔍 MASTODON OAUTH DEBUGGING GUIDE

## **The Issue:**
OAuth server is running ✅ but auth instance isn't being stored when you click "Add Mastodon Account"

## **Quick Console Test:**
Paste this in the DevTools console while the app is running:

```javascript
// Test if IPC is working
(async () => {
  console.log('Testing Mastodon auth...');
  
  // Check if API exists
  if (!window.bufferKillerAPI) {
    console.error('❌ bufferKillerAPI not found!');
    return;
  }
  
  // Try to authenticate
  try {
    const result = await window.bufferKillerAPI.authenticatePlatform('mastodon', {
      instance: 'mastodon.social'
    });
    console.log('Result:', result);
  } catch (error) {
    console.error('Error:', error);
  }
  
  // Check active auth flows
  setTimeout(async () => {
    const flows = await window.bufferKillerAPI.debugAuthFlows?.();
    console.log('Active auth flows:', flows);
  }, 1000);
})();
```

## **What You Should See:**

### In Main Process Console:
```
[IPC] authenticate-platform called
[IPC] Platform: mastodon
[IPC] Creating MastodonAuth instance...
[MASTODON AUTH] authenticate() called for mastodon.social
[MASTODON AUTH] ====== STORING AUTH INSTANCE ======
[MASTODON AUTH] Stored in activeAuthFlows. Current keys: [...]
```

### In Renderer Console:
```
Result: { success: true, message: "Please complete authentication..." }
```

## **If You Don't See These Logs:**

### 1. Check if the "Add Account" button is calling the right function:

Look in `renderer.js` for:
```javascript
document.querySelectorAll('.connect-platform').forEach(btn => {
  btn.addEventListener('click', async () => {
    const platform = btn.dataset.platform;
    await connectPlatform(platform);
  });
});
```

### 2. Check if `connectPlatform` is calling the IPC:

```javascript
async function connectPlatform(platform) {
  // Should call:
  const result = await window.bufferKillerAPI.authenticatePlatform(platform, options);
}
```

## **Debug Steps:**

1. **Open DevTools Console** (Ctrl+Shift+I)

2. **Test the API directly:**
   ```javascript
   window.bufferKillerAPI.authenticatePlatform
   // Should show: ƒ async authenticatePlatform()
   ```

3. **Watch Network tab** when clicking "Add Mastodon":
   - Should see request to Mastodon instance API

4. **Check if instance prompt appears:**
   - Should ask for Mastodon instance
   - If not, UI event handler might be broken

## **Manual Override Test:**

If button doesn't work, manually trigger auth:

```javascript
// Force Mastodon auth
(async () => {
  // Skip the UI prompt
  const options = { instance: 'mastodon.social' };
  
  console.log('Starting manual Mastodon auth...');
  const result = await window.bufferKillerAPI.authenticatePlatform('mastodon', options);
  
  if (result.success) {
    console.log('✅ Auth started! Check browser.');
  } else {
    console.log('❌ Failed:', result.message);
  }
})();
```

## **Common Problems:**

1. **Button click not working**
   - Event listener not attached
   - Modal not closing properly

2. **IPC not reaching main process**
   - Check for errors in renderer console
   - Verify preload script loaded

3. **Auth instance not stored**
   - Exception during registerApp()
   - Network error to Mastodon

## **Share These:**
1. Main process console output when clicking "Add Mastodon"
2. Renderer console output
3. Result of the manual test above
4. Any error messages
