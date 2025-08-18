// Account System Integration for Electron
// Practical account and workspace management

const WorkspaceManager = require('./workspace-manager');
const AccountRateLimiter = require('./account-rate-limiter');
const { ipcMain } = require('electron');

class AccountSystemIntegration {
  constructor(database) {
    this.workspaceManager = new WorkspaceManager(database);
    this.rateLimiter = new AccountRateLimiter();
    this.setupIpcHandlers();
    this.setupEventListeners();
  }

  async initialize() {
    await this.workspaceManager.initialize();
    
    // Create default workspace if none exists
    const workspaces = this.workspaceManager.getAllWorkspaces();
    if (workspaces.length === 0) {
      await this.workspaceManager.createWorkspace('Personal', 'My personal accounts');
    }
  }

  setupIpcHandlers() {
    // Workspace Management
    ipcMain.handle('workspace:get-all', async () => {
      return this.workspaceManager.getAllWorkspaces();
    });

    ipcMain.handle('workspace:create', async (event, name, description) => {
      return await this.workspaceManager.createWorkspace(name, description);
    });

    ipcMain.handle('workspace:switch', async (event, workspaceId) => {
      return await this.workspaceManager.switchWorkspace(workspaceId);
    });

    ipcMain.handle('workspace:delete', async (event, workspaceId) => {
      return await this.workspaceManager.deleteWorkspace(workspaceId);
    });

    ipcMain.handle('workspace:rename', async (event, workspaceId, newName) => {
      return await this.workspaceManager.renameWorkspace(workspaceId, newName);
    });

    ipcMain.handle('workspace:get-accounts', async (event, workspaceId) => {
      return await this.workspaceManager.getWorkspaceAccounts(workspaceId);
    });

    ipcMain.handle('workspace:analytics', async (event, workspaceId) => {
      return await this.workspaceManager.getWorkspaceAnalytics(workspaceId);
    });

    ipcMain.handle('workspace:export', async (event, workspaceId) => {
      return await this.workspaceManager.exportWorkspace(workspaceId);
    });

    ipcMain.handle('workspace:clone', async (event, workspaceId, newName) => {
      return await this.workspaceManager.cloneWorkspace(workspaceId, newName);
    });

    // Account Management
    ipcMain.handle('account:add-to-workspace', async (event, workspaceId, accountData) => {
      return await this.workspaceManager.addAccountToWorkspace(workspaceId, accountData);
    });

    ipcMain.handle('account:switch', async (event, accountId) => {
      return await this.workspaceManager.switchAccount(accountId);
    });

    ipcMain.handle('account:get-posts', async (event, accountId, status) => {
      return await this.workspaceManager.getAccountPosts(accountId, status);
    });

    ipcMain.handle('account:schedule-post', async (event, accountId, postData) => {
      // Add rate limiting
      const account = await this.workspaceManager.db.findById('accounts', accountId);
      
      return await this.rateLimiter.addToQueue(
        accountId,
        account.platform,
        async () => {
          return await this.workspaceManager.schedulePost(accountId, postData);
        }
      );
    });

    ipcMain.handle('account:get-active', async () => {
      return {
        workspace: this.workspaceManager.activeWorkspace,
        account: this.workspaceManager.activeAccount
      };
    });

    // Rate Limiting
    ipcMain.handle('rate-limit:status', async (event, accountId, platform) => {
      return this.rateLimiter.getRemainingPosts(accountId, platform);
    });

    ipcMain.handle('rate-limit:all-statuses', async () => {
      return this.rateLimiter.getAllStatuses();
    });

    ipcMain.handle('rate-limit:clear-queue', async (event, accountId) => {
      this.rateLimiter.clearQueue(accountId);
      return { success: true };
    });

    ipcMain.handle('rate-limit:reset', async (event, accountId) => {
      this.rateLimiter.resetTracking(accountId);
      return { success: true };
    });
  }

  setupEventListeners() {
    // Forward workspace events to renderer
    this.workspaceManager.on('workspace:created', (data) => {
      this.broadcastToRenderers('workspace:created', data);
    });

    this.workspaceManager.on('workspace:switched', (data) => {
      this.broadcastToRenderers('workspace:switched', data);
    });

    this.workspaceManager.on('workspace:deleted', (data) => {
      this.broadcastToRenderers('workspace:deleted', data);
    });

    this.workspaceManager.on('account:added', (data) => {
      this.broadcastToRenderers('account:added', data);
    });

    this.workspaceManager.on('account:switched', (data) => {
      this.broadcastToRenderers('account:switched', data);
    });

    this.workspaceManager.on('post:scheduled', (data) => {
      this.broadcastToRenderers('post:scheduled', data);
    });

    // Forward rate limit events
    this.rateLimiter.on('rate-limit-hit', (data) => {
      this.broadcastToRenderers('rate-limit-hit', data);
    });

    this.rateLimiter.on('task-completed', (data) => {
      this.broadcastToRenderers('task-completed', data);
    });

    this.rateLimiter.on('task-failed', (data) => {
      this.broadcastToRenderers('task-failed', data);
    });
  }

  broadcastToRenderers(channel, data) {
    const { BrowserWindow } = require('electron');
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(window => {
      window.webContents.send(channel, data);
    });
  }

  // Helper method to get current context
  getCurrentContext() {
    return {
      workspace: this.workspaceManager.activeWorkspace,
      account: this.workspaceManager.activeAccount,
      workspaces: this.workspaceManager.getAllWorkspaces()
    };
  }

  // Helper method to publish post for active account
  async publishPost(postId) {
    const post = await this.workspaceManager.db.findById('posts', postId);
    if (!post) throw new Error('Post not found');
    
    const account = await this.workspaceManager.db.findById('accounts', post.account_id);
    if (!account) throw new Error('Account not found');
    
    // Use rate limiter to ensure we don't hit limits
    return await this.rateLimiter.addToQueue(
      account.id,
      account.platform,
      async () => {
        // This is where actual platform posting would happen
        // For now, just update the post status
        await this.workspaceManager.db.update('posts', postId, {
          status: 'published',
          published_at: new Date().toISOString()
        });
        
        // Update account stats
        account.stats.postsPublished++;
        account.stats.lastPost = new Date().toISOString();
        await this.workspaceManager.db.update('accounts', account.id, account);
        
        return { success: true, postId, accountId: account.id };
      }
    );
  }
}

module.exports = AccountSystemIntegration;
