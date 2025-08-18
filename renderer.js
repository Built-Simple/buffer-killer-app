// Renderer process - UI logic and interaction
// This runs in the browser context with access to the DOM

// Platform character limits
const PLATFORM_LIMITS = {
  twitter: 280,
  linkedin: 3000,
  facebook: 63206,
  instagram: 2200,
  mastodon: 500,
  github: 65536
};

// State management
let selectedPlatforms = new Set();
let currentCharLimit = 280;
let selectedMedia = [];
let selectedVideo = null; // For video support

// DOM Elements
const postContent = document.getElementById('post-content');
const charCount = document.getElementById('char-count');
const charLimit = document.getElementById('char-limit');
const scheduleTime = document.getElementById('schedule-time');
const scheduleBtn = document.getElementById('schedule-btn');
const postNowBtn = document.getElementById('post-now-btn');
const saveDraftBtn = document.getElementById('save-draft-btn');
const recentPosts = document.getElementById('recent-posts');
const allScheduledPosts = document.getElementById('all-scheduled-posts');
const accountsList = document.getElementById('accounts-list');
const addAccountBtn = document.getElementById('add-account-btn');
const addAccountModal = document.getElementById('add-account-modal');
const modalClose = document.querySelector('.modal-close');

// Import components
let rateLimitDashboard = null;
let currentDraftId = null; // For auto-save
let accountSwitcherComponent = null;

// Current context
let currentWorkspace = null;
let currentAccount = null;

// Navigation
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

async function initializeApp() {
  // Set default schedule time to 1 hour from now
  const now = new Date();
  now.setHours(now.getHours() + 1);
  now.setMinutes(0);
  scheduleTime.value = formatDateTimeLocal(now);
  
  // Initialize account switcher
  await initializeAccountSwitcher();
  
  // Load initial data
  await loadScheduledPosts();
  await loadAccounts();
  await loadDrafts();
  updateStats();
  
  // Initialize rate limit dashboard when the script loads
  const initRateLimitDashboard = () => {
    if (typeof window.RateLimitDashboard !== 'undefined') {
      rateLimitDashboard = new window.RateLimitDashboard();
      const container = document.getElementById('rate-limit-dashboard');
      if (container) {
        rateLimitDashboard.init('rate-limit-dashboard');
      }
    }
  };
  
  // Try to initialize immediately if available, or wait for script to load
  if (window.RateLimitDashboard) {
    initRateLimitDashboard();
  } else {
    // Load the script if not already loaded
    const script = document.createElement('script');
    script.src = 'components/rate-limit-dashboard.js';
    script.onload = initRateLimitDashboard;
    document.head.appendChild(script);
  }
  
  // Set up event listeners
  setupEventListeners();
  
  // Listen for real-time updates from main process
  if (window.bufferKillerAPI) {
    window.bufferKillerAPI.onPostPublished((data) => {
      showNotification(`Post published successfully!`, 'success');
      loadScheduledPosts();
      updateStats();
    });
    
    window.bufferKillerAPI.onAuthenticationSuccess((data) => {
      showNotification(`Connected to ${data.platform}!`, 'success');
      loadAccounts();
      closeModal();
    });
    
    window.bufferKillerAPI.onAuthenticationError((data) => {
      showNotification(`Failed to connect to ${data.platform}: ${data.error}`, 'error');
    });
  }
}

function setupEventListeners() {
  // Navigation
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      switchPage(page);
    });
  });
  
  // Character counter
  postContent.addEventListener('input', updateCharCount);
  
  // Platform selection
  document.querySelectorAll('.platform').forEach(platform => {
    platform.addEventListener('click', () => {
      togglePlatform(platform);
    });
  });
  
  // Buttons
  scheduleBtn.addEventListener('click', schedulePost);
  postNowBtn.addEventListener('click', postNow);
  saveDraftBtn.addEventListener('click', saveDraft);
  
  // Media upload button
  const addMediaBtn = document.getElementById('add-media-btn');
  if (addMediaBtn) {
    addMediaBtn.addEventListener('click', selectMediaFiles);
  }
  
  // Video upload button
  const addVideoBtn = document.getElementById('add-video-btn');
  if (addVideoBtn) {
    addVideoBtn.addEventListener('click', selectVideoFile);
  }
  
  // Settings button
  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      switchPage('settings');
    });
  }
  
  // Modal
  addAccountBtn.addEventListener('click', () => {
    addAccountModal.classList.add('active');
  });
  
  modalClose.addEventListener('click', closeModal);
  
  addAccountModal.addEventListener('click', (e) => {
    if (e.target === addAccountModal) {
      closeModal();
    }
  });
  
  // Connect platform buttons
  document.querySelectorAll('.connect-platform').forEach(btn => {
    btn.addEventListener('click', async () => {
      const platform = btn.dataset.platform;
      await connectPlatform(platform);
    });
  });
}

