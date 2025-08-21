// OAuth Flow Fix for Buffer Killer App
// This file fixes the OAuth authentication issues

const { ipcMain } = require('electron');

// Fix OAuth callback handling issues
function fixOAuthCallbacks(db, mainWindow) {
  
  // Just fix the get-accounts handler to show usernames properly
  // DON'T override authenticate-platform - that was breaking things!
  
  // Fix the get-accounts handler to properly return accounts
  ipcMain.removeHandler('get-accounts');
  ipcMain.handle('get-accounts', async () => {
    try {
      const accounts = await db.getAccounts();
      
      // Parse credentials to get username for display
      const accountsWithUsernames = accounts.map(account => {
        try {
          const credentials = JSON.parse(account.credentials);
          return {
            id: account.id,
            platform: account.platform,
            active: account.active,
            username: credentials.username || credentials.displayName || 'Unknown',
            instance: credentials.instance // For Mastodon
          };
        } catch (e) {
          return {
            id: account.id,
            platform: account.platform,
            active: account.active,
            username: 'Unknown'
          };
        }
      });
      
      return accountsWithUsernames;
    } catch (error) {
      console.error('Error fetching accounts:', error);
      return [];
    }
  });
  
  console.log('OAuth callbacks fixed and registered');
}

module.exports = { fixOAuthCallbacks };