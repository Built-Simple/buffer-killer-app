// Preload script - Secure bridge between main and renderer processes
// This runs in an isolated context with access to limited Node.js APIs

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process
// to communicate with the main process securely
contextBridge.exposeInMainWorld('bufferKillerAPI', {
  // Post Management
  schedulePost: async (postData) => {
    return await ipcRenderer.invoke('schedule-post', postData);
  },
  
  postNow: async (content, platforms, selectedAccounts) => {
    return await ipcRenderer.invoke('post-now', content, platforms, selectedAccounts);
  },
  
  getScheduledPosts: async () => {
    return await ipcRenderer.invoke('get-scheduled-posts');
  },
  
  deletePost: async (postId) => {
    return await ipcRenderer.invoke('delete-post', postId);
  },
  
  updatePost: async (postId, postData) => {
    return await ipcRenderer.invoke('update-post', postId, postData);
  },
  
  // Draft Management
  createDraft: async (draftData) => {
    return await ipcRenderer.invoke('create-draft', draftData);
  },
  
  getDrafts: async (options) => {
    return await ipcRenderer.invoke('get-drafts', options);
  },
  
  getDraft: async (draftId) => {
    return await ipcRenderer.invoke('get-draft', draftId);
  },
  
  updateDraft: async (draftId, updates) => {
    return await ipcRenderer.invoke('update-draft', draftId, updates);
  },
  
  deleteDraft: async (draftId) => {
    return await ipcRenderer.invoke('delete-draft', draftId);
  },
  
  publishDraft: async (draftId, scheduledTime) => {
    return await ipcRenderer.invoke('publish-draft', draftId, scheduledTime);
  },
  
  duplicateDraft: async (draftId) => {
    return await ipcRenderer.invoke('duplicate-draft', draftId);
  },
  
  searchDrafts: async (searchTerm) => {
    return await ipcRenderer.invoke('search-drafts', searchTerm);
  },
  
  autoSaveDraft: async (draftId, content, platforms) => {
    return await ipcRenderer.invoke('auto-save-draft', draftId, content, platforms);
  },
  
  getDraftStats: async () => {
    return await ipcRenderer.invoke('get-draft-stats');
  },
  
  // Media handling
  selectMediaFiles: async () => {
    return await ipcRenderer.invoke('select-media-files');
  },
  
  // CSV Import/Export
  importCSV: async () => {
    return await ipcRenderer.invoke('import-csv');
  },
  
  exportCSV: async () => {
    return await ipcRenderer.invoke('export-csv');
  },
  
  downloadCSVTemplate: async () => {
    return await ipcRenderer.invoke('download-csv-template');
  },
  
  // Platform Authentication
  authenticatePlatform: async (platform, options) => {
    return await ipcRenderer.invoke('authenticate-platform', platform, options);
  },
  
  disconnectPlatform: async (platform) => {
    return await ipcRenderer.invoke('disconnect-platform', platform);
  },
  
  getAccounts: async () => {
    return await ipcRenderer.invoke('get-accounts');
  },
  
  // FIXED: Added missing account methods
  addAccount: async (platform, username, instance, data) => {
    return await ipcRenderer.invoke('add-account', platform, username, instance, data);
  },
  
  removeAccount: async (accountId) => {
    return await ipcRenderer.invoke('remove-account', accountId);
  },
  
  getCurrentWorkspace: async () => {
    return await ipcRenderer.invoke('get-current-workspace');
  },
  
  removeAccountFromWorkspace: async (workspaceId, accountId) => {
    return await ipcRenderer.invoke('remove-account-from-workspace', workspaceId, accountId);
  },
  
  // Secure Token Management
  storeToken: async (platform, token) => {
    return await ipcRenderer.invoke('store-token', { platform, token });
  },
  
  // Analytics
  getAnalytics: async (timeRange) => {
    return await ipcRenderer.invoke('get-analytics', timeRange);
  },
  
  // Templates
  getTemplates: async () => {
    return await ipcRenderer.invoke('get-templates');
  },
  
  saveTemplate: async (template) => {
    return await ipcRenderer.invoke('save-template', template);
  },
  
  // Image Generation
  generateImage: async (text, templateId) => {
    return await ipcRenderer.invoke('generate-image', { text, templateId });
  },
  
  // Settings
  getSettings: async () => {
    return await ipcRenderer.invoke('get-settings');
  },
  
  updateSettings: async (settings) => {
    return await ipcRenderer.invoke('update-settings', settings);
  },
  
  testApiCredentials: async (platform) => {
    return await ipcRenderer.invoke('test-api-credentials', platform);
  },
  
  getPlatformStatus: async () => {
    return await ipcRenderer.invoke('get-platform-status');
  },
  
  // Rate Limiting
  getRateLimitStats: async () => {
    return await ipcRenderer.invoke('get-rate-limit-stats');
  },
  
  resetRateLimits: async (platform, accountId) => {
    return await ipcRenderer.invoke('reset-rate-limits', platform, accountId);
  },
  
  checkRateLimits: async (platform, accountId) => {
    return await ipcRenderer.invoke('check-rate-limits', platform, accountId);
  },
  
  // Queue Monitoring (Multi-Account) - ARCHIVED
  // These were part of the overengineered system - keeping for compatibility
  getQueueStats: async () => {
    console.warn('Queue stats deprecated - use workspace analytics instead');
    return [];
  },
  
  // Workspace Management (NEW - Actually useful!)
  getWorkspaces: async () => {
    return await ipcRenderer.invoke('workspace:get-all');
  },
  
  createWorkspace: async (name, description) => {
    return await ipcRenderer.invoke('workspace:create', name, description);
  },
  
  switchWorkspace: async (workspaceId) => {
    return await ipcRenderer.invoke('workspace:switch', workspaceId);
  },
  
  deleteWorkspace: async (workspaceId) => {
    return await ipcRenderer.invoke('workspace:delete', workspaceId);
  },
  
  renameWorkspace: async (workspaceId, newName) => {
    return await ipcRenderer.invoke('workspace:rename', workspaceId, newName);
  },
  
  getWorkspaceAccounts: async (workspaceId) => {
    return await ipcRenderer.invoke('workspace:get-accounts', workspaceId);
  },
  
  getWorkspaceAnalytics: async (workspaceId) => {
    return await ipcRenderer.invoke('workspace:analytics', workspaceId);
  },
  
  exportWorkspace: async (workspaceId) => {
    return await ipcRenderer.invoke('workspace:export', workspaceId);
  },
  
  cloneWorkspace: async (workspaceId, newName) => {
    return await ipcRenderer.invoke('workspace:clone', workspaceId, newName);
  },
  
  // Account Management (NEW)
  addAccountToWorkspace: async (workspaceId, accountData) => {
    return await ipcRenderer.invoke('account:add-to-workspace', workspaceId, accountData);
  },
  
  switchAccount: async (accountId) => {
    return await ipcRenderer.invoke('account:switch', accountId);
  },
  
  getAccountPosts: async (accountId, status) => {
    return await ipcRenderer.invoke('account:get-posts', accountId, status);
  },
  
  schedulePostForAccount: async (accountId, postData) => {
    return await ipcRenderer.invoke('account:schedule-post', accountId, postData);
  },
  
  getActiveContext: async () => {
    return await ipcRenderer.invoke('account:get-active');
  },
  
  // Rate Limiting (Per Account - Practical!)
  getAccountRateLimit: async (accountId, platform) => {
    return await ipcRenderer.invoke('rate-limit:status', accountId, platform);
  },
  
  getAllRateLimits: async () => {
    return await ipcRenderer.invoke('rate-limit:all-statuses');
  },
  
  clearAccountQueue: async (accountId) => {
    return await ipcRenderer.invoke('rate-limit:clear-queue', accountId);
  },
  
  resetAccountRateLimit: async (accountId) => {
    return await ipcRenderer.invoke('rate-limit:reset', accountId);
  },
  
  // Event Listeners
  onPostPublished: (callback) => {
    ipcRenderer.on('post-published', (event, data) => callback(data));
  },
  
  onRateLimitWarning: (callback) => {
    ipcRenderer.on('rate-limit-warning', (event, data) => callback(data));
  },
  
  onAuthenticationSuccess: (callback) => {
    ipcRenderer.on('auth-success', (event, data) => callback(data));
  },
  
  onAuthenticationError: (callback) => {
    ipcRenderer.on('auth-error', (event, data) => callback(data));
  },
  
  // Remove event listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
  
  // System
  getAppVersion: async () => {
    return await ipcRenderer.invoke('get-app-version');
  },
  
  // Debug helpers
  debugAuthFlows: async () => {
    return await ipcRenderer.invoke('debug-auth-flows');
  },
  
  checkForUpdates: async () => {
    return await ipcRenderer.invoke('check-for-updates');
  },
  
  openExternalLink: (url) => {
    ipcRenderer.send('open-external-link', url);
  }
});

// Log that preload script has loaded successfully
console.log('Preload script loaded successfully');