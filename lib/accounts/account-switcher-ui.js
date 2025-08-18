// Account Switcher UI Component
// Provides workspace and account switching in the UI

class AccountSwitcher {
  constructor() {
    this.currentWorkspace = null;
    this.currentAccount = null;
    this.container = null;
  }

  async init(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Container ${containerId} not found`);
      return;
    }

    await this.loadWorkspaces();
    this.render();
    this.attachEventListeners();
  }

  async loadWorkspaces() {
    try {
      const workspaces = await window.bufferKillerAPI.getWorkspaces();
      this.workspaces = workspaces;
      
      // Set current workspace
      this.currentWorkspace = workspaces.find(w => w.isActive) || workspaces[0];
      
      // Load accounts for current workspace
      if (this.currentWorkspace) {
        const accounts = await window.bufferKillerAPI.getWorkspaceAccounts(this.currentWorkspace.id);
        this.currentWorkspace.accounts = accounts;
        this.currentAccount = accounts.find(a => a.isActive) || accounts[0];
      }
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    }
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="account-switcher">
        <!-- Workspace Selector -->
        <div class="workspace-selector">
          <label>Workspace:</label>
          <div class="workspace-dropdown">
            <button class="workspace-current" id="workspace-dropdown-btn">
              <span class="workspace-icon">💼</span>
              <span class="workspace-name">${this.currentWorkspace?.name || 'No Workspace'}</span>
              <span class="dropdown-arrow">▼</span>
            </button>
            <div class="workspace-menu" id="workspace-menu" style="display: none;">
              ${this.renderWorkspaceMenu()}
            </div>
          </div>
          <button class="btn-icon" id="add-workspace-btn" title="Add Workspace">+</button>
          <button class="btn-icon" id="workspace-settings-btn" title="Workspace Settings">⚙️</button>
        </div>

        <!-- Account Selector -->
        <div class="account-selector">
          <label>Account:</label>
          <div class="account-tabs">
            ${this.renderAccountTabs()}
          </div>
          <button class="btn-icon" id="add-account-btn" title="Add Account">+</button>
        </div>

        <!-- Quick Stats -->
        <div class="account-stats">
          ${this.renderAccountStats()}
        </div>
      </div>

      <style>
        .account-switcher {
          background: var(--dark-surface);
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .workspace-selector,
        .account-selector {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .workspace-selector label,
        .account-selector label {
          font-size: 0.9rem;
          color: var(--muted-text);
          min-width: 80px;
        }

        .workspace-dropdown {
          position: relative;
          flex: 1;
        }

        .workspace-current {
          width: 100%;
          padding: 0.5rem 1rem;
          background: var(--dark-bg);
          border: 1px solid var(--dark-border);
          border-radius: 6px;
          color: var(--light-text);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .workspace-current:hover {
          border-color: var(--primary-color);
        }

        .workspace-name {
          flex: 1;
          text-align: left;
        }

        .dropdown-arrow {
          opacity: 0.5;
        }

        .workspace-menu {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: var(--dark-bg);
          border: 1px solid var(--dark-border);
          border-radius: 6px;
          margin-top: 0.25rem;
          max-height: 300px;
          overflow-y: auto;
          z-index: 100;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }

        .workspace-item {
          padding: 0.75rem 1rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: background 0.2s;
        }

        .workspace-item:hover {
          background: rgba(102, 126, 234, 0.1);
        }

        .workspace-item.active {
          background: rgba(102, 126, 234, 0.2);
          font-weight: bold;
        }

        .workspace-item .workspace-desc {
          font-size: 0.8rem;
          color: var(--muted-text);
          margin-left: 1.5rem;
        }

        .account-tabs {
          display: flex;
          gap: 0.5rem;
          flex: 1;
          flex-wrap: wrap;
        }

        .account-tab {
          padding: 0.5rem 1rem;
          background: var(--dark-bg);
          border: 1px solid var(--dark-border);
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.2s;
        }

        .account-tab:hover {
          border-color: var(--primary-color);
          transform: translateY(-1px);
        }

        .account-tab.active {
          background: var(--primary-color);
          border-color: var(--primary-color);
          color: white;
        }

        .account-tab .platform-icon {
          font-size: 1.2rem;
        }

        .account-tab .account-username {
          font-size: 0.9rem;
        }

        .btn-icon {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          border: 1px solid var(--dark-border);
          background: var(--dark-bg);
          color: var(--light-text);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .btn-icon:hover {
          border-color: var(--primary-color);
          background: rgba(102, 126, 234, 0.1);
        }

        .account-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 0.5rem;
          padding-top: 1rem;
          border-top: 1px solid var(--dark-border);
        }

        .stat-item {
          text-align: center;
          padding: 0.5rem;
          background: var(--dark-bg);
          border-radius: 6px;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: bold;
          color: var(--primary-color);
        }

        .stat-label {
          font-size: 0.8rem;
          color: var(--muted-text);
        }

        .workspace-divider {
          height: 1px;
          background: var(--dark-border);
          margin: 0.5rem 0;
        }

        .workspace-action {
          padding: 0.75rem 1rem;
          color: var(--primary-color);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: background 0.2s;
        }

        .workspace-action:hover {
          background: rgba(102, 126, 234, 0.1);
        }
      </style>
    `;
  }

