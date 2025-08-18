// Bulk Operations Manager - Handle batch editing and scheduling
class BulkOperationsManager {
  constructor() {
    this.selectedPosts = new Set();
    this.bulkMode = false;
    this.initialized = false;
  }

  async init() {
    // Add bulk operations UI to scheduled posts page
    this.addBulkOperationsUI();
    
    // Set up event listeners
    this.attachEventListeners();
    
    this.initialized = true;
    console.log('Bulk Operations Manager initialized');
  }

  addBulkOperationsUI() {
    // Add to scheduled posts page
    const scheduledPage = document.getElementById('scheduled-page');
    if (!scheduledPage) return;

    // Check if bulk toolbar already exists
    if (document.getElementById('bulk-operations-toolbar')) return;

    // Create bulk operations toolbar
    const toolbar = document.createElement('div');
    toolbar.id = 'bulk-operations-toolbar';
    toolbar.style.cssText = `
      display: none;
      background: var(--dark-surface);
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      align-items: center;
      justify-content: space-between;
    `;
    
    toolbar.innerHTML = `
      <div style="display: flex; align-items: center; gap: 1rem;">
        <span id="bulk-selection-count" style="font-weight: bold;">
          0 posts selected
        </span>
        <button class="btn btn-small btn-secondary" onclick="bulkOpsManager.selectAll()">
          Select All
        </button>
        <button class="btn btn-small btn-secondary" onclick="bulkOpsManager.deselectAll()">
          Deselect All
        </button>
      </div>
      
      <div style="display: flex; gap: 0.5rem;">
        <button class="btn btn-small btn-primary" onclick="bulkOpsManager.openBatchEditor()">
          ✏️ Edit Selected
        </button>
        <button class="btn btn-small btn-secondary" onclick="bulkOpsManager.bulkReschedule()">
          📅 Reschedule
        </button>
        <button class="btn btn-small btn-secondary" onclick="bulkOpsManager.applyTemplate()">
          🎨 Apply Template
        </button>
        <button class="btn btn-small btn-secondary" onclick="bulkOpsManager.duplicateSelected()">
          📋 Duplicate
        </button>
        <button class="btn btn-small btn-danger" onclick="bulkOpsManager.bulkDelete()" 
                style="background: var(--danger-color); color: white;">
          🗑️ Delete
        </button>
      </div>
    `;

    // Add toggle button to main toolbar
    const pageHeader = scheduledPage.querySelector('div[style*="display: flex"]');
    if (pageHeader) {
      const bulkToggle = document.createElement('button');
      bulkToggle.id = 'bulk-mode-toggle';
      bulkToggle.className = 'btn btn-secondary';
      bulkToggle.textContent = '☑️ Bulk Mode';
      bulkToggle.onclick = () => this.toggleBulkMode();
      
      pageHeader.querySelector('div[style*="display: flex"]').appendChild(bulkToggle);
    }

    // Insert toolbar after header
    const header = scheduledPage.querySelector('div[style*="margin-bottom: 1.5rem"]');
    if (header) {
      header.parentNode.insertBefore(toolbar, header.nextSibling);
    }
  }

  toggleBulkMode() {
    this.bulkMode = !this.bulkMode;
    const toolbar = document.getElementById('bulk-operations-toolbar');
    const toggle = document.getElementById('bulk-mode-toggle');
    
    if (this.bulkMode) {
      toolbar.style.display = 'flex';
      toggle.classList.add('active');
      toggle.style.background = 'var(--primary-color)';
      toggle.style.color = 'white';
      this.addCheckboxesToPosts();
    } else {
      toolbar.style.display = 'none';
      toggle.classList.remove('active');
      toggle.style.background = '';
      toggle.style.color = '';
      this.removeCheckboxesFromPosts();
      this.selectedPosts.clear();
    }
  }

