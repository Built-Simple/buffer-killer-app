// Workspace Manager - Organize accounts by client/project
// This actually makes sense for social media management!

const EventEmitter = require('events');
const path = require('path');
const fs = require('fs').promises;

class WorkspaceManager extends EventEmitter {
  constructor(database) {
    super();
    this.db = database;
    this.workspaces = new Map();
    this.activeWorkspace = null;
    this.activeAccount = null;
  }

  // Initialize workspaces from database
  async initialize() {
    try {
      const workspaces = await this.db.find('workspaces', {});
      for (const workspace of workspaces) {
        // Ensure accounts is always an array
        if (!workspace.accounts) {
          workspace.accounts = [];
        } else if (typeof workspace.accounts === 'string') {
          // If accounts was stored as JSON string, parse it
          try {
            workspace.accounts = JSON.parse(workspace.accounts);
          } catch (e) {
            workspace.accounts = [];
          }
        }
        this.workspaces.set(workspace.id, workspace);
      }
      
      // Load last active workspace
      const settings = await this.db.findOne('settings', { key: 'activeWorkspace' });
      if (settings && settings.value) {
        this.activeWorkspace = settings.value;
      }
      
      console.log(`Loaded ${this.workspaces.size} workspaces`);
    } catch (error) {
      console.log('No existing workspaces found, starting fresh');
    }
  }