  renderWorkspaceMenu() {
    if (!this.workspaces || this.workspaces.length === 0) {
      return '<div class="workspace-item">No workspaces available</div>';
    }

    let html = '';
    
    // Existing workspaces
    for (const workspace of this.workspaces) {
      const isActive = workspace.id === this.currentWorkspace?.id;
      html += `
        <div class="workspace-item ${isActive ? 'active' : ''}" data-workspace-id="${workspace.id}">
          <span>💼</span>
          <div>
            <div>${workspace.name}</div>
            ${workspace.description ? `<div class="workspace-desc">${workspace.description}</div>` : ''}
          </div>
        </div>
      `;
    }
    
    // Add divider and actions
    html += `
      <div class="workspace-divider"></div>
      <div class="workspace-action" id="create-workspace-action">
        <span>➕</span>
        <span>Create New Workspace</span>
      </div>
      <div class="workspace-action" id="manage-workspaces-action">
        <span>⚙️</span>
        <span>Manage Workspaces</span>
      </div>
    `;
    
    return html;
  }

  renderAccountTabs() {
    if (!this.currentWorkspace?.accounts || this.currentWorkspace.accounts.length === 0) {
      return '<div style="color: var(--muted-text);">No accounts in this workspace</div>';
    }

    return this.currentWorkspace.accounts.map(account => {
      const isActive = account.id === this.currentAccount?.id;
      const icon = this.getPlatformIcon(account.platform);
      
      return `
        <div class="account-tab ${isActive ? 'active' : ''}" data-account-id="${account.id}">
          <span class="platform-icon">${icon}</span>
          <span class="account-username">${account.username}</span>
        </div>
      `;
    }).join('');
  }

  renderAccountStats() {
    if (!this.currentAccount) {
      return '<div style="color: var(--muted-text); text-align: center;">Select an account to view stats</div>';
    }

    return `
      <div class="stat-item">
        <div class="stat-value">${this.currentAccount.stats?.postsScheduled || 0}</div>
        <div class="stat-label">Scheduled</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${this.currentAccount.stats?.postsPublished || 0}</div>
        <div class="stat-label">Published</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${this.currentAccount.stats?.followerCount || 'N/A'}</div>
        <div class="stat-label">Followers</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${this.formatLastPost(this.currentAccount.stats?.lastPost)}</div>
        <div class="stat-label">Last Post</div>
      </div>
    `;
  }