  addCheckboxesToPosts() {
    const posts = document.querySelectorAll('#all-scheduled-posts .post-item');
    
    posts.forEach((post, index) => {
      // Skip if checkbox already exists
      if (post.querySelector('.bulk-checkbox')) return;
      
      // Add checkbox
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'bulk-checkbox';
      checkbox.dataset.postIndex = index;
      checkbox.style.cssText = `
        position: absolute;
        top: 1rem;
        left: 1rem;
        width: 20px;
        height: 20px;
        cursor: pointer;
      `;
      
      checkbox.addEventListener('change', (e) => {
        this.handlePostSelection(index, e.target.checked);
      });
      
      post.style.position = 'relative';
      post.appendChild(checkbox);
    });
  }

  removeCheckboxesFromPosts() {
    document.querySelectorAll('.bulk-checkbox').forEach(cb => cb.remove());
  }

  handlePostSelection(index, selected) {
    if (selected) {
      this.selectedPosts.add(index);
    } else {
      this.selectedPosts.delete(index);
    }
    
    this.updateSelectionCount();
  }

  updateSelectionCount() {
    const count = document.getElementById('bulk-selection-count');
    if (count) {
      count.textContent = `${this.selectedPosts.size} post${this.selectedPosts.size !== 1 ? 's' : ''} selected`;
    }
  }

  selectAll() {
    const checkboxes = document.querySelectorAll('.bulk-checkbox');
    checkboxes.forEach(cb => {
      cb.checked = true;
      this.selectedPosts.add(parseInt(cb.dataset.postIndex));
    });
    this.updateSelectionCount();
  }

  deselectAll() {
    const checkboxes = document.querySelectorAll('.bulk-checkbox');
    checkboxes.forEach(cb => {
      cb.checked = false;
    });
    this.selectedPosts.clear();
    this.updateSelectionCount();
  }

  async getSelectedPosts() {
    if (!window.bufferKillerAPI) return [];
    
    const allPosts = await window.bufferKillerAPI.getScheduledPosts();
    return Array.from(this.selectedPosts).map(index => allPosts[index]).filter(Boolean);
  }

