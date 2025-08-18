// Plugin System Core - Foundation for extensibility
class PluginSystem {
  constructor() {
    this.plugins = new Map();
    this.hooks = new Map();
    this.apis = new Map();
    this.sandboxes = new Map();
    this.config = {
      pluginsDir: 'plugins',
      autoLoad: true,
      sandboxed: true,
      maxMemory: 50 * 1024 * 1024, // 50MB per plugin
      timeout: 30000, // 30 seconds max execution
      allowedAPIs: [
        'storage',
        'notifications',
        'scheduling',
        'ui',
        'data',
        'network'
      ]
    };
  }

  // Initialize plugin system
  async init() {
    console.log('Initializing Plugin System...');
    
    // Set up core APIs
    this.registerCoreAPIs();
    
    // Set up hooks
    this.registerCoreHooks();
    
    // Load installed plugins
    if (this.config.autoLoad) {
      await this.loadInstalledPlugins();
    }
    
    console.log(`Plugin System ready. ${this.plugins.size} plugins loaded.`);
  }

  // Register core APIs that plugins can use
  registerCoreAPIs() {
    // Storage API
    this.apis.set('storage', {
      get: async (key) => {
        return localStorage.getItem(`plugin_${key}`);
      },
      set: async (key, value) => {
        localStorage.setItem(`plugin_${key}`, value);
      },
      remove: async (key) => {
        localStorage.removeItem(`plugin_${key}`);
      }
    });

    // Notifications API
    this.apis.set('notifications', {
      show: (message, type = 'info') => {
        if (typeof showNotification === 'function') {
          showNotification(message, type);
        }
      },
      toast: (message, duration = 3000) => {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = 'plugin-toast';
        toast.textContent = message;
        toast.style.cssText = `
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: var(--primary-color);
          color: white;
          padding: 12px 20px;
          border-radius: 6px;
          z-index: 10000;
          animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), duration);
      }
    });

    // Scheduling API
    this.apis.set('scheduling', {
      schedulePost: async (postData) => {
        if (window.bufferKillerAPI) {
          return await window.bufferKillerAPI.schedulePost(postData);
        }
      },
      getScheduledPosts: async () => {
        if (window.bufferKillerAPI) {
          return await window.bufferKillerAPI.getScheduledPosts();
        }
      }
    });

    // UI API
    this.apis.set('ui', {
      addMenuItem: (item) => {
        this.addUIMenuItem(item);
      },
      addToolbarButton: (button) => {
        this.addUIToolbarButton(button);
      },
      addPanel: (panel) => {
        this.addUIPanel(panel);
      },
      showModal: (content) => {
        this.showUIModal(content);
      }
    });

    // Data API
    this.apis.set('data', {
      getPosts: async () => {
        if (window.bufferKillerAPI) {
          return await window.bufferKillerAPI.getScheduledPosts();
        }
      },
      getAccounts: async () => {
        if (window.bufferKillerAPI) {
          return await window.bufferKillerAPI.getAccounts();
        }
      },
      getAnalytics: async () => {
        // Return analytics data
        return {};
      }
    });

    // Network API (restricted)
    this.apis.set('network', {
      fetch: async (url, options = {}) => {
        // Restricted fetch - only allow certain domains
        const allowedDomains = [
          'api.github.com',
          'api.twitter.com',
          'graph.facebook.com',
          'api.linkedin.com'
        ];
        
        const urlObj = new URL(url);
        if (!allowedDomains.some(domain => urlObj.hostname.includes(domain))) {
          throw new Error(`Network access to ${urlObj.hostname} not allowed`);
        }
        
        return await fetch(url, options);
      }
    });
  }

  // Register core hooks that plugins can listen to
  registerCoreHooks() {
    const coreHooks = [
      'before-post-schedule',
      'after-post-schedule',
      'before-post-publish',
      'after-post-publish',
      'account-connected',
      'account-disconnected',
      'composer-opened',
      'composer-submitted',
      'app-startup',
      'app-shutdown'
    ];

    coreHooks.forEach(hook => {
      this.hooks.set(hook, new Set());
    });
  }

  // Load a plugin from directory
  async loadPlugin(pluginPath) {
    try {
      // Read plugin manifest
      const manifestPath = `${pluginPath}/manifest.json`;
      const manifestResponse = await fetch(manifestPath);
      const manifest = await manifestResponse.json();

      // Validate manifest
      if (!this.validateManifest(manifest)) {
        throw new Error('Invalid plugin manifest');
      }

      // Check version compatibility
      if (!this.checkCompatibility(manifest)) {
        throw new Error(`Plugin requires Buffer Killer version ${manifest.requires}`);
      }

      // Create plugin instance
      const plugin = {
        id: manifest.id,
        name: manifest.name,
        version: manifest.version,
        author: manifest.author,
        description: manifest.description,
        permissions: manifest.permissions || [],
        enabled: true,
        path: pluginPath,
        manifest: manifest,
        instance: null,
        sandbox: null
      };

      // Create sandbox if enabled
      if (this.config.sandboxed) {
        plugin.sandbox = this.createSandbox(plugin);
      }

      // Load plugin code
      const mainPath = `${pluginPath}/${manifest.main || 'index.js'}`;
      
      if (this.config.sandboxed) {
        // Load in sandbox
        await this.loadInSandbox(plugin, mainPath);
      } else {
        // Load directly (less secure)
        const module = await import(mainPath);
        plugin.instance = new module.default(this.getPluginAPI(plugin));
      }

      // Initialize plugin
      if (plugin.instance && plugin.instance.onLoad) {
        await plugin.instance.onLoad();
      }

      // Store plugin
      this.plugins.set(plugin.id, plugin);
      
      console.log(`Loaded plugin: ${plugin.name} v${plugin.version}`);
      return plugin;

    } catch (error) {
      console.error(`Failed to load plugin from ${pluginPath}:`, error);
      throw error;
    }
  }

  // Validate plugin manifest
  validateManifest(manifest) {
    const required = ['id', 'name', 'version', 'author'];
    return required.every(field => manifest[field]);
  }

  // Check version compatibility
  checkCompatibility(manifest) {
    if (!manifest.requires) return true;
    
    const appVersion = '1.0.0'; // Current Buffer Killer version
    const requiredVersion = manifest.requires;
    
    // Simple version comparison (could be improved)
    return appVersion >= requiredVersion;
  }

  // Create sandbox for plugin
  createSandbox(plugin) {
    // Create iframe sandbox
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.sandbox = 'allow-scripts';
    document.body.appendChild(iframe);

    // Set up communication channel
    const channel = new MessageChannel();
    
    // Handle messages from plugin
    channel.port1.onmessage = (event) => {
      this.handleSandboxMessage(plugin, event.data);
    };

    // Store sandbox info
    const sandbox = {
      iframe: iframe,
      window: iframe.contentWindow,
      channel: channel,
      port: channel.port2
    };

    this.sandboxes.set(plugin.id, sandbox);
    return sandbox;
  }

  // Load plugin in sandbox
  async loadInSandbox(plugin, scriptPath) {
    const sandbox = plugin.sandbox;
    if (!sandbox) return;

    // Inject plugin API into sandbox
    const apiScript = `
      window.BufferKillerPlugin = {
        id: '${plugin.id}',
        api: {
          // Proxied API calls
          call: function(api, method, ...args) {
            window.parent.postMessage({
              type: 'api-call',
              api: api,
              method: method,
              args: args
            }, '*');
          }
        }
      };
    `;

    sandbox.window.eval(apiScript);

    // Load plugin script
    const response = await fetch(scriptPath);
    const code = await response.text();
    
    // Wrap in try-catch for error handling
    const wrappedCode = `
      try {
        ${code}
      } catch (error) {
        window.parent.postMessage({
          type: 'error',
          error: error.message
        }, '*');
      }
    `;

    sandbox.window.eval(wrappedCode);
  }

  // Handle messages from sandboxed plugin
  handleSandboxMessage(plugin, data) {
    switch (data.type) {
      case 'api-call':
        this.handleAPICall(plugin, data.api, data.method, data.args);
        break;
      case 'error':
        console.error(`Plugin ${plugin.id} error:`, data.error);
        break;
      case 'log':
        console.log(`[${plugin.id}]`, data.message);
        break;
    }
  }

  // Handle API call from plugin
  async handleAPICall(plugin, apiName, method, args) {
    // Check permissions
    if (!plugin.permissions.includes(apiName)) {
      console.error(`Plugin ${plugin.id} does not have permission for ${apiName}`);
      return;
    }

    const api = this.apis.get(apiName);
    if (!api || !api[method]) {
      console.error(`Invalid API call: ${apiName}.${method}`);
      return;
    }

    try {
      const result = await api[method](...args);
      
      // Send result back to plugin
      if (plugin.sandbox) {
        plugin.sandbox.window.postMessage({
          type: 'api-result',
          result: result
        }, '*');
      }
    } catch (error) {
      console.error(`API call failed:`, error);
    }
  }

  // Get API for non-sandboxed plugins
  getPluginAPI(plugin) {
    const api = {};
    
    plugin.permissions.forEach(permission => {
      if (this.apis.has(permission)) {
        api[permission] = this.apis.get(permission);
      }
    });

    // Add hook registration
    api.hooks = {
      on: (hook, callback) => {
        this.registerHook(plugin.id, hook, callback);
      },
      off: (hook, callback) => {
        this.unregisterHook(plugin.id, hook, callback);
      }
    };

    return api;
  }

  // Register hook listener
  registerHook(pluginId, hook, callback) {
    if (!this.hooks.has(hook)) {
      this.hooks.set(hook, new Set());
    }
    
    this.hooks.get(hook).add({
      pluginId: pluginId,
      callback: callback
    });
  }

  // Trigger hook
  async triggerHook(hook, data = {}) {
    const listeners = this.hooks.get(hook);
    if (!listeners) return data;

    for (const listener of listeners) {
      try {
        const plugin = this.plugins.get(listener.pluginId);
        if (plugin && plugin.enabled) {
          data = await listener.callback(data) || data;
        }
      } catch (error) {
        console.error(`Hook error in plugin ${listener.pluginId}:`, error);
      }
    }

    return data;
  }

  // Load all installed plugins
  async loadInstalledPlugins() {
    try {
      // Get list of plugin directories
      const pluginDirs = await this.getPluginDirectories();
      
      for (const dir of pluginDirs) {
        try {
          await this.loadPlugin(`${this.config.pluginsDir}/${dir}`);
        } catch (error) {
          console.error(`Failed to load plugin ${dir}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to load installed plugins:', error);
    }
  }

  // Get list of plugin directories
  async getPluginDirectories() {
    // In a real implementation, this would read from file system
    // For now, return empty array or predefined list
    return [];
  }

  // Enable a plugin
  enablePlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.enabled = true;
      if (plugin.instance && plugin.instance.onEnable) {
        plugin.instance.onEnable();
      }
    }
  }

