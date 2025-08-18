/**
 * Draft System Manager
 * 
 * Handles saving, loading, and managing draft posts
 */

const { v4: uuidv4 } = require('uuid');

class DraftManager {
  constructor(database) {
    this.db = database;
  }

  /**
   * Create a new draft
   */
  async createDraft(draftData) {
    const draft = {
      id: uuidv4(),
      content: draftData.content || '',
      platforms: JSON.stringify(draftData.platforms || []),
      scheduled_time: draftData.scheduledTime || null,
      media: draftData.media ? JSON.stringify(draftData.media) : null,
      status: 'draft',
      tags: draftData.tags ? JSON.stringify(draftData.tags) : null,
      title: draftData.title || 'Untitled Draft',
      notes: draftData.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      template_id: draftData.templateId || null,
      auto_hashtags: draftData.autoHashtags || false,
      link_tracking: draftData.linkTracking || false,
      category: draftData.category || 'general'
    };

    await this.db.insert('drafts', draft);
    return draft;
  }

  /**
   * Update an existing draft
   */
  async updateDraft(draftId, updates) {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    // Stringify arrays if provided
    if (updates.platforms) {
      updateData.platforms = JSON.stringify(updates.platforms);
    }
    if (updates.media) {
      updateData.media = JSON.stringify(updates.media);
    }
    if (updates.tags) {
      updateData.tags = JSON.stringify(updates.tags);
    }

    return await this.db.update('drafts', draftId, updateData);
  }

  /**
   * Get all drafts
   */
  async getAllDrafts(options = {}) {
    const { category, sortBy = 'updated_at', order = 'desc', limit = 50 } = options;
    
    let query = this.db.query('drafts')
      .where('status', 'draft')
      .orderByField(sortBy, order)
      .limit(limit);

    if (category && category !== 'all') {
      query = query.where('category', category);
    }

    const drafts = await query.execute();
    
    // Parse JSON fields
    return drafts.map(draft => ({
      ...draft,
      platforms: draft.platforms ? JSON.parse(draft.platforms) : [],
      media: draft.media ? JSON.parse(draft.media) : null,
      tags: draft.tags ? JSON.parse(draft.tags) : []
    }));
  }

  /**
   * Get a single draft by ID
   */
  async getDraft(draftId) {
    const draft = await this.db.findOne('drafts', { id: draftId });
    
    if (!draft) return null;
    
    return {
      ...draft,
      platforms: draft.platforms ? JSON.parse(draft.platforms) : [],
      media: draft.media ? JSON.parse(draft.media) : null,
      tags: draft.tags ? JSON.parse(draft.tags) : []
    };
  }

  /**
   * Delete a draft
   */
  async deleteDraft(draftId) {
    return await this.db.delete('drafts', draftId);
  }

  /**
   * Convert a draft to a scheduled post
   */
  async publishDraft(draftId, scheduledTime) {
    const draft = await this.getDraft(draftId);
    
    if (!draft) {
      throw new Error('Draft not found');
    }

    // Create a new post from the draft
    const post = {
      content: draft.content,
      platforms: draft.platforms,
      scheduled_time: scheduledTime || new Date().toISOString(),
      status: scheduledTime ? 'pending' : 'publishing',
      media: draft.media,
      draft_id: draftId,
      created_at: new Date().toISOString()
    };

    const createdPost = await this.db.insert('posts', {
      ...post,
      platforms: JSON.stringify(post.platforms),
      media: post.media ? JSON.stringify(post.media) : null
    });

    // Update draft status
    await this.updateDraft(draftId, { status: 'published' });

    return createdPost;
  }

  /**
   * Duplicate a draft
   */
  async duplicateDraft(draftId) {
    const original = await this.getDraft(draftId);
    
    if (!original) {
      throw new Error('Draft not found');
    }

    const duplicate = {
      ...original,
      id: uuidv4(),
      title: `${original.title} (Copy)`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'draft'
    };

    delete duplicate.id; // Remove ID so database generates new one
    
    return await this.createDraft(duplicate);
  }

  /**
   * Search drafts by content
   */
  async searchDrafts(searchTerm) {
    const drafts = await this.getAllDrafts();
    
    const searchLower = searchTerm.toLowerCase();
    return drafts.filter(draft => 
      draft.content.toLowerCase().includes(searchLower) ||
      draft.title.toLowerCase().includes(searchLower) ||
      draft.notes.toLowerCase().includes(searchLower)
    );
  }

  /**
   * Get draft templates
   */
  async getTemplates() {
    const templates = await this.db.query('templates')
      .where('type', 'draft')
      .orderByField('name', 'asc')
      .execute();
    
    return templates.map(template => ({
      ...template,
      content: template.content || '',
      platforms: template.platforms ? JSON.parse(template.platforms) : [],
      tags: template.tags ? JSON.parse(template.tags) : []
    }));
  }

  /**
   * Save draft as template
   */
  async saveAsTemplate(draftId, templateName) {
    const draft = await this.getDraft(draftId);
    
    if (!draft) {
      throw new Error('Draft not found');
    }

    const template = {
      id: uuidv4(),
      name: templateName,
      type: 'draft',
      content: draft.content,
      platforms: JSON.stringify(draft.platforms),
      tags: JSON.stringify(draft.tags || []),
      category: draft.category,
      created_at: new Date().toISOString()
    };

    return await this.db.insert('templates', template);
  }

  /**
   * Create draft from template
   */
  async createFromTemplate(templateId) {
    const template = await this.db.findOne('templates', { id: templateId });
    
    if (!template) {
      throw new Error('Template not found');
    }

    return await this.createDraft({
      content: template.content,
      platforms: template.platforms ? JSON.parse(template.platforms) : [],
      tags: template.tags ? JSON.parse(template.tags) : [],
      category: template.category,
      title: `Draft from ${template.name}`,
      templateId: templateId
    });
  }

  /**
   * Auto-save draft (for periodic saving while typing)
   */
  async autoSave(draftId, content, platforms) {
    // Check if draft exists
    const existing = await this.getDraft(draftId);
    
    if (existing) {
      // Update existing draft
      return await this.updateDraft(draftId, {
        content,
        platforms,
        updated_at: new Date().toISOString()
      });
    } else {
      // Create new draft
      return await this.createDraft({
        id: draftId,
        content,
        platforms,
        title: 'Auto-saved Draft'
      });
    }
  }

  /**
   * Get draft statistics
   */
  async getStats() {
    const totalDrafts = await this.db.count('drafts', { status: 'draft' });
    const publishedDrafts = await this.db.count('drafts', { status: 'published' });
    
    const categories = await this.db.query('drafts')
      .where('status', 'draft')
      .groupBy('category')
      .execute();
    
    return {
      total: totalDrafts,
      published: publishedDrafts,
      categories: categories
    };
  }
}

module.exports = DraftManager;