function switchPage(pageName) {
  // Update navigation
  navItems.forEach(item => {
    if (item.dataset.page === pageName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
  
  // Show selected page
  pages.forEach(page => {
    if (page.id === `${pageName}-page`) {
      page.style.display = 'block';
    } else {
      page.style.display = 'none';
    }
  });
  
  // Load page-specific data
  if (pageName === 'scheduled') {
    loadAllScheduledPosts();
  } else if (pageName === 'accounts') {
    loadAccounts();
  } else if (pageName === 'settings') {
    loadSettings();
  } else if (pageName === 'drafts') {
    loadDrafts();
  } else if (pageName === 'analytics') {
    loadAnalytics();
  } else if (pageName === 'rate-limits') {
    if (rateLimitDashboard) {
      rateLimitDashboard.updateRateLimits();
    }
  } else if (pageName === 'queue-monitor') {
    loadQueueMonitor();
  }
}

function updateCharCount() {
  const count = postContent.value.length;
  charCount.textContent = count;
  
  // Update character count styling
  const countElement = charCount.parentElement;
  countElement.classList.remove('warning', 'over');
  
  if (count > currentCharLimit) {
    countElement.classList.add('over');
  } else if (count > currentCharLimit * 0.9) {
    countElement.classList.add('warning');
  }
}

function togglePlatform(platformElement) {
  const platform = platformElement.dataset.platform;
  
  if (selectedPlatforms.has(platform)) {
    selectedPlatforms.delete(platform);
    platformElement.classList.remove('selected');
  } else {
    selectedPlatforms.add(platform);
    platformElement.classList.add('selected');
  }
  
  updateCharLimit();
}

function updateCharLimit() {
  if (selectedPlatforms.size === 0) {
    currentCharLimit = 280; // Default to Twitter limit
  } else {
    // Use the minimum limit among selected platforms
    currentCharLimit = Math.min(
      ...Array.from(selectedPlatforms).map(p => PLATFORM_LIMITS[p])
    );
  }
  
  charLimit.textContent = currentCharLimit;
  postContent.maxLength = currentCharLimit;
  updateCharCount();
}

async function schedulePost() {
  const content = postContent.value.trim();
  
  if (!content) {
    showNotification('Please enter some content for your post', 'warning');
    return;
  }
  
  if (!currentAccount) {
    showNotification('Please select an account first', 'warning');
    return;
  }
  
  if (!scheduleTime.value) {
    showNotification('Please select a schedule time', 'warning');
    return;
  }
  
  const scheduledDate = new Date(scheduleTime.value);
  if (scheduledDate <= new Date()) {
    showNotification('Schedule time must be in the future', 'warning');
    return;
  }
  
  try {
    const postData = {
      content: content,
      scheduledTime: scheduledDate.toISOString(),
      media: selectedMedia.length > 0 ? selectedMedia : null,
      video: selectedVideo ? {
        file: selectedVideo,
        filename: selectedVideo.name,
        size: selectedVideo.size,
        type: selectedVideo.type
      } : null
    };
    
    const result = await window.bufferKillerAPI.schedulePostForAccount(currentAccount.id, postData);
    
    if (result) {
      showNotification(`Post scheduled for @${currentAccount.username} on ${currentAccount.platform}!`, 'success');
      clearComposer();
      await loadScheduledPosts();
      updateStats();
    } else {
      showNotification('Failed to schedule post', 'error');
    }
  } catch (error) {
    console.error('Error scheduling post:', error);
    showNotification('An error occurred while scheduling the post', 'error');
  }
}

async function postNow() {
  const content = postContent.value.trim();
  
  if (!content) {
    showNotification('Please enter some content for your post', 'warning');
    return;
  }
  
  if (!currentAccount) {
    showNotification('Please select an account first', 'warning');
    return;
  }
  
  try {
    const postData = {
      content: content,
      scheduledTime: new Date().toISOString(), // Post immediately
      media: selectedMedia.length > 0 ? selectedMedia : null,
      video: selectedVideo ? {
        file: selectedVideo,
        filename: selectedVideo.name,
        size: selectedVideo.size,
        type: selectedVideo.type
      } : null
    };
    
    const result = await window.bufferKillerAPI.schedulePostForAccount(currentAccount.id, postData);
    
    if (result) {
      showNotification(`Posting now to @${currentAccount.username} on ${currentAccount.platform}...`, 'success');
      clearComposer();
      await loadScheduledPosts();
      updateStats();
    } else {
      showNotification('Failed to post', 'error');
    }
  } catch (error) {
    console.error('Error posting:', error);
    showNotification('An error occurred while posting', 'error');
  }
}

async function saveDraft() {
  const content = postContent.value.trim();
  
  if (!content) {
    showNotification('Please enter some content for your draft', 'warning');
    return;
  }
  
  try {
    const draftData = {
      content: content,
      platforms: Array.from(selectedPlatforms),
      scheduledTime: scheduleTime.value || null,
      media: selectedMedia.length > 0 ? selectedMedia : null,
      title: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
      category: 'general'
    };
    
    // If we have a current draft ID, update it; otherwise create new
    let result;
    if (currentDraftId) {
      result = await window.bufferKillerAPI.updateDraft(currentDraftId, draftData);
    } else {
      result = await window.bufferKillerAPI.createDraft(draftData);
      currentDraftId = result.id;
    }
    
    if (result) {
      showNotification('Draft saved successfully!', 'success');
      await loadDrafts();
      updateStats();
    } else {
      showNotification('Failed to save draft', 'error');
    }
  } catch (error) {
    console.error('Error saving draft:', error);
    showNotification('An error occurred while saving the draft', 'error');
  }
}

async function loadScheduledPosts() {
  try {
    const posts = await window.bufferKillerAPI.getScheduledPosts();
    
    // Display recent posts in compose page
    if (recentPosts) {
      const recentPostsHtml = posts.slice(0, 5).map(post => createPostCard(post)).join('');
      recentPosts.innerHTML = recentPostsHtml || '<p style="color: var(--muted-text);">No scheduled posts yet</p>';
    }
    
    // Update scheduled count
    document.getElementById('scheduled-count').textContent = posts.length;
  } catch (error) {
    console.error('Error loading scheduled posts:', error);
  }
}

async function loadAllScheduledPosts() {
  try {
    const posts = await window.bufferKillerAPI.getScheduledPosts();
    
    if (allScheduledPosts) {
      const postsHtml = posts.map(post => createPostCard(post)).join('');
      allScheduledPosts.innerHTML = postsHtml || '<p style="color: var(--muted-text);">No scheduled posts</p>';
    }
  } catch (error) {
    console.error('Error loading all scheduled posts:', error);
  }
}

async function loadAccounts() {
  try {
    const accounts = await window.bufferKillerAPI.getAccounts();
    
    if (accountsList) {
      const accountsHtml = accounts.map(account => createAccountCard(account)).join('');
      accountsList.innerHTML = accountsHtml || '<p style="color: var(--muted-text);">No connected accounts yet</p>';
    }
    
    // Update connected accounts count
    document.getElementById('connected-accounts').textContent = accounts.length;
  } catch (error) {
    console.error('Error loading accounts:', error);
  }
}

async function connectPlatform(platform) {
  try {
    let options = {};
    
    // For Mastodon, ask for the instance
    if (platform === 'mastodon') {
      const instance = await promptForMastodonInstance();
      if (!instance) {
        return; // User cancelled
      }
      options.instance = instance;
      showNotification(`Connecting to Mastodon (${instance})...`, 'info');
    } else {
      showNotification(`Connecting to ${platform}...`, 'info');
    }
    
    const result = await window.bufferKillerAPI.authenticatePlatform(platform, options);
    
    if (result.success) {
      const displayName = platform === 'mastodon' ? `Mastodon (${options.instance})` : platform;
      showNotification(`Successfully connected to ${displayName}!`, 'success');
      await loadAccounts();
      closeModal();
    } else {
      showNotification(result.message || `Failed to connect to ${platform}`, 'error');
    }
  } catch (error) {
    console.error(`Error connecting to ${platform}:`, error);
    showNotification(`An error occurred while connecting to ${platform}`, 'error');
  }
}

// Prompt for Mastodon instance
function promptForMastodonInstance() {
  return new Promise((resolve) => {
    // Create a custom dialog
    const dialog = document.createElement('div');
    dialog.className = 'modal active';
    dialog.innerHTML = `
      <div class="modal-content" style="max-width: 400px;">
        <div class="modal-header">
          <h2>Choose Mastodon Instance</h2>
        </div>
        <p style="color: var(--muted-text); margin-bottom: 1rem;">
          Enter your Mastodon instance URL (e.g., mastodon.social, fosstodon.org)
        </p>
        <input 
          type="text" 
          id="mastodon-instance-input" 
          placeholder="mastodon.social" 
          value="mastodon.social"
          style="
            width: 100%;
            padding: 0.75rem;
            background: var(--dark-bg);
            color: var(--light-text);
            border: 1px solid var(--dark-border);
            border-radius: 6px;
            margin-bottom: 1rem;
          "
        >
        <div style="display: flex; gap: 1rem; justify-content: flex-end;">
          <button class="btn btn-secondary" id="cancel-instance">Cancel</button>
          <button class="btn btn-primary" id="confirm-instance">Connect</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    const input = document.getElementById('mastodon-instance-input');
    const confirmBtn = document.getElementById('confirm-instance');
    const cancelBtn = document.getElementById('cancel-instance');
    
    // Focus the input
    input.focus();
    input.select();
    
    const cleanup = () => {
      document.body.removeChild(dialog);
    };
    
    confirmBtn.addEventListener('click', () => {
      const instance = input.value.trim()
        .replace(/^https?:\/\//, '') // Remove protocol
        .replace(/\/$/, ''); // Remove trailing slash
      
      if (instance) {
        cleanup();
        resolve(instance);
      } else {
        showNotification('Please enter a valid Mastodon instance', 'warning');
      }
    });
    
    cancelBtn.addEventListener('click', () => {
      cleanup();
      resolve(null);
    });
    
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        confirmBtn.click();
      }
    });
    
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        cleanup();
        resolve(null);
      }
    });
  });
}

function createPostCard(post) {
  const platforms = JSON.parse(post.platforms);
  const scheduledDate = new Date(post.scheduled_time);
  const platformBadges = platforms.map(p => 
    `<span class="post-platform-badge">${getPlatformIcon(p)} ${p}</span>`
  ).join('');
  
  return `
    <div class="post-item">
      <div class="post-header">
        <div class="post-time">${formatDateTime(scheduledDate)}</div>
        <span class="status-badge status-${post.status}">${post.status}</span>
      </div>
      <div class="post-content">${escapeHtml(post.content)}</div>
      <div class="post-platforms">${platformBadges}</div>
      <div class="post-actions">
        <button class="btn btn-small btn-secondary" onclick="editPost(${post.id})">Edit</button>
        <button class="btn btn-small btn-secondary" onclick="deletePost(${post.id})">Delete</button>
      </div>
    </div>
  `;
}

function createAccountCard(account) {
  const initial = account.username ? account.username[0].toUpperCase() : getPlatformIcon(account.platform);
  const statusClass = account.active ? '' : 'inactive';
  
  return `
    <div class="account-card">
      <div class="account-avatar">${initial}</div>
      <div class="account-info">
        <div class="account-name">${account.username || 'Not set'}</div>
        <div class="account-platform">${account.platform}</div>
      </div>
      <div class="account-status ${statusClass}"></div>
    </div>
  `;
}

function clearComposer() {
  postContent.value = '';
  selectedPlatforms.clear();
  document.querySelectorAll('.platform.selected').forEach(p => {
    p.classList.remove('selected');
  });
  updateCharCount();
  
  // Clear media
  selectedMedia = [];
  updateMediaPreview();
  
  // Clear video
  if (selectedVideo) {
    removeVideo();
  }
  
  // Reset schedule time to 1 hour from now
  const now = new Date();
  now.setHours(now.getHours() + 1);
  now.setMinutes(0);
  scheduleTime.value = formatDateTimeLocal(now);
}

// Video handling functions
async function selectVideoFile() {
  try {
    // Load video modules if not already loaded
    if (!window.videoPreviewUI) {
      const script1 = document.createElement('script');
      script1.src = 'lib/video/video-validator.js';
      document.head.appendChild(script1);
      
      const script2 = document.createElement('script');
      script2.src = 'lib/video/video-preview-ui.js';
      document.head.appendChild(script2);
      
      // Wait for scripts to load
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Create file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/mp4,video/quicktime,video/webm,video/*';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      // Quick size check (512MB for Twitter as example)
      const maxSize = 512 * 1024 * 1024;
      if (file.size > maxSize) {
        showNotification(
          `Video too large (${Math.round(file.size/1024/1024)}MB). Max size: ${maxSize/1024/1024}MB`,
          'error'
        );
        return;
      }
      
      // Get selected platforms for validation
      const platforms = Array.from(selectedPlatforms);
      if (platforms.length === 0) {
        platforms.push('twitter'); // Default to Twitter for validation
      }
      
      // Show loading
      showNotification('Validating video...', 'info');
      
      // Create preview using our video preview UI
      if (window.videoPreviewUI) {
        const previewHTML = await window.videoPreviewUI.createPreview(file, platforms);
        
        // Add preview to page
        let previewContainer = document.getElementById('video-preview-container');
        if (!previewContainer) {
          // Create container if it doesn't exist
          previewContainer = document.createElement('div');
          previewContainer.id = 'video-preview-container';
          const mediaSection = document.getElementById('media-preview') || 
                              document.querySelector('.post-composer');
          if (mediaSection) {
            mediaSection.appendChild(previewContainer);
          }
        }
        
        previewContainer.innerHTML = previewHTML;
        selectedVideo = file;
        
        // Listen for video events
        document.addEventListener('videoAccepted', (event) => {
          selectedVideo = event.detail.file;
          showNotification('Video ready for upload!', 'success');
        });
        
        document.addEventListener('videoRemoved', () => {
          selectedVideo = null;
        });
      } else {
        // Fallback: Basic preview without validation
        const url = URL.createObjectURL(file);
        const preview = document.getElementById('video-preview-container') || 
                       document.createElement('div');
        preview.id = 'video-preview-container';
        preview.innerHTML = `
          <div style="padding: 20px; background: #2a2a2a; border-radius: 8px; margin: 20px 0;">
            <video controls src="${url}" style="max-width: 100%; max-height: 400px;"></video>
            <p style="margin-top: 10px;">✅ Video selected: ${file.name}</p>
            <button class="btn btn-danger" onclick="removeVideo()">Remove Video</button>
          </div>
        `;
        
        const composer = document.querySelector('.post-composer');
        if (composer) {
          composer.appendChild(preview);
        }
        
        selectedVideo = file;
      }
    };
    
    input.click();
  } catch (error) {
    console.error('Error selecting video:', error);
    showNotification('Failed to select video', 'error');
  }
}

window.removeVideo = function() {
  const container = document.getElementById('video-preview-container');
  if (container) {
    // Revoke any object URLs
    const video = container.querySelector('video');
    if (video && video.src && video.src.startsWith('blob:')) {
      URL.revokeObjectURL(video.src);
    }
    container.remove();
  }
  selectedVideo = null;
  showNotification('Video removed', 'info');
};

// Media handling functions
async function selectMediaFiles() {
  try {
    const result = await window.bufferKillerAPI.selectMediaFiles();
    
    if (result.canceled) {
      return;
    }
    
    if (result.files && result.files.length > 0) {
      // Check platform limits
      const maxFiles = getMaxMediaFiles();
      if (selectedMedia.length + result.files.length > maxFiles) {
        showNotification(`Maximum ${maxFiles} media files allowed`, 'warning');
        return;
      }
      
      // Add files to selected media
      selectedMedia = [...selectedMedia, ...result.files];
      updateMediaPreview();
      showNotification(`Added ${result.files.length} media file(s)`, 'success');
    }
  } catch (error) {
    console.error('Error selecting media:', error);
    showNotification('Failed to select media files', 'error');
  }
}

function getMaxMediaFiles() {
  // Different platforms have different limits
  if (selectedPlatforms.has('twitter')) return 4;
  if (selectedPlatforms.has('mastodon')) return 4;
  if (selectedPlatforms.has('github')) return 10;
  return 4; // Default
}

function updateMediaPreview() {
  const previewContainer = document.getElementById('media-preview-container');
  const previewSection = document.getElementById('media-preview');
  
  if (!previewContainer || !previewSection) return;
  
  if (selectedMedia.length === 0) {
    previewSection.style.display = 'none';
    previewContainer.innerHTML = '';
    return;
  }
  
  previewSection.style.display = 'block';
  previewContainer.innerHTML = selectedMedia.map((media, index) => {
    if (media.preview) {
      // It's an image
      return `
        <div style="position: relative; width: 100px; height: 100px;">
          <img src="${media.preview}" 
               style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; border: 1px solid var(--dark-border);" 
               alt="${media.filename}">
          <button onclick="removeMedia(${index})" 
                  style="position: absolute; top: -8px; right: -8px; background: var(--danger-color); 
                         color: white; border: none; border-radius: 50%; width: 24px; height: 24px; 
                         cursor: pointer; font-size: 16px; line-height: 1;">×</button>
        </div>
      `;
    } else {
      // It's a video or other file
      return `
        <div style="position: relative; width: 100px; height: 100px; background: var(--dark-bg); 
                    border-radius: 8px; border: 1px solid var(--dark-border); 
                    display: flex; align-items: center; justify-content: center; flex-direction: column;">
          <span style="font-size: 24px;">🎥</span>
          <span style="font-size: 10px; margin-top: 4px; text-align: center; padding: 0 4px; 
                       overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 90%;">
            ${media.filename}
          </span>
          <button onclick="removeMedia(${index})" 
                  style="position: absolute; top: -8px; right: -8px; background: var(--danger-color); 
                         color: white; border: none; border-radius: 50%; width: 24px; height: 24px; 
                         cursor: pointer; font-size: 16px; line-height: 1;">×</button>
        </div>
      `;
    }
  }).join('');
}

window.removeMedia = function(index) {
  selectedMedia.splice(index, 1);
  updateMediaPreview();
  showNotification('Media removed', 'info');
}

function closeModal() {
  addAccountModal.classList.remove('active');
}

async function updateStats() {
  // This would typically fetch real stats from the database
  // For now, using placeholder logic
  
  // Published today count
  document.getElementById('published-today').textContent = '0';
}

// Utility functions
function formatDateTimeLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatDateTime(date) {
  const options = {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  return date.toLocaleDateString('en-US', options);
}

function getPlatformIcon(platform) {
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

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    background: ${type === 'success' ? 'var(--success-color)' : 
                  type === 'error' ? 'var(--danger-color)' : 
                  type === 'warning' ? 'var(--warning-color)' : 
                  'var(--primary-color)'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 2000;
    animation: slideIn 0.3s ease;
  `;
  
  document.body.appendChild(notification);
  
  // Remove after 5 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 5000);
}

// Global functions for inline onclick handlers (will refactor later)
window.editPost = async function(postId) {
  try {
    // Get the post data first
    const posts = await window.bufferKillerAPI.getScheduledPosts();
    const post = posts.find(p => p.id === postId);
    
    if (!post) {
      showNotification('Post not found', 'error');
      return;
    }
    
    // Create edit modal
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 600px;">
        <div class="modal-header">
          <h2>Edit Post</h2>
          <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
        </div>
        <div class="modal-body">
          <textarea 
            id="edit-post-content" 
            style="
              width: 100%;
              height: 150px;
              padding: 0.75rem;
              background: var(--dark-bg);
              color: var(--light-text);
              border: 1px solid var(--dark-border);
              border-radius: 6px;
              margin-bottom: 1rem;
              font-family: inherit;
              resize: vertical;
            ">${escapeHtml(post.content)}</textarea>
          
          <label style="display: block; margin-bottom: 0.5rem; color: var(--muted-text);">Schedule Time:</label>
          <input 
            type="datetime-local" 
            id="edit-schedule-time" 
            value="${formatDateTimeLocal(new Date(post.scheduled_time))}"
            style="
              width: 100%;
              padding: 0.75rem;
              background: var(--dark-bg);
              color: var(--light-text);
              border: 1px solid var(--dark-border);
              border-radius: 6px;
              margin-bottom: 1rem;
            "
          >
          
          <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem; color: var(--muted-text);">Platforms:</label>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              ${['twitter', 'mastodon', 'github', 'linkedin'].map(platform => {
                const isSelected = JSON.parse(post.platforms).includes(platform);
                return `
                  <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                    <input 
                      type="checkbox" 
                      value="${platform}" 
                      class="edit-platform-checkbox" 
                      ${isSelected ? 'checked' : ''}
                      style="cursor: pointer;"
                    >
                    <span style="text-transform: capitalize;">${platform}</span>
                  </label>
                `;
              }).join('')}
            </div>
          </div>
          
          <div style="display: flex; gap: 1rem; justify-content: flex-end;">
            <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
            <button class="btn btn-primary" id="save-edit-btn">Save Changes</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add save handler
    document.getElementById('save-edit-btn').addEventListener('click', async () => {
      const newContent = document.getElementById('edit-post-content').value.trim();
      const newScheduleTime = document.getElementById('edit-schedule-time').value;
      const selectedPlatforms = Array.from(document.querySelectorAll('.edit-platform-checkbox:checked'))
        .map(cb => cb.value);
      
      if (!newContent) {
        showNotification('Post content cannot be empty', 'warning');
        return;
      }
      
      if (selectedPlatforms.length === 0) {
        showNotification('Please select at least one platform', 'warning');
        return;
      }
      
      if (!newScheduleTime) {
        showNotification('Please select a schedule time', 'warning');
        return;
      }
      
      try {
        const updates = {
          content: newContent,
          platforms: JSON.stringify(selectedPlatforms),
          scheduled_time: new Date(newScheduleTime).toISOString()
        };
        
        const result = await window.bufferKillerAPI.updatePost(postId, updates);
        
        if (result.success) {
          showNotification('Post updated successfully!', 'success');
          modal.remove();
          
          // Reload posts
          await loadScheduledPosts();
          await loadAllScheduledPosts();
        } else {
          showNotification('Failed to update post', 'error');
        }
      } catch (error) {
        console.error('Error updating post:', error);
        showNotification('An error occurred while updating the post', 'error');
      }
    });
    
  } catch (error) {
    console.error('Error editing post:', error);
    showNotification('Failed to edit post', 'error');
  }
};

window.deletePost = async function(postId) {
  if (confirm('Are you sure you want to delete this post?')) {
    try {
      const result = await window.bufferKillerAPI.deletePost(postId);
      
      if (result.success) {
        showNotification('Post deleted successfully!', 'success');
        
        // Reload posts
        await loadScheduledPosts();
        await loadAllScheduledPosts();
        updateStats();
      } else {
        showNotification('Failed to delete post', 'error');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      showNotification('An error occurred while deleting the post', 'error');
    }
  }
};

// Test function for Twitter posting
window.testTwitterPost = async function() {
  const testContent = `Test tweet from Buffer Killer! 🚀 The time is ${new Date().toLocaleTimeString()}`;
  
  try {
    // Check if Twitter is connected first
    const accounts = await window.bufferKillerAPI.getAccounts();
    const twitterAccount = accounts.find(a => a.platform === 'twitter');
    
    if (!twitterAccount) {
      showNotification('Please connect your Twitter account first!', 'warning');
      // Open the add account modal
      document.getElementById('add-account-modal').classList.add('active');
      return;
    }
    
    showNotification('Posting test tweet to Twitter...', 'info');
    
    // Schedule for immediate posting
    const postData = {
      content: testContent,
      platforms: ['twitter'],
      scheduledTime: new Date().toISOString()
    };
    
    const result = await window.bufferKillerAPI.schedulePost(postData);
    
    if (result.success) {
      showNotification('Test tweet posted successfully! Check your Twitter.', 'success');
      await loadScheduledPosts();
      updateStats();
    } else {
      showNotification('Failed to post test tweet', 'error');
    }
  } catch (error) {
    console.error('Error posting test tweet:', error);
    showNotification(`Error: ${error.message}`, 'error');
  }
};

// Test function for Mastodon posting
window.testMastodonPost = async function() {
  const testContent = `Test toot from Buffer Killer! 🐘 The time is ${new Date().toLocaleTimeString()}`;
  
  try {
    // Check if Mastodon is connected first
    const accounts = await window.bufferKillerAPI.getAccounts();
    const mastodonAccount = accounts.find(a => a.platform === 'mastodon');
    
    if (!mastodonAccount) {
      showNotification('Please connect your Mastodon account first!', 'warning');
      // Open the add account modal
      document.getElementById('add-account-modal').classList.add('active');
      return;
    }
    
    showNotification('Posting test toot to Mastodon...', 'info');
    
    // Schedule for immediate posting
    const postData = {
      content: testContent,
      platforms: ['mastodon'],
      scheduledTime: new Date().toISOString()
    };
    
    const result = await window.bufferKillerAPI.schedulePost(postData);
    
    if (result.success) {
      showNotification('Test toot posted successfully! Check your Mastodon.', 'success');
      await loadScheduledPosts();
      updateStats();
    } else {
      showNotification('Failed to post test toot', 'error');
    }
  } catch (error) {
    console.error('Error posting test toot:', error);
    showNotification(`Error: ${error.message}`, 'error');
  }
};

// Settings functions
window.loadSettings = async function() {
  try {
    const settings = await window.bufferKillerAPI.getSettings();
    const status = await window.bufferKillerAPI.getPlatformStatus();
    
    // Load Twitter settings
    document.getElementById('twitter-client-id').value = settings.TWITTER_CLIENT_ID || '';
    document.getElementById('twitter-client-secret').value = settings.TWITTER_CLIENT_SECRET || '';
    document.getElementById('twitter-status').style.background = status.twitter.configured ? 'var(--success-color)' : 'var(--danger-color)';
    
    // Load GitHub settings
    document.getElementById('github-client-id').value = settings.GITHUB_CLIENT_ID || '';
    document.getElementById('github-client-secret').value = settings.GITHUB_CLIENT_SECRET || '';
    document.getElementById('github-default-repo').value = settings.GITHUB_DEFAULT_REPO || 'social-posts';
    document.getElementById('github-status').style.background = status.github.configured ? 'var(--success-color)' : 'var(--danger-color)';
    
    // Load LinkedIn settings
    document.getElementById('linkedin-client-id').value = settings.LINKEDIN_CLIENT_ID || '';
    document.getElementById('linkedin-client-secret').value = settings.LINKEDIN_CLIENT_SECRET || '';
    document.getElementById('linkedin-status').style.background = status.linkedin.configured ? 'var(--success-color)' : 'var(--danger-color)';
  } catch (error) {
    console.error('Error loading settings:', error);
    showNotification('Failed to load settings', 'error');
  }
};

window.saveSettings = async function() {
  try {
    const updates = {
      TWITTER_CLIENT_ID: document.getElementById('twitter-client-id').value,
      TWITTER_CLIENT_SECRET: document.getElementById('twitter-client-secret').value,
      GITHUB_CLIENT_ID: document.getElementById('github-client-id').value,
      GITHUB_CLIENT_SECRET: document.getElementById('github-client-secret').value,
      GITHUB_DEFAULT_REPO: document.getElementById('github-default-repo').value,
      LINKEDIN_CLIENT_ID: document.getElementById('linkedin-client-id').value,
      LINKEDIN_CLIENT_SECRET: document.getElementById('linkedin-client-secret').value
    };
    
    await window.bufferKillerAPI.updateSettings(updates);
    showNotification('Settings saved successfully! Restart the app to apply changes.', 'success');
    
    // Reload settings to update status indicators
    await loadSettings();
  } catch (error) {
    console.error('Error saving settings:', error);
    showNotification('Failed to save settings', 'error');
  }
};

window.testCredentials = async function(platform) {
  try {
    showNotification(`Testing ${platform} credentials...`, 'info');
    const result = await window.bufferKillerAPI.testApiCredentials(platform);
    
    if (result.success) {
      showNotification(result.message, 'success');
    } else {
      showNotification(result.message, 'error');
    }
  } catch (error) {
    console.error('Error testing credentials:', error);
    showNotification('Failed to test credentials', 'error');
  }
};

window.togglePasswordVisibility = function(fieldId) {
  const field = document.getElementById(fieldId);
  if (field.type === 'password') {
    field.type = 'text';
  } else {
    field.type = 'password';
  }
};

// CSV Import/Export functions
window.importCSV = async function() {
  try {
    showNotification('Select a CSV file to import...', 'info');
    const result = await window.bufferKillerAPI.importCSV();
    
    if (result.canceled) {
      return;
    }
    
    // Show import results
    let message = `Imported ${result.imported} of ${result.total} posts successfully.`;
    
    if (result.warnings.length > 0) {
      message += `\n\nWarnings:\n${result.warnings.join('\n')}`;
    }
    
    if (result.errors.length > 0) {
      message += `\n\nErrors:\n${result.errors.join('\n')}`;
    }
    
    // Show detailed results modal
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 600px;">
        <div class="modal-header">
          <h2>CSV Import Results</h2>
          <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
        </div>
        <div class="modal-body">
          <div style="margin-bottom: 1rem;">
            <strong>Summary:</strong><br>
            ✅ Successfully imported: ${result.imported}<br>
            ❌ Failed: ${result.failed}<br>
            📊 Total rows: ${result.total}
          </div>
          
          ${result.warnings.length > 0 ? `
            <div style="margin-bottom: 1rem; padding: 0.75rem; background: rgba(246, 173, 85, 0.1); border-radius: 6px;">
              <strong style="color: var(--warning-color);">⚠️ Warnings:</strong>
              <ul style="margin: 0.5rem 0 0 1.5rem; padding: 0;">
                ${result.warnings.map(w => `<li style="color: var(--warning-color); font-size: 0.9rem;">${escapeHtml(w)}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          
          ${result.errors.length > 0 ? `
            <div style="margin-bottom: 1rem; padding: 0.75rem; background: rgba(245, 101, 101, 0.1); border-radius: 6px;">
              <strong style="color: var(--danger-color);">❌ Errors:</strong>
              <ul style="margin: 0.5rem 0 0 1.5rem; padding: 0;">
                ${result.errors.map(e => `<li style="color: var(--danger-color); font-size: 0.9rem;">${escapeHtml(e)}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          
          <div style="display: flex; gap: 1rem; justify-content: flex-end;">
            <button class="btn btn-primary" onclick="this.closest('.modal').remove(); loadScheduledPosts(); loadAllScheduledPosts();">OK</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Reload posts if any were imported
    if (result.imported > 0) {
      await loadScheduledPosts();
      await loadAllScheduledPosts();
      updateStats();
    }
  } catch (error) {
    console.error('Error importing CSV:', error);
    showNotification('Failed to import CSV file', 'error');
  }
};

window.exportCSV = async function() {
  try {
    showNotification('Exporting scheduled posts to CSV...', 'info');
    const result = await window.bufferKillerAPI.exportCSV();
    
    if (result.canceled) {
      return;
    }
    
    showNotification(`Successfully exported ${result.exported} posts to CSV`, 'success');
  } catch (error) {
    console.error('Error exporting CSV:', error);
    showNotification(error.message || 'Failed to export CSV file', 'error');
  }
};

window.downloadTemplate = async function() {
  try {
    showNotification('Downloading CSV template...', 'info');
    const result = await window.bufferKillerAPI.downloadCSVTemplate();
    
    if (result.canceled) {
      return;
    }
    
    showNotification('CSV template saved successfully', 'success');
  } catch (error) {
    console.error('Error downloading template:', error);
    showNotification('Failed to download CSV template', 'error');
  }
};

// Test function for GitHub posting
window.testGitHubPost = async function() {
  const testContent = `Test post from Buffer Killer! 💙 Posted at ${new Date().toLocaleTimeString()}`;
  
  try {
    // Check if GitHub is connected first
    const accounts = await window.bufferKillerAPI.getAccounts();
    const githubAccount = accounts.find(a => a.platform === 'github');
    
    if (!githubAccount) {
      showNotification('Please connect your GitHub account first!', 'warning');
      // Open the add account modal
      document.getElementById('add-account-modal').classList.add('active');
      return;
    }
    
    showNotification('Creating GitHub issue...', 'info');
    
    // Schedule for immediate posting
    const postData = {
      content: testContent,
      platforms: ['github'],
      scheduledTime: new Date().toISOString()
    };
    
    const result = await window.bufferKillerAPI.schedulePost(postData);
    
    if (result.success) {
      showNotification('GitHub issue created successfully! Check your repo.', 'success');
      await loadScheduledPosts();
      updateStats();
    } else {
      showNotification('Failed to create GitHub issue', 'error');
    }
  } catch (error) {
    console.error('Error creating GitHub issue:', error);
    showNotification(`Error: ${error.message}`, 'error');
  }
};

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// Draft system functions
async function loadDrafts() {
  try {
    const drafts = await window.bufferKillerAPI.getDrafts();
    const draftsList = document.getElementById('drafts-list');
    
    if (!draftsList) return;
    
    if (drafts.length === 0) {
      draftsList.innerHTML = '<p style="color: var(--muted-text);">No drafts yet. Start creating!</p>';
      return;
    }
    
    const draftsHtml = drafts.map(draft => createDraftCard(draft)).join('');
    draftsList.innerHTML = draftsHtml;
  } catch (error) {
    console.error('Error loading drafts:', error);
  }
}

function createDraftCard(draft) {
  const updatedDate = new Date(draft.updated_at);
  const platformBadges = draft.platforms && draft.platforms.length > 0
    ? draft.platforms.map(p => `<span class="post-platform-badge">${getPlatformIcon(p)} ${p}</span>`).join('')
    : '<span style="color: var(--muted-text); font-size: 0.85rem;">No platforms selected</span>';
  
  return `
    <div class="post-item">
      <div class="post-header">
        <div>
          <strong>${escapeHtml(draft.title)}</strong>
          <div class="post-time">Last updated: ${formatDateTime(updatedDate)}</div>
        </div>
        <span class="status-badge status-pending">Draft</span>
      </div>
      <div class="post-content">${escapeHtml(draft.content.substring(0, 200))}${draft.content.length > 200 ? '...' : ''}</div>
      <div class="post-platforms">${platformBadges}</div>
      <div class="post-actions">
        <button class="btn btn-small btn-primary" onclick="editDraft('${draft.id}')">Edit</button>
        <button class="btn btn-small btn-secondary" onclick="publishDraftNow('${draft.id}')">Publish Now</button>
        <button class="btn btn-small btn-secondary" onclick="scheduleDraft('${draft.id}')">Schedule</button>
        <button class="btn btn-small btn-secondary" onclick="duplicateDraft('${draft.id}')">Duplicate</button>
        <button class="btn btn-small btn-secondary" onclick="deleteDraft('${draft.id}')">Delete</button>
      </div>
    </div>
  `;
}

window.createNewDraft = function() {
  // Clear composer and switch to compose page
  clearComposer();
  currentDraftId = null;
  switchPage('compose');
  postContent.focus();
  showNotification('New draft started', 'info');
};

window.editDraft = async function(draftId) {
  try {
    const draft = await window.bufferKillerAPI.getDraft(draftId);
    
    if (!draft) {
      showNotification('Draft not found', 'error');
      return;
    }
    
    // Load draft into composer
    clearComposer();
    postContent.value = draft.content;
    
    // Set selected platforms
    if (draft.platforms && draft.platforms.length > 0) {
      draft.platforms.forEach(platform => {
        selectedPlatforms.add(platform);
        const platformElement = document.querySelector(`[data-platform="${platform}"]`);
        if (platformElement) {
          platformElement.classList.add('selected');
        }
      });
    }
    
    // Set scheduled time if available
    if (draft.scheduled_time) {
      scheduleTime.value = formatDateTimeLocal(new Date(draft.scheduled_time));
    }
    
    // Set current draft ID for updates
    currentDraftId = draftId;
    
    // Update UI
    updateCharLimit();
    updateCharCount();
    
    // Switch to compose page
    switchPage('compose');
    postContent.focus();
    
    showNotification('Draft loaded', 'success');
  } catch (error) {
    console.error('Error loading draft:', error);
    showNotification('Failed to load draft', 'error');
  }
};

window.publishDraftNow = async function(draftId) {
  if (confirm('Are you sure you want to publish this draft now?')) {
    try {
      const result = await window.bufferKillerAPI.publishDraft(draftId, new Date().toISOString());
      
      if (result) {
        showNotification('Draft published successfully!', 'success');
        await loadDrafts();
        await loadScheduledPosts();
        updateStats();
      } else {
        showNotification('Failed to publish draft', 'error');
      }
    } catch (error) {
      console.error('Error publishing draft:', error);
      showNotification('An error occurred while publishing the draft', 'error');
    }
  }
};

window.scheduleDraft = async function(draftId) {
  // Create a modal to select schedule time
  const modal = document.createElement('div');
  modal.className = 'modal active';
  
  const now = new Date();
  now.setHours(now.getHours() + 1);
  now.setMinutes(0);
  
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 400px;">
      <div class="modal-header">
        <h2>Schedule Draft</h2>
        <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
      </div>
      <div class="modal-body">
        <label style="display: block; margin-bottom: 0.5rem; color: var(--muted-text);">Select time to publish:</label>
        <input 
          type="datetime-local" 
          id="draft-schedule-time" 
          value="${formatDateTimeLocal(now)}"
          style="
            width: 100%;
            padding: 0.75rem;
            background: var(--dark-bg);
            color: var(--light-text);
            border: 1px solid var(--dark-border);
            border-radius: 6px;
            margin-bottom: 1rem;
          "
        >
        <div style="display: flex; gap: 1rem; justify-content: flex-end;">
          <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
          <button class="btn btn-primary" id="confirm-schedule-draft">Schedule</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('confirm-schedule-draft').addEventListener('click', async () => {
    const scheduleTimeValue = document.getElementById('draft-schedule-time').value;
    
    if (!scheduleTimeValue) {
      showNotification('Please select a schedule time', 'warning');
      return;
    }
    
    const scheduledDate = new Date(scheduleTimeValue);
    if (scheduledDate <= new Date()) {
      showNotification('Schedule time must be in the future', 'warning');
      return;
    }
    
    try {
      const result = await window.bufferKillerAPI.publishDraft(draftId, scheduledDate.toISOString());
      
      if (result) {
        showNotification('Draft scheduled successfully!', 'success');
        modal.remove();
        await loadDrafts();
        await loadScheduledPosts();
        updateStats();
      } else {
        showNotification('Failed to schedule draft', 'error');
      }
    } catch (error) {
      console.error('Error scheduling draft:', error);
      showNotification('An error occurred while scheduling the draft', 'error');
    }
  });
};

window.duplicateDraft = async function(draftId) {
  try {
    const result = await window.bufferKillerAPI.duplicateDraft(draftId);
    
    if (result) {
      showNotification('Draft duplicated successfully!', 'success');
      await loadDrafts();
    } else {
      showNotification('Failed to duplicate draft', 'error');
    }
  } catch (error) {
    console.error('Error duplicating draft:', error);
    showNotification('An error occurred while duplicating the draft', 'error');
  }
};

window.deleteDraft = async function(draftId) {
  if (confirm('Are you sure you want to delete this draft?')) {
    try {
      const result = await window.bufferKillerAPI.deleteDraft(draftId);
      
      if (result.success) {
        showNotification('Draft deleted successfully!', 'success');
        
        // Clear current draft ID if it was the deleted one
        if (currentDraftId === draftId) {
          currentDraftId = null;
        }
        
        await loadDrafts();
        updateStats();
      } else {
        showNotification('Failed to delete draft', 'error');
      }
    } catch (error) {
      console.error('Error deleting draft:', error);
      showNotification('An error occurred while deleting the draft', 'error');
    }
  }
};

// Auto-save draft functionality
let autoSaveTimeout = null;

function setupAutoSave() {
  postContent.addEventListener('input', () => {
    // Clear existing timeout
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }
    
    // Set new timeout for auto-save (3 seconds after stopping typing)
    autoSaveTimeout = setTimeout(async () => {
      const content = postContent.value.trim();
      if (content && content.length > 10) {
        try {
          // Generate draft ID if needed
          if (!currentDraftId) {
            currentDraftId = 'draft-' + Date.now();
          }
          
          await window.bufferKillerAPI.autoSaveDraft(
            currentDraftId,
            content,
            Array.from(selectedPlatforms)
          );
          
          // Show subtle indication of auto-save
          const savedIndicator = document.createElement('span');
          savedIndicator.textContent = ' (Auto-saved)';
          savedIndicator.style.cssText = 'color: var(--success-color); font-size: 0.85rem; margin-left: 0.5rem;';
          charCount.parentElement.appendChild(savedIndicator);
          
          setTimeout(() => {
            savedIndicator.remove();
          }, 2000);
        } catch (error) {
          console.error('Auto-save failed:', error);
        }
      }
    }, 3000);
  });
}

// Initialize auto-save
setupAutoSave();

// Analytics functions
async function loadAnalytics() {
  const analyticsDiv = document.getElementById('analytics-dashboard');
  if (!analyticsDiv) return;
  
  // Load the analytics dashboard HTML
  try {
    const response = await fetch('components/analytics-dashboard.html');
    const html = await response.text();
    analyticsDiv.innerHTML = html;
    
    // Load and initialize the analytics dashboard component
    if (!window.analyticsDashboard) {
      const script = document.createElement('script');
      script.src = 'components/analytics-dashboard.js';
      script.onload = async () => {
        // Initialize the dashboard after script loads
        if (window.analyticsDashboard) {
          await window.analyticsDashboard.initialize();
          
          // Load sample data for demonstration
          const sampleData = window.analyticsDashboard.generateSampleData();
          
          // Update all components with sample data
          window.analyticsDashboard.updateSummaryCards(sampleData.summary);
          window.analyticsDashboard.updateEngagementChart(sampleData.engagement);
          window.analyticsDashboard.updatePlatformChart(sampleData.platforms);
          window.analyticsDashboard.updateTimelineChart(sampleData.timeline);
          window.analyticsDashboard.updateTopPostsList(sampleData.topPosts);
          window.analyticsDashboard.updateBestTimesHeatmap(sampleData.bestTimes);
        }
      };
      document.head.appendChild(script);
    } else {
      // Dashboard already loaded, just refresh data
      await window.analyticsDashboard.loadAnalytics();
    }
  } catch (error) {
    console.error('Error loading analytics dashboard:', error);
    analyticsDiv.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--muted-text);">
        <h3>Failed to load analytics dashboard</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

// Rate limit dashboard is loaded dynamically when needed

// Queue Monitor functions
let queueMonitorDashboard = null;

async function loadQueueMonitor() {
  const queueMonitorDiv = document.getElementById('queue-monitor-dashboard');
  if (!queueMonitorDiv) return;
  
  // Load the queue monitor dashboard component if not already loaded
  if (!queueMonitorDashboard) {
    // Check if script is already loaded
    if (typeof window.QueueMonitorDashboard !== 'undefined') {
      queueMonitorDashboard = new window.QueueMonitorDashboard();
      queueMonitorDashboard.init('queue-monitor-dashboard');
    } else {
      // Load the script
      const script = document.createElement('script');
      script.src = 'lib/queue/monitor-dashboard.js';
      script.onload = () => {
        if (window.QueueMonitorDashboard) {
          queueMonitorDashboard = new window.QueueMonitorDashboard();
          queueMonitorDashboard.init('queue-monitor-dashboard');
        }
      };
      document.head.appendChild(script);
    }
  } else {
    // Dashboard already loaded, just refresh data
    queueMonitorDashboard.updateDashboard();
  }
}

// Expose queue monitor API to window for inline handlers
window.queueMonitor = {
  pauseAccount: async (platform, accountId) => {
    if (queueMonitorDashboard) {
      await queueMonitorDashboard.pauseAccount(platform, accountId);
    }
  },
  clearAccount: async (platform, accountId) => {
    if (queueMonitorDashboard) {
      await queueMonitorDashboard.clearAccount(platform, accountId);
    }
  },
  failoverAccount: async (platform, accountId) => {
    if (queueMonitorDashboard) {
      await queueMonitorDashboard.failoverAccount(platform, accountId);
    }
  },
  recoverAccount: async (platform, accountId) => {
    if (queueMonitorDashboard) {
      await queueMonitorDashboard.recoverAccount(platform, accountId);
    }
  }
};

// Account Switcher functions
async function initializeAccountSwitcher() {
  try {
    // Load the account switcher script if not already loaded
    if (!window.accountSwitcher) {
      const script = document.createElement('script');
      script.src = 'lib/accounts/account-switcher-ui.js';
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    
    // Initialize the account switcher
    if (window.accountSwitcher) {
      await window.accountSwitcher.init('account-switcher-container');
    }
    
    // Get current context
    const context = await window.bufferKillerAPI.getActiveContext();
    currentWorkspace = context.workspace;
    currentAccount = context.account;
    
    // Listen for workspace/account changes
    window.addEventListener('workspace-switched', async (event) => {
      currentWorkspace = event.detail.workspace;
      await loadScheduledPosts();
      await loadDrafts();
      updateStats();
    });
    
    window.addEventListener('account-switched', async (event) => {
      currentAccount = event.detail.account;
      await loadScheduledPosts();
      updateStats();
      
      // Update platform selector to show only current account's platform
      updatePlatformSelector();
    });
    
    // Listen for add account modal request
    window.addEventListener('open-add-account-modal', (event) => {
      const modal = document.getElementById('add-account-modal');
      if (modal) {
        modal.classList.add('active');
        // Store workspace ID for adding account
        modal.dataset.workspaceId = event.detail.workspaceId;
      }
    });
    
  } catch (error) {
    console.error('Failed to initialize account switcher:', error);
  }
}

function updatePlatformSelector() {
  if (!currentAccount) return;
  
  // Hide all platform buttons except the current account's platform
  document.querySelectorAll('.platform').forEach(platform => {
    const platformName = platform.dataset.platform;
    if (platformName === currentAccount.platform) {
      platform.style.display = 'flex';
      platform.classList.add('selected');
      selectedPlatforms.clear();
      selectedPlatforms.add(platformName);
    } else {
      platform.style.display = 'none';
      platform.classList.remove('selected');
    }
  });
  
  updateCharLimit();
}

console.log('Renderer process initialized');