  // Disable a plugin
  disablePlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.enabled = false;
      if (plugin.instance && plugin.instance.onDisable) {
        plugin.instance.onDisable();
      }
    }
  }

  // Unload a plugin
  async unloadPlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    // Call cleanup
    if (plugin.instance && plugin.instance.onUnload) {
      await plugin.instance.onUnload();
    }

    // Remove sandbox
    if (plugin.sandbox) {
      plugin.sandbox.iframe.remove();
      this.sandboxes.delete(pluginId);
    }

    // Remove from registry
    this.plugins.delete(pluginId);
    
    console.log(`Unloaded plugin: ${plugin.name}`);
  }

  // Get all plugins
  getPlugins() {
    return Array.from(this.plugins.values());
  }

  // Get plugin by ID
  getPlugin(pluginId) {
    return this.plugins.get(pluginId);
  }

  // UI Helper Methods
  addUIMenuItem(item) {
    const nav = document.querySelector('.sidebar nav');
    if (!nav) return;

    const menuItem = document.createElement('div');
    menuItem.className = 'nav-item';
    menuItem.innerHTML = `
      <span class="nav-icon">${item.icon || '🔌'}</span>
      <span>${item.label}</span>
    `;
    menuItem.onclick = item.onClick;
    nav.appendChild(menuItem);
  }

  addUIToolbarButton(button) {
    const toolbar = document.querySelector('.header-actions');
    if (!toolbar) return;

    const btn = document.createElement('button');
    btn.className = 'btn btn-secondary';
    btn.innerHTML = `${button.icon || ''} ${button.label}`;
    btn.onclick = button.onClick;
    toolbar.appendChild(btn);
  }

  addUIPanel(panel) {
    const content = document.querySelector('.content');
    if (!content) return;

    const panelDiv = document.createElement('div');
    panelDiv.className = 'plugin-panel';
    panelDiv.style.display = 'none';
    panelDiv.innerHTML = panel.content;
    content.appendChild(panelDiv);

    // Add navigation item
    this.addUIMenuItem({
      label: panel.title,
      icon: panel.icon,
      onClick: () => {
        // Hide other panels
        document.querySelectorAll('.page, .plugin-panel').forEach(p => {
          p.style.display = 'none';
        });
        panelDiv.style.display = 'block';
      }
    });
  }

  showUIModal(content) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>${content.title || 'Plugin'}</h2>
          <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
        </div>
        <div class="modal-body">
          ${content.body}
        </div>
        ${content.footer ? `
          <div class="modal-footer">
            ${content.footer}
          </div>
        ` : ''}
      </div>
    `;
    document.body.appendChild(modal);
  }
}

// Create global instance
window.pluginSystem = new PluginSystem();

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PluginSystem;
}