// Settings Manager - Handles API keys and configuration
// Securely manages .env file updates from the UI

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class SettingsManager {
  constructor(envPath) {
    this.envPath = envPath || path.join(__dirname, '../../../.env');
    this.settings = {};
    this.loadSettings();
  }

  // Load settings from .env file
  async loadSettings() {
    try {
      const envContent = await fs.readFile(this.envPath, 'utf8');
      const lines = envContent.split('\n');
      
      for (const line of lines) {
        // Skip comments and empty lines
        if (line.startsWith('#') || line.trim() === '') continue;
        
        const [key, ...valueParts] = line.split('=');
        if (key) {
          this.settings[key.trim()] = valueParts.join('=').trim();
        }
      }
      
      return this.settings;
    } catch (error) {
      console.error('Error loading settings:', error);
      // If .env doesn't exist, create it from template
      await this.createEnvFromTemplate();
      return this.settings;
    }
  }

  // Create .env from template if it doesn't exist
  async createEnvFromTemplate() {
    try {
      const templatePath = path.join(__dirname, '../../../.env.template');
      const templateContent = await fs.readFile(templatePath, 'utf8');
      await fs.writeFile(this.envPath, templateContent);
      await this.loadSettings();
    } catch (error) {
      console.error('Error creating .env from template:', error);
    }
  }

  // Get a setting value
  get(key) {
    return this.settings[key];
  }

  // Set a setting value
  async set(key, value) {
    this.settings[key] = value;
    await this.saveSettings();
  }

  // Update multiple settings at once
  async updateMultiple(updates) {
    for (const [key, value] of Object.entries(updates)) {
      this.settings[key] = value;
    }
    await this.saveSettings();
  }

  // Save settings back to .env file
  async saveSettings() {
    try {
      // Read current .env to preserve comments and structure
      let envContent = '';
      try {
        envContent = await fs.readFile(this.envPath, 'utf8');
      } catch {
        // File doesn't exist, we'll create it
        envContent = await this.generateEnvContent();
        await fs.writeFile(this.envPath, envContent);
        return;
      }

      // Update existing values
      const lines = envContent.split('\n');
      const updatedLines = lines.map(line => {
        if (line.startsWith('#') || line.trim() === '') {
          return line; // Keep comments and empty lines
        }
        
        const [key] = line.split('=');
        if (key && this.settings[key.trim()] !== undefined) {
          return `${key.trim()}=${this.settings[key.trim()]}`;
        }
        
        return line;
      });

      // Add new keys that don't exist
      const existingKeys = new Set();
      lines.forEach(line => {
        if (!line.startsWith('#') && line.includes('=')) {
          const [key] = line.split('=');
          existingKeys.add(key.trim());
        }
      });

      for (const [key, value] of Object.entries(this.settings)) {
        if (!existingKeys.has(key)) {
          updatedLines.push(`${key}=${value}`);
        }
      }

      await fs.writeFile(this.envPath, updatedLines.join('\n'));
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }

  // Generate .env content from scratch
  async generateEnvContent() {
    return `# Buffer Killer App - Environment Variables
# IMPORTANT: Fill in your actual API keys below!

# Node Environment
NODE_ENV=${this.settings.NODE_ENV || 'development'}
ELECTRON_IS_DEV=${this.settings.ELECTRON_IS_DEV || '1'}

# Database
DATABASE_PATH=${this.settings.DATABASE_PATH || './db/database.json'}

# OAuth Server Settings
OAUTH_PORT=${this.settings.OAUTH_PORT || '3000'}
OAUTH_HOST=${this.settings.OAUTH_HOST || '127.0.0.1'}

# ============================================
# TWITTER/X API
# ============================================
TWITTER_CLIENT_ID=${this.settings.TWITTER_CLIENT_ID || ''}
TWITTER_CLIENT_SECRET=${this.settings.TWITTER_CLIENT_SECRET || ''}
TWITTER_CALLBACK_URL=${this.settings.TWITTER_CALLBACK_URL || 'http://127.0.0.1:3000/auth/twitter/callback'}

# ============================================
# GITHUB API
# ============================================
GITHUB_CLIENT_ID=${this.settings.GITHUB_CLIENT_ID || ''}
GITHUB_CLIENT_SECRET=${this.settings.GITHUB_CLIENT_SECRET || ''}
GITHUB_CALLBACK_URL=${this.settings.GITHUB_CALLBACK_URL || 'http://127.0.0.1:3000/auth/github/callback'}
GITHUB_DEFAULT_REPO=${this.settings.GITHUB_DEFAULT_REPO || 'social-posts'}
GITHUB_POST_TYPE=${this.settings.GITHUB_POST_TYPE || 'issue'}

# ============================================
# LINKEDIN API
# ============================================
LINKEDIN_CLIENT_ID=${this.settings.LINKEDIN_CLIENT_ID || ''}
LINKEDIN_CLIENT_SECRET=${this.settings.LINKEDIN_CLIENT_SECRET || ''}
LINKEDIN_CALLBACK_URL=${this.settings.LINKEDIN_CALLBACK_URL || 'http://127.0.0.1:3000/auth/linkedin/callback'}

# ============================================
# MASTODON
# ============================================
MASTODON_DEFAULT_INSTANCE=${this.settings.MASTODON_DEFAULT_INSTANCE || 'mastodon.social'}
MASTODON_CALLBACK_URL=${this.settings.MASTODON_CALLBACK_URL || 'http://127.0.0.1:3000/auth/mastodon/callback'}

# ============================================
# FEATURE FLAGS
# ============================================
ENABLE_PLUGINS=${this.settings.ENABLE_PLUGINS || 'true'}
ENABLE_ANALYTICS=${this.settings.ENABLE_ANALYTICS || 'true'}
AUTO_UPDATE_ENABLED=${this.settings.AUTO_UPDATE_ENABLED || 'false'}
`;
  }

  // Test API credentials
  async testCredentials(platform) {
    switch (platform) {
      case 'twitter':
        return this.testTwitterCredentials();
      case 'github':
        return this.testGitHubCredentials();
      case 'linkedin':
        return this.testLinkedInCredentials();
      default:
        return { success: false, message: 'Platform not supported' };
    }
  }

  // Test Twitter credentials
  async testTwitterCredentials() {
    const clientId = this.settings.TWITTER_CLIENT_ID;
    const clientSecret = this.settings.TWITTER_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return { success: false, message: 'Missing Twitter API credentials' };
    }
    
    if (clientId.includes('YOUR_') || clientSecret.includes('YOUR_')) {
      return { success: false, message: 'Please replace placeholder values with actual API keys' };
    }
    
    // In a real implementation, we'd make a test API call
    return { success: true, message: 'Twitter credentials appear valid' };
  }

  // Test GitHub credentials
  async testGitHubCredentials() {
    const clientId = this.settings.GITHUB_CLIENT_ID;
    const clientSecret = this.settings.GITHUB_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return { success: false, message: 'Missing GitHub API credentials' };
    }
    
    if (clientId.includes('YOUR_') || clientSecret.includes('YOUR_')) {
      return { success: false, message: 'Please replace placeholder values with actual API keys' };
    }
    
    return { success: true, message: 'GitHub credentials appear valid' };
  }

  // Test LinkedIn credentials
  async testLinkedInCredentials() {
    const clientId = this.settings.LINKEDIN_CLIENT_ID;
    const clientSecret = this.settings.LINKEDIN_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return { success: false, message: 'LinkedIn API credentials not configured' };
    }
    
    return { success: true, message: 'LinkedIn credentials appear valid' };
  }

  // Get masked credentials for UI display
  getMaskedCredentials() {
    const masked = {};
    
    for (const [key, value] of Object.entries(this.settings)) {
      if (key.includes('SECRET') || key.includes('PASSWORD')) {
        // Mask secrets
        if (value && value.length > 0) {
          masked[key] = value.substring(0, 4) + '****' + value.substring(value.length - 4);
        } else {
          masked[key] = '';
        }
      } else {
        masked[key] = value;
      }
    }
    
    return masked;
  }

  // Get platform configuration status
  getPlatformStatus() {
    return {
      twitter: {
        configured: !!(this.settings.TWITTER_CLIENT_ID && 
                      this.settings.TWITTER_CLIENT_SECRET &&
                      !this.settings.TWITTER_CLIENT_ID.includes('YOUR_')),
        hasKeys: !!(this.settings.TWITTER_CLIENT_ID && this.settings.TWITTER_CLIENT_SECRET)
      },
      github: {
        configured: !!(this.settings.GITHUB_CLIENT_ID && 
                      this.settings.GITHUB_CLIENT_SECRET &&
                      !this.settings.GITHUB_CLIENT_ID.includes('YOUR_')),
        hasKeys: !!(this.settings.GITHUB_CLIENT_ID && this.settings.GITHUB_CLIENT_SECRET)
      },
      linkedin: {
        configured: !!(this.settings.LINKEDIN_CLIENT_ID && this.settings.LINKEDIN_CLIENT_SECRET),
        hasKeys: !!(this.settings.LINKEDIN_CLIENT_ID && this.settings.LINKEDIN_CLIENT_SECRET)
      },
      mastodon: {
        configured: true, // Mastodon doesn't need API keys
        hasKeys: true
      }
    };
  }
}

module.exports = SettingsManager;