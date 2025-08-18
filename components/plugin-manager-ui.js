// Plugin Manager UI - Interface for managing plugins
class PluginManagerUI {
  constructor() {
    this.pluginSystem = window.pluginSystem;
    this.initialized = false;
  }

  async init() {
    if (!this.pluginSystem) {
      console.error('Plugin System not found');
      return;
    }

    // Initialize plugin system
    await this.pluginSystem.init();
    
    // Add plugins page to navigation
    this.addPluginsPage();
    
    this.initialized = true;
    console.log('Plugin Manager UI initialized');
  }

  addPluginsPage() {
    // Check if plugins page already exists
    if (document.getElementById('plugins-page')) return;

    // Create plugins page
    const content = document.querySelector('.content');
    if (!content) return;

    const pluginsPage = document.createElement('div');
    pluginsPage.id = 'plugins-page';
    pluginsPage.className = 'page';
    pluginsPage.style.display = 'none';
    pluginsPage.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
        <h2>🔌 Plugin Manager</h2>
        <div style="display: flex; gap: 1rem;">
          <button class="btn btn-secondary" onclick="pluginManagerUI.openPluginStore()">
            🛍️ Plugin Store
          </button>
          <button class="btn btn-primary" onclick="pluginManagerUI.installPlugin()">
            📦 Install Plugin
          </button>
        </div>
      </div>

      <!-- Installed Plugins -->
      <div class="installed-plugins" style="margin-bottom: 2rem;">
        <h3 style="margin-bottom: 1rem;">Installed Plugins</h3>
        <div id="installed-plugins-list" style="
          display: grid;
          gap: 1rem;
        ">
          <!-- Plugins will be listed here -->
        </div>
      </div>

      <!-- Available Plugins -->
      <div class="available-plugins">
        <h3 style="margin-bottom: 1rem;">Featured Plugins</h3>
        <div id="featured-plugins-list" style="
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1rem;
        ">
          <!-- Featured plugins will be listed here -->
        </div>
      </div>

      <!-- Plugin Development -->
      <div style="
        margin-top: 2rem;
        padding: 1.5rem;
        background: var(--dark-surface);
        border-radius: 8px;
      ">
        <h3 style="margin-bottom: 1rem;">🛠️ Plugin Development</h3>
        <p style="color: var(--muted-text); margin-bottom: 1rem;">
          Want to create your own plugin? Get started with our plugin development kit.
        </p>
        <div style="display: flex; gap: 1rem;">
          <button class="btn btn-secondary" onclick="pluginManagerUI.createPlugin()">
            ✨ Create New Plugin
          </button>
          <button class="btn btn-secondary" onclick="pluginManagerUI.openDocs()">
            📚 Documentation
          </button>
          <button class="btn btn-secondary" onclick="pluginManagerUI.openExamples()">
            💡 Examples
          </button>
        </div>
      </div>
    `;

    content.appendChild(pluginsPage);

    // Add navigation item
    const nav = document.querySelector('.sidebar nav');
    if (nav) {
      // Check if plugins nav item already exists
      if (!document.querySelector('[data-page="plugins"]')) {
        const templatesItem = document.querySelector('[data-page="templates"]');
        const pluginsNav = document.createElement('div');
        pluginsNav.className = 'nav-item';
        pluginsNav.dataset.page = 'plugins';
        pluginsNav.innerHTML = `
          <span class="nav-icon">🔌</span>
          <span>Plugins</span>
        `;
        
        // Insert before templates
        if (templatesItem) {
          nav.insertBefore(pluginsNav, templatesItem);
        } else {
          nav.appendChild(pluginsNav);
        }
        
        // Add click handler
        pluginsNav.addEventListener('click', () => {
          this.showPluginsPage();
        });
      }
    }

    // Load plugin lists
    this.loadInstalledPlugins();
    this.loadFeaturedPlugins();
  }

  showPluginsPage() {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
      page.style.display = 'none';
    });
    
    // Show plugins page
    document.getElementById('plugins-page').style.display = 'block';
    
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });
    document.querySelector('[data-page="plugins"]').classList.add('active');
    
    // Refresh plugin list
    this.loadInstalledPlugins();
  }

  loadInstalledPlugins() {
    const container = document.getElementById('installed-plugins-list');
    if (!container) return;

    const plugins = this.pluginSystem.getPlugins();
    
    if (plugins.length === 0) {
      container.innerHTML = `
        <div style="
          padding: 2rem;
          background: var(--dark-surface);
          border-radius: 8px;
          text-align: center;
          color: var(--muted-text);
        ">
          <p>No plugins installed yet.</p>
          <p style="margin-top: 1rem;">
            <button class="btn btn-primary" onclick="pluginManagerUI.openPluginStore()">
              Browse Plugin Store
            </button>
          </p>
        </div>
      `;
      return;
    }

    container.innerHTML = plugins.map(plugin => `
      <div class="plugin-card" style="
        background: var(--dark-surface);
        border-radius: 8px;
        padding: 1.5rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <div>
          <h4 style="margin: 0 0 0.5rem 0; color: var(--light-text);">
            ${plugin.name}
          </h4>
          <p style="color: var(--muted-text); margin: 0 0 0.5rem 0; font-size: 0.9rem;">
            ${plugin.description || 'No description'}
          </p>
          <div style="font-size: 0.85rem; color: var(--muted-text);">
            Version ${plugin.version} • By ${plugin.author}
          </div>
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <label class="switch" style="display: flex; align-items: center;">
            <input 
              type="checkbox" 
              ${plugin.enabled ? 'checked' : ''}
              onchange="pluginManagerUI.togglePlugin('${plugin.id}', this.checked)"
            >
            <span style="margin-left: 0.5rem;">
              ${plugin.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </label>
          <button 
            class="btn btn-small btn-secondary" 
            onclick="pluginManagerUI.configurePlugin('${plugin.id}')"
            title="Configure"
          >
            ⚙️
          </button>
          <button 
            class="btn btn-small btn-danger" 
            onclick="pluginManagerUI.uninstallPlugin('${plugin.id}')"
            title="Uninstall"
            style="background: var(--danger-color); color: white;"
          >
            🗑️
          </button>
        </div>
      </div>
    `).join('');
  }

  loadFeaturedPlugins() {
    const container = document.getElementById('featured-plugins-list');
    if (!container) return;

    // Sample featured plugins
    const featuredPlugins = [
      {
        id: 'auto-hashtag',
        name: 'Auto Hashtag Generator',
        description: 'Automatically generates relevant hashtags based on your content',
        author: 'Buffer Killer Team',
        downloads: 1234,
        rating: 4.5
      },
      {
        id: 'emoji-picker',
        name: 'Advanced Emoji Picker',
        description: 'Enhanced emoji picker with search and recent emojis',
        author: 'Community',
        downloads: 890,
        rating: 4.8
      },
      {
        id: 'analytics-plus',
        name: 'Analytics Plus',
        description: 'Advanced analytics with custom reports and exports',
        author: 'Buffer Killer Team',
        downloads: 567,
        rating: 4.3
      },
      {
        id: 'slack-integration',
        name: 'Slack Integration',
        description: 'Post to Slack channels and get notifications',
        author: 'Community',
        downloads: 445,
        rating: 4.6
      },
      {
        id: 'canva-templates',
        name: 'Canva Templates',
        description: 'Access Canva templates directly from Buffer Killer',
        author: 'Partner',
        downloads: 789,
        rating: 4.7
      },
      {
        id: 'ai-writer',
        name: 'AI Content Writer',
        description: 'Generate content ideas and posts with AI',
        author: 'Buffer Killer Team',
        downloads: 2345,
        rating: 4.4
      }
    ];

    container.innerHTML = featuredPlugins.map(plugin => `
      <div class="featured-plugin-card" style="
        background: var(--dark-surface);
        border-radius: 8px;
        padding: 1.5rem;
        border: 1px solid var(--dark-border);
        transition: all 0.2s;
        cursor: pointer;
      " onmouseover="this.style.borderColor='var(--primary-color)'" 
         onmouseout="this.style.borderColor='var(--dark-border)'">
        <h4 style="margin: 0 0 0.5rem 0; color: var(--light-text);">
          ${plugin.name}
        </h4>
        <p style="color: var(--muted-text); margin: 0 0 1rem 0; font-size: 0.9rem;">
          ${plugin.description}
        </p>
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        ">
          <span style="font-size: 0.85rem; color: var(--muted-text);">
            By ${plugin.author}
          </span>
          <div style="display: flex; gap: 0.5rem; align-items: center; font-size: 0.85rem;">
            <span>⭐ ${plugin.rating}</span>
            <span>📥 ${plugin.downloads}</span>
          </div>
        </div>
        <button 
          class="btn btn-primary" 
          style="width: 100%;"
          onclick="pluginManagerUI.installFeaturedPlugin('${plugin.id}')"
        >
          Install
        </button>
      </div>
    `).join('');
  }

  async togglePlugin(pluginId, enabled) {
    if (enabled) {
      this.pluginSystem.enablePlugin(pluginId);
      this.showNotification(`Plugin enabled`, 'success');
    } else {
      this.pluginSystem.disablePlugin(pluginId);
      this.showNotification(`Plugin disabled`, 'info');
    }
  }

  async configurePlugin(pluginId) {
    const plugin = this.pluginSystem.getPlugin(pluginId);
    if (!plugin) return;

    // Show configuration modal
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 600px;">
        <div class="modal-header">
          <h2>Configure ${plugin.name}</h2>
          <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
        </div>
        <div class="modal-body">
          <h4>Permissions</h4>
          <div style="margin-bottom: 1rem;">
            ${plugin.permissions.map(perm => `
              <span style="
                display: inline-block;
                padding: 0.25rem 0.5rem;
                background: var(--primary-color);
                color: white;
                border-radius: 4px;
                margin: 0.25rem;
                font-size: 0.85rem;
              ">${perm}</span>
            `).join('')}
          </div>
          
          <h4>Plugin Info</h4>
          <table style="width: 100%; margin-bottom: 1rem;">
            <tr>
              <td style="padding: 0.5rem 0; color: var(--muted-text);">Version:</td>
              <td style="padding: 0.5rem 0;">${plugin.version}</td>
            </tr>
            <tr>
              <td style="padding: 0.5rem 0; color: var(--muted-text);">Author:</td>
              <td style="padding: 0.5rem 0;">${plugin.author}</td>
            </tr>
            <tr>
              <td style="padding: 0.5rem 0; color: var(--muted-text);">Path:</td>
              <td style="padding: 0.5rem 0;"><code>${plugin.path}</code></td>
            </tr>
          </table>
          
          <div style="display: flex; gap: 1rem; justify-content: flex-end;">
            <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
              Close
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  async uninstallPlugin(pluginId) {
    if (confirm('Are you sure you want to uninstall this plugin?')) {
      await this.pluginSystem.unloadPlugin(pluginId);
      this.loadInstalledPlugins();
      this.showNotification('Plugin uninstalled', 'success');
    }
  }

  async installPlugin() {
    // Show install modal
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
          <h2>Install Plugin</h2>
          <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
        </div>
        <div class="modal-body">
          <p style="margin-bottom: 1rem;">
            Install a plugin from a ZIP file or GitHub repository.
          </p>
          
          <div style="margin-bottom: 1.5rem;">
            <h4>From File</h4>
            <input type="file" accept=".zip" id="plugin-file" style="
              width: 100%;
              padding: 0.5rem;
              background: var(--dark-bg);
              color: var(--light-text);
              border: 1px solid var(--dark-border);
              border-radius: 4px;
            ">
          </div>
          
          <div style="margin-bottom: 1.5rem;">
            <h4>From URL</h4>
            <input type="url" id="plugin-url" placeholder="https://github.com/user/plugin" style="
              width: 100%;
              padding: 0.5rem;
              background: var(--dark-bg);
              color: var(--light-text);
              border: 1px solid var(--dark-border);
              border-radius: 4px;
            ">
          </div>
          
          <div style="display: flex; gap: 1rem; justify-content: flex-end;">
            <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
              Cancel
            </button>
            <button class="btn btn-primary" onclick="pluginManagerUI.performInstall()">
              Install
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  async performInstall() {
    const fileInput = document.getElementById('plugin-file');
    const urlInput = document.getElementById('plugin-url');
    
    if (fileInput && fileInput.files[0]) {
      // Install from file
      this.showNotification('Installing plugin from file...', 'info');
      // Implementation would unzip and install
      setTimeout(() => {
        this.showNotification('Plugin installed successfully!', 'success');
        document.querySelector('.modal').remove();
        this.loadInstalledPlugins();
      }, 2000);
    } else if (urlInput && urlInput.value) {
      // Install from URL
      this.showNotification('Downloading plugin...', 'info');
      // Implementation would download and install
      setTimeout(() => {
        this.showNotification('Plugin installed successfully!', 'success');
        document.querySelector('.modal').remove();
        this.loadInstalledPlugins();
      }, 2000);
    } else {
      this.showNotification('Please select a file or enter a URL', 'warning');
    }
  }

  async installFeaturedPlugin(pluginId) {
    this.showNotification(`Installing ${pluginId}...`, 'info');
    
    // Simulate installation
    setTimeout(() => {
      this.showNotification('Plugin installed successfully!', 'success');
      this.loadInstalledPlugins();
    }, 2000);
  }

  openPluginStore() {
    this.showNotification('Plugin Store coming soon!', 'info');
  }

  createPlugin() {
    // Show plugin creation wizard
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 600px;">
        <div class="modal-header">
          <h2>Create New Plugin</h2>
          <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
        </div>
        <div class="modal-body">
          <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem;">Plugin Name</label>
            <input type="text" id="plugin-name" placeholder="My Awesome Plugin" style="
              width: 100%;
              padding: 0.5rem;
              background: var(--dark-bg);
              color: var(--light-text);
              border: 1px solid var(--dark-border);
              border-radius: 4px;
            ">
          </div>
          
          <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem;">Plugin ID</label>
            <input type="text" id="plugin-id" placeholder="my-awesome-plugin" style="
              width: 100%;
              padding: 0.5rem;
              background: var(--dark-bg);
              color: var(--light-text);
              border: 1px solid var(--dark-border);
              border-radius: 4px;
            ">
          </div>
          
          <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem;">Description</label>
            <textarea id="plugin-desc" placeholder="What does your plugin do?" style="
              width: 100%;
              padding: 0.5rem;
              background: var(--dark-bg);
              color: var(--light-text);
              border: 1px solid var(--dark-border);
              border-radius: 4px;
              min-height: 80px;
            "></textarea>
          </div>
          
          <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem;">Permissions Needed</label>
            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
              ${['storage', 'notifications', 'scheduling', 'ui', 'data', 'network'].map(perm => `
                <label style="display: flex; align-items: center;">
                  <input type="checkbox" value="${perm}" class="plugin-permission">
                  <span style="margin-left: 0.5rem;">${perm}</span>
                </label>
              `).join('')}
            </div>
          </div>
          
          <div style="display: flex; gap: 1rem; justify-content: flex-end;">
            <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
              Cancel
            </button>
            <button class="btn btn-primary" onclick="pluginManagerUI.generatePlugin()">
              Generate Plugin
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  generatePlugin() {
    const name = document.getElementById('plugin-name').value;
    const id = document.getElementById('plugin-id').value;
    const desc = document.getElementById('plugin-desc').value;
    const permissions = Array.from(document.querySelectorAll('.plugin-permission:checked'))
      .map(cb => cb.value);
    
    if (!name || !id) {
      this.showNotification('Please fill in required fields', 'warning');
      return;
    }

    // Generate plugin scaffold
    const manifest = {
      id: id,
      name: name,
      version: '1.0.0',
      author: 'Your Name',
      description: desc,
      main: 'index.js',
      permissions: permissions,
      requires: '1.0.0'
    };

    const pluginCode = `// ${name} Plugin
class ${id.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('')}Plugin {
  constructor(api) {
    this.api = api;
    this.name = '${name}';
  }

  async onLoad() {
    console.log('${name} loaded!');
    
    // Add UI elements
    this.api.ui.addMenuItem({
      label: '${name}',
      icon: '🔌',
      onClick: () => this.showPanel()
    });
    
    // Register hooks
    this.api.hooks.on('composer-opened', () => {
      console.log('Composer opened!');
    });
  }

  async onEnable() {
    console.log('${name} enabled!');
  }

  async onDisable() {
    console.log('${name} disabled!');
  }

  async onUnload() {
    console.log('${name} unloaded!');
  }
  
  showPanel() {
    this.api.ui.showModal({
      title: '${name}',
      body: '<p>Your plugin content here!</p>',
      footer: '<button class="btn btn-primary" onclick="this.closest(\`.modal\`).remove()">Close</button>'
    });
  }
}

// Export for plugin system
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ${id.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('')}Plugin;
}`;

    // Show generated code
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 800px;">
        <div class="modal-header">
          <h2>Generated Plugin Code</h2>
          <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
        </div>
        <div class="modal-body">
          <h4>manifest.json</h4>
          <pre style="
            background: var(--dark-bg);
            padding: 1rem;
            border-radius: 4px;
            overflow-x: auto;
          "><code>${JSON.stringify(manifest, null, 2)}</code></pre>
          
          <h4>index.js</h4>
          <pre style="
            background: var(--dark-bg);
            padding: 1rem;
            border-radius: 4px;
            overflow-x: auto;
          "><code>${pluginCode}</code></pre>
          
          <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1rem;">
            <button class="btn btn-secondary" onclick="pluginManagerUI.copyPluginCode('${btoa(JSON.stringify({manifest, code: pluginCode}))}')">
              📋 Copy All
            </button>
            <button class="btn btn-primary" onclick="this.closest('.modal').remove()">
              Done
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Close previous modal
    document.querySelectorAll('.modal').forEach(m => {
      if (!m.innerHTML.includes('Generated Plugin Code')) {
        m.remove();
      }
    });
    
    document.body.appendChild(modal);
  }

  copyPluginCode(encodedData) {
    const data = JSON.parse(atob(encodedData));
    const text = `// manifest.json\n${JSON.stringify(data.manifest, null, 2)}\n\n// index.js\n${data.code}`;
    
    navigator.clipboard.writeText(text);
    this.showNotification('Plugin code copied to clipboard!', 'success');
  }

  openDocs() {
    this.showNotification('Opening plugin documentation...', 'info');
    // Would open documentation
  }

  openExamples() {
    this.showNotification('Loading example plugins...', 'info');
    // Would show examples
  }

  showNotification(message, type = 'info') {
    if (typeof showNotification === 'function') {
      showNotification(message, type);
    } else {
      console.log(`[${type}] ${message}`);
    }
  }
}

// Initialize plugin manager UI
const pluginManagerUI = new PluginManagerUI();

// Auto-init on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    pluginManagerUI.init();
  });
} else {
  pluginManagerUI.init();
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PluginManagerUI;
}