  attachEventListeners() {
    // Workspace dropdown
    const dropdownBtn = document.getElementById('workspace-dropdown-btn');
    const menu = document.getElementById('workspace-menu');
    
    if (dropdownBtn && menu) {
      dropdownBtn.addEventListener('click', () => {
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
      });
      
      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!dropdownBtn.contains(e.target) && !menu.contains(e.target)) {
          menu.style.display = 'none';
        }
      });
    }
    
    // Workspace selection
    document.querySelectorAll('.workspace-item').forEach(item => {
      item.addEventListener('click', async () => {
        const workspaceId = item.dataset.workspaceId;
        if (workspaceId && workspaceId !== this.currentWorkspace?.id) {
          await this.switchWorkspace(workspaceId);
        }
      });
    });
    
    // Account selection
    document.querySelectorAll('.account-tab').forEach(tab => {
      tab.addEventListener('click', async () => {
        const accountId = tab.dataset.accountId;
        if (accountId && accountId !== this.currentAccount?.id) {
          await this.switchAccount(accountId);
        }
      });
    });
    
    // Add workspace button
    const addWorkspaceBtn = document.getElementById('add-workspace-btn');
    if (addWorkspaceBtn) {
      addWorkspaceBtn.addEventListener('click', () => this.createWorkspace());
    }
    
    // Add account button
    const addAccountBtn = document.getElementById('add-account-btn');
    if (addAccountBtn) {
      addAccountBtn.addEventListener('click', () => this.addAccount());
    }
    
    // Workspace settings button
    const settingsBtn = document.getElementById('workspace-settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => this.openWorkspaceSettings());
    }
    
    // Create workspace action
    const createAction = document.getElementById('create-workspace-action');
    if (createAction) {
      createAction.addEventListener('click', () => {
        document.getElementById('workspace-menu').style.display = 'none';
        this.createWorkspace();
      });
    }
    
    // Manage workspaces action
    const manageAction = document.getElementById('manage-workspaces-action');
    if (manageAction) {
      manageAction.addEventListener('click', () => {
        document.getElementById('workspace-menu').style.display = 'none';
        this.openWorkspaceManager();
      });
    }
  }

  async switchWorkspace(workspaceId) {
    try {
      await window.bufferKillerAPI.switchWorkspace(workspaceId);
      await this.loadWorkspaces();
      this.render();
      this.attachEventListeners();
      
      // Notify other components
      window.dispatchEvent(new CustomEvent('workspace-switched', { 
        detail: { workspace: this.currentWorkspace }
      }));
    } catch (error) {
      console.error('Failed to switch workspace:', error);
    }
  }

  async switchAccount(accountId) {
    try {
      await window.bufferKillerAPI.switchAccount(accountId);
      this.currentAccount = this.currentWorkspace.accounts.find(a => a.id === accountId);
      this.render();
      this.attachEventListeners();
      
      // Notify other components
      window.dispatchEvent(new CustomEvent('account-switched', { 
        detail: { account: this.currentAccount }
      }));
    } catch (error) {
      console.error('Failed to switch account:', error);
    }
  }

  async createWorkspace() {
    const name = prompt('Enter workspace name:');
    if (!name) return;
    
    const description = prompt('Enter workspace description (optional):');
    
    try {
      const workspace = await window.bufferKillerAPI.createWorkspace(name, description);
      await this.switchWorkspace(workspace.id);
    } catch (error) {
      console.error('Failed to create workspace:', error);
    }
  }

  async addAccount() {
    // This would open the account connection modal
    window.dispatchEvent(new CustomEvent('open-add-account-modal', {
      detail: { workspaceId: this.currentWorkspace.id }
    }));
  }

  openWorkspaceSettings() {
    // This would open workspace settings modal
    window.dispatchEvent(new CustomEvent('open-workspace-settings', {
      detail: { workspace: this.currentWorkspace }
    }));
  }

  openWorkspaceManager() {
    // This would open workspace manager modal
    window.dispatchEvent(new CustomEvent('open-workspace-manager'));
  }

  getPlatformIcon(platform) {
    const icons = {
      twitter: '🐦',
      linkedin: '💼',
      facebook: '📘',
      instagram: '📷',
      mastodon: '🐘',
      github: '🐙'
    };
    return icons[platform] || '📱';
  }

  formatLastPost(timestamp) {
    if (!timestamp) return 'Never';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AccountSwitcher;
}

// Create global instance
window.accountSwitcher = new AccountSwitcher();