  // Create a new workspace
  async createWorkspace(name, description = '') {
    const workspace = {
      id: `workspace-${Date.now()}`,
      name,
      description,
      accounts: [],
      settings: {
        defaultScheduleTime: '09:00',
        timezone: 'America/Los_Angeles',
        hashtagSets: [],
        templates: []
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await this.db.insert('workspaces', workspace);
    this.workspaces.set(workspace.id, workspace);
    
    this.emit('workspace:created', workspace);
    return workspace;
  }

  // Add account to workspace
  async addAccountToWorkspace(workspaceId, accountData) {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const account = {
      id: `account-${Date.now()}`,
      workspaceId,
      platform: accountData.platform,
      username: accountData.username,
      credentials: accountData.credentials, // Already encrypted
      settings: {
        postingSchedule: [],
        autoHashtags: [],
        signature: '',
        mediaFolder: ''
      },
      stats: {
        postsScheduled: 0,
        postsPublished: 0,
        lastPost: null,
        followerCount: null
      },
      active: true,
      created_at: new Date().toISOString()
    };

    // Save account to database
    await this.db.insert('accounts', account);
    
    // Update workspace
    workspace.accounts.push(account.id);
    workspace.updated_at = new Date().toISOString();
    await this.db.update('workspaces', workspaceId, workspace);
    
    this.emit('account:added', { workspace, account });
    return account;
  }

  // Switch active workspace
  async switchWorkspace(workspaceId) {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    this.activeWorkspace = workspaceId;
    
    // Save preference
    await this.db.upsert('settings', 
      { key: 'activeWorkspace' },
      { key: 'activeWorkspace', value: workspaceId }
    );
    
    // Load first account in workspace as active
    if (workspace.accounts.length > 0) {
      const firstAccount = await this.db.findById('accounts', workspace.accounts[0]);
      this.activeAccount = firstAccount;
    } else {
      this.activeAccount = null;
    }
    
    this.emit('workspace:switched', workspace);
    return workspace;
  }

  // Switch active account within workspace
  async switchAccount(accountId) {
    const account = await this.db.findById('accounts', accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    // Verify account belongs to active workspace
    const workspace = this.workspaces.get(this.activeWorkspace);
    if (!workspace || !workspace.accounts.includes(accountId)) {
      throw new Error('Account does not belong to active workspace');
    }

    this.activeAccount = account;
    this.emit('account:switched', account);
    return account;
  }

  // Get accounts for active workspace
  async getWorkspaceAccounts(workspaceId = null) {
    const targetWorkspace = workspaceId || this.activeWorkspace;
    if (!targetWorkspace) {
      return [];
    }

    const workspace = this.workspaces.get(targetWorkspace);
    if (!workspace) {
      return [];
    }

    const accounts = [];
    for (const accountId of workspace.accounts) {
      const account = await this.db.findById('accounts', accountId);
      if (account) {
        // Don't send credentials to frontend
        const { credentials, ...safeAccount } = account;
        accounts.push(safeAccount);
      }
    }

    return accounts;
  }

  // Get scheduled posts for specific account
  async getAccountPosts(accountId, status = 'pending') {
    const posts = await this.db.find('posts', { 
      account_id: accountId,
      status: status 
    });
    
    return posts.sort((a, b) => 
      new Date(a.scheduled_time) - new Date(b.scheduled_time)
    );
  }

  // Schedule post for specific account
  async schedulePost(accountId, postData) {
    const account = await this.db.findById('accounts', accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    const post = {
      id: `post-${Date.now()}`,
      account_id: accountId,
      workspace_id: account.workspaceId,
      content: postData.content,
      platforms: JSON.stringify([account.platform]), // Single platform per account
      scheduled_time: postData.scheduledTime,
      media: postData.media ? JSON.stringify(postData.media) : null,
      hashtags: postData.hashtags ? JSON.stringify(postData.hashtags) : null,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    await this.db.insert('posts', post);
    
    // Update account stats
    account.stats.postsScheduled++;
    await this.db.update('accounts', accountId, account);
    
    this.emit('post:scheduled', { account, post });
    return post;
  }

  // Get all workspaces
  getAllWorkspaces() {
    return Array.from(this.workspaces.values()).map(w => ({
      ...w,
      isActive: w.id === this.activeWorkspace
    }));
  }

  // Delete workspace
  async deleteWorkspace(workspaceId) {
    if (workspaceId === 'default') {
      throw new Error('Cannot delete default workspace');
    }

    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    // Delete all accounts in workspace
    for (const accountId of workspace.accounts) {
      await this.db.delete('accounts', accountId);
      // Also delete posts for this account
      const posts = await this.db.find('posts', { account_id: accountId });
      for (const post of posts) {
        await this.db.delete('posts', post.id);
      }
    }

    // Delete workspace
    await this.db.delete('workspaces', workspaceId);
    this.workspaces.delete(workspaceId);
    
    // Switch to default workspace if this was active
    if (this.activeWorkspace === workspaceId) {
      const defaultWorkspace = Array.from(this.workspaces.values())[0];
      if (defaultWorkspace) {
        await this.switchWorkspace(defaultWorkspace.id);
      }
    }
    
    this.emit('workspace:deleted', workspaceId);
  }

  // Rename workspace
  async renameWorkspace(workspaceId, newName) {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    workspace.name = newName;
    workspace.updated_at = new Date().toISOString();
    
    await this.db.update('workspaces', workspaceId, workspace);
    this.emit('workspace:renamed', workspace);
    return workspace;
  }

  // Get workspace analytics
  async getWorkspaceAnalytics(workspaceId) {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const analytics = {
      workspace: workspace.name,
      accounts: [],
      totals: {
        scheduled: 0,
        published: 0,
        failed: 0,
        engagement: 0
      }
    };

    for (const accountId of workspace.accounts) {
      const account = await this.db.findById('accounts', accountId);
      const posts = await this.db.find('posts', { account_id: accountId });
      
      const accountStats = {
        account: account.username,
        platform: account.platform,
        scheduled: posts.filter(p => p.status === 'pending').length,
        published: posts.filter(p => p.status === 'published').length,
        failed: posts.filter(p => p.status === 'failed').length
      };
      
      analytics.accounts.push(accountStats);
      analytics.totals.scheduled += accountStats.scheduled;
      analytics.totals.published += accountStats.published;
      analytics.totals.failed += accountStats.failed;
    }

    return analytics;
  }

  // Clone workspace
  async cloneWorkspace(workspaceId, newName) {
    const original = this.workspaces.get(workspaceId);
    if (!original) {
      throw new Error('Workspace not found');
    }

    const clone = {
      ...original,
      id: `workspace-${Date.now()}`,
      name: newName,
      accounts: [], // Don't clone accounts (they have credentials)
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await this.db.insert('workspaces', clone);
    this.workspaces.set(clone.id, clone);
    
    this.emit('workspace:cloned', { original, clone });
    return clone;
  }

  // Export workspace configuration
  async exportWorkspace(workspaceId) {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    // Get all accounts (without credentials)
    const accounts = [];
    for (const accountId of workspace.accounts) {
      const account = await this.db.findById('accounts', accountId);
      if (account) {
        const { credentials, ...safeAccount } = account;
        accounts.push(safeAccount);
      }
    }

    // Get all scheduled posts
    const posts = [];
    for (const accountId of workspace.accounts) {
      const accountPosts = await this.db.find('posts', { 
        account_id: accountId,
        status: 'pending'
      });
      posts.push(...accountPosts);
    }

    return {
      workspace: workspace,
      accounts: accounts,
      posts: posts,
      exported_at: new Date().toISOString()
    };
  }
}

module.exports = WorkspaceManager;