  async openBatchEditor() {
    const posts = await this.getSelectedPosts();
    
    if (posts.length === 0) {
      this.showNotification('No posts selected', 'warning');
      return;
    }

    // Create batch editor modal
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
        <div class="modal-header">
          <h2>Batch Edit ${posts.length} Posts</h2>
          <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
        </div>
        <div class="modal-body">
          <!-- Common Actions -->
          <div style="
            background: var(--dark-bg);
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1.5rem;
          ">
            <h3 style="margin-bottom: 1rem;">Apply to All Selected Posts</h3>
            
            <div style="margin-bottom: 1rem;">
              <label style="display: block; margin-bottom: 0.5rem;">Add Prefix</label>
              <input type="text" id="batch-prefix" placeholder="Text to add at the beginning" style="
                width: 100%;
                padding: 0.5rem;
                background: var(--dark-surface);
                color: var(--light-text);
                border: 1px solid var(--dark-border);
                border-radius: 4px;
              ">
            </div>
            
            <div style="margin-bottom: 1rem;">
              <label style="display: block; margin-bottom: 0.5rem;">Add Suffix</label>
              <input type="text" id="batch-suffix" placeholder="Text to add at the end" style="
                width: 100%;
                padding: 0.5rem;
                background: var(--dark-surface);
                color: var(--light-text);
                border: 1px solid var(--dark-border);
                border-radius: 4px;
              ">
            </div>
            
            <div style="margin-bottom: 1rem;">
              <label style="display: block; margin-bottom: 0.5rem;">Find & Replace</label>
              <div style="display: flex; gap: 0.5rem;">
                <input type="text" id="batch-find" placeholder="Find text" style="
                  flex: 1;
                  padding: 0.5rem;
                  background: var(--dark-surface);
                  color: var(--light-text);
                  border: 1px solid var(--dark-border);
                  border-radius: 4px;
                ">
                <input type="text" id="batch-replace" placeholder="Replace with" style="
                  flex: 1;
                  padding: 0.5rem;
                  background: var(--dark-surface);
                  color: var(--light-text);
                  border: 1px solid var(--dark-border);
                  border-radius: 4px;
                ">
              </div>
            </div>
            
            <div style="margin-bottom: 1rem;">
              <label style="display: block; margin-bottom: 0.5rem;">Add Hashtags</label>
              <input type="text" id="batch-hashtags" placeholder="#hashtag1 #hashtag2" style="
                width: 100%;
                padding: 0.5rem;
                background: var(--dark-surface);
                color: var(--light-text);
                border: 1px solid var(--dark-border);
                border-radius: 4px;
              ">
            </div>
            
            <div style="display: flex; gap: 0.5rem;">
              <button class="btn btn-secondary" onclick="bulkOpsManager.previewChanges()">
                👁️ Preview Changes
              </button>
              <button class="btn btn-secondary" onclick="bulkOpsManager.resetBatchForm()">
                🔄 Reset
              </button>
            </div>
          </div>
          
          <!-- Individual Post Editors -->
          <div id="batch-posts-list">
            <h3 style="margin-bottom: 1rem;">Individual Post Editing</h3>
            ${posts.map((post, index) => `
              <div class="batch-post-item" data-post-id="${post.id}" style="
                background: var(--dark-bg);
                padding: 1rem;
                border-radius: 8px;
                margin-bottom: 1rem;
              ">
                <div style="
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  margin-bottom: 0.5rem;
                ">
                  <strong>Post ${index + 1}</strong>
                  <span style="color: var(--muted-text); font-size: 0.85rem;">
                    ${new Date(post.scheduled_time).toLocaleString()}
                  </span>
                </div>
                <textarea 
                  class="batch-post-content" 
                  data-original="${escapeHtml(post.content)}"
                  style="
                    width: 100%;
                    min-height: 80px;
                    padding: 0.5rem;
                    background: var(--dark-surface);
                    color: var(--light-text);
                    border: 1px solid var(--dark-border);
                    border-radius: 4px;
                    resize: vertical;
                  ">${escapeHtml(post.content)}</textarea>
                <div style="
                  margin-top: 0.5rem;
                  font-size: 0.85rem;
                  color: var(--muted-text);
                ">
                  Platforms: ${JSON.parse(post.platforms).join(', ')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="modal-footer" style="
          display: flex;
          justify-content: space-between;
          padding: 1rem;
          border-top: 1px solid var(--dark-border);
        ">
          <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
            Cancel
          </button>
          <button class="btn btn-primary" onclick="bulkOpsManager.saveBatchEdits()">
            💾 Save All Changes
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }

  previewChanges() {
    const prefix = document.getElementById('batch-prefix').value;
    const suffix = document.getElementById('batch-suffix').value;
    const findText = document.getElementById('batch-find').value;
    const replaceText = document.getElementById('batch-replace').value;
    const hashtags = document.getElementById('batch-hashtags').value;
    
    // Apply changes to all textareas
    document.querySelectorAll('.batch-post-content').forEach(textarea => {
      let content = textarea.dataset.original;
      
      if (prefix) content = prefix + ' ' + content;
      if (suffix) content = content + ' ' + suffix;
      if (findText) content = content.replace(new RegExp(findText, 'g'), replaceText);
      if (hashtags) content = content + ' ' + hashtags;
      
      textarea.value = content;
    });
    
    this.showNotification('Preview updated. Review changes below.', 'info');
  }

  resetBatchForm() {
    document.getElementById('batch-prefix').value = '';
    document.getElementById('batch-suffix').value = '';
    document.getElementById('batch-find').value = '';
    document.getElementById('batch-replace').value = '';
    document.getElementById('batch-hashtags').value = '';
    
    // Reset textareas to original
    document.querySelectorAll('.batch-post-content').forEach(textarea => {
      textarea.value = textarea.dataset.original;
    });
    
    this.showNotification('Form reset', 'info');
  }

  async saveBatchEdits() {
    const updates = [];
    
    document.querySelectorAll('.batch-post-item').forEach(item => {
      const postId = item.dataset.postId;
      const content = item.querySelector('.batch-post-content').value;
      const original = item.querySelector('.batch-post-content').dataset.original;
      
      if (content !== original) {
        updates.push({
          id: postId,
          content: content
        });
      }
    });
    
    if (updates.length === 0) {
      this.showNotification('No changes to save', 'warning');
      return;
    }
    
    // Save all updates
    let successCount = 0;
    for (const update of updates) {
      try {
        await window.bufferKillerAPI.updatePost(update.id, { content: update.content });
        successCount++;
      } catch (error) {
        console.error(`Failed to update post ${update.id}:`, error);
      }
    }
    
    this.showNotification(`Updated ${successCount} of ${updates.length} posts`, 'success');
    
    // Close modal and refresh
    document.querySelector('.modal').remove();
    this.toggleBulkMode();
    
    // Refresh posts list
    if (typeof loadAllScheduledPosts === 'function') {
      loadAllScheduledPosts();
    }
  }

  async bulkReschedule() {
    const posts = await this.getSelectedPosts();
    
    if (posts.length === 0) {
      this.showNotification('No posts selected', 'warning');
      return;
    }

    // Create reschedule modal
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
          <h2>Reschedule ${posts.length} Posts</h2>
          <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
        </div>
        <div class="modal-body">
          <p style="margin-bottom: 1rem;">Choose how to reschedule the selected posts:</p>
          
          <div style="margin-bottom: 1.5rem;">
            <label>
              <input type="radio" name="reschedule-type" value="specific" checked>
              <strong>Specific Date & Time</strong>
            </label>
            <input type="datetime-local" id="reschedule-datetime" style="
              width: 100%;
              margin-top: 0.5rem;
              padding: 0.5rem;
              background: var(--dark-bg);
              color: var(--light-text);
              border: 1px solid var(--dark-border);
              border-radius: 4px;
            ">
          </div>
          
          <div style="margin-bottom: 1.5rem;">
            <label>
              <input type="radio" name="reschedule-type" value="interval">
              <strong>With Intervals</strong>
            </label>
            <div style="margin-top: 0.5rem;">
              <label style="display: block; margin-bottom: 0.5rem;">Starting from:</label>
              <input type="datetime-local" id="reschedule-start" style="
                width: 100%;
                padding: 0.5rem;
                background: var(--dark-bg);
                color: var(--light-text);
                border: 1px solid var(--dark-border);
                border-radius: 4px;
                margin-bottom: 0.5rem;
              ">
              <label style="display: block; margin-bottom: 0.5rem;">Interval (minutes):</label>
              <input type="number" id="reschedule-interval" value="60" min="5" style="
                width: 100%;
                padding: 0.5rem;
                background: var(--dark-bg);
                color: var(--light-text);
                border: 1px solid var(--dark-border);
                border-radius: 4px;
              ">
            </div>
          </div>
          
          <div style="margin-bottom: 1.5rem;">
            <label>
              <input type="radio" name="reschedule-type" value="delay">
              <strong>Delay All</strong>
            </label>
            <div style="margin-top: 0.5rem;">
              <label style="display: block; margin-bottom: 0.5rem;">Delay by (hours):</label>
              <input type="number" id="reschedule-delay" value="1" min="1" style="
                width: 100%;
                padding: 0.5rem;
                background: var(--dark-bg);
                color: var(--light-text);
                border: 1px solid var(--dark-border);
                border-radius: 4px;
              ">
            </div>
          </div>
        </div>
        <div class="modal-footer" style="
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
        ">
          <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
            Cancel
          </button>
          <button class="btn btn-primary" onclick="bulkOpsManager.executeReschedule()">
            📅 Reschedule Posts
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Set default datetime to tomorrow same time
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('reschedule-datetime').value = formatDateTimeLocal(tomorrow);
    document.getElementById('reschedule-start').value = formatDateTimeLocal(tomorrow);
  }

  async executeReschedule() {
    const posts = await this.getSelectedPosts();
    const rescheduleType = document.querySelector('input[name="reschedule-type"]:checked').value;
    
    let newTimes = [];
    
    switch (rescheduleType) {
      case 'specific':
        const specificTime = new Date(document.getElementById('reschedule-datetime').value);
        newTimes = posts.map(() => specificTime);
        break;
        
      case 'interval':
        const startTime = new Date(document.getElementById('reschedule-start').value);
        const interval = parseInt(document.getElementById('reschedule-interval').value);
        newTimes = posts.map((_, index) => {
          const time = new Date(startTime);
          time.setMinutes(time.getMinutes() + (interval * index));
          return time;
        });
        break;
        
      case 'delay':
        const delayHours = parseInt(document.getElementById('reschedule-delay').value);
        newTimes = posts.map(post => {
          const time = new Date(post.scheduled_time);
          time.setHours(time.getHours() + delayHours);
          return time;
        });
        break;
    }
    
    // Update all posts
    let successCount = 0;
    for (let i = 0; i < posts.length; i++) {
      try {
        await window.bufferKillerAPI.updatePost(posts[i].id, {
          scheduled_time: newTimes[i].toISOString()
        });
        successCount++;
      } catch (error) {
        console.error(`Failed to reschedule post ${posts[i].id}:`, error);
      }
    }
    
    this.showNotification(`Rescheduled ${successCount} of ${posts.length} posts`, 'success');
    
    // Close modal and refresh
    document.querySelector('.modal').remove();
    this.toggleBulkMode();
    
    // Refresh posts list
    if (typeof loadAllScheduledPosts === 'function') {
      loadAllScheduledPosts();
    }
  }

  async applyTemplate() {
    const posts = await this.getSelectedPosts();
    
    if (posts.length === 0) {
      this.showNotification('No posts selected', 'warning');
      return;
    }

    this.showNotification('Template application coming soon!', 'info');
  }

  async duplicateSelected() {
    const posts = await this.getSelectedPosts();
    
    if (posts.length === 0) {
      this.showNotification('No posts selected', 'warning');
      return;
    }

    let duplicated = 0;
    for (const post of posts) {
      try {
        // Schedule duplicate 1 hour after original
        const newTime = new Date(post.scheduled_time);
        newTime.setHours(newTime.getHours() + 1);
        
        await window.bufferKillerAPI.schedulePost({
          content: post.content + ' (copy)',
          platforms: JSON.parse(post.platforms),
          scheduledTime: newTime.toISOString()
        });
        duplicated++;
      } catch (error) {
        console.error('Failed to duplicate post:', error);
      }
    }
    
    this.showNotification(`Duplicated ${duplicated} posts`, 'success');
    this.toggleBulkMode();
    
    // Refresh
    if (typeof loadAllScheduledPosts === 'function') {
      loadAllScheduledPosts();
    }
  }

  async bulkDelete() {
    const posts = await this.getSelectedPosts();
    
    if (posts.length === 0) {
      this.showNotification('No posts selected', 'warning');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${posts.length} posts? This cannot be undone.`)) {
      return;
    }

    let deleted = 0;
    for (const post of posts) {
      try {
        await window.bufferKillerAPI.deletePost(post.id);
        deleted++;
      } catch (error) {
        console.error('Failed to delete post:', error);
      }
    }
    
    this.showNotification(`Deleted ${deleted} posts`, 'success');
    this.toggleBulkMode();
    
    // Refresh
    if (typeof loadAllScheduledPosts === 'function') {
      loadAllScheduledPosts();
    }
  }

  attachEventListeners() {
    // Listen for page changes to re-initialize if needed
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-page="scheduled"]')) {
        setTimeout(() => {
          this.addBulkOperationsUI();
        }, 100);
      }
    });
  }

  showNotification(message, type = 'info') {
    if (typeof showNotification === 'function') {
      showNotification(message, type);
    } else {
      console.log(`[${type}] ${message}`);
    }
  }
}

// Helper function for escaping HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Helper function for formatting datetime-local input
function formatDateTimeLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Create global instance
const bulkOpsManager = new BulkOperationsManager();

// Auto-init on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    bulkOpsManager.init();
  });
} else {
  bulkOpsManager.init();
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BulkOperationsManager;
}