// CSV Import Module for Buffer Killer App
// Handles bulk post importing from CSV files

const fs = require('fs').promises;
const path = require('path');

class CSVImporter {
  constructor(db) {
    this.db = db;
  }
  
  // Parse CSV content
  parseCSV(content) {
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }
    
    // Get headers from first line
    const headers = this.parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
    
    // Validate required headers
    const requiredHeaders = ['content', 'platforms', 'scheduled_time'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
    }
    
    // Parse data rows
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length === 0) continue; // Skip empty rows
      
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      data.push(row);
    }
    
    return data;
  }
  
  // Parse a single CSV line handling quotes and commas
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote mode
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add last field
    result.push(current.trim());
    
    return result;
  }
  
  // Validate and transform row data
  validateRow(row, index) {
    const errors = [];
    const warnings = [];
    
    // Validate content
    if (!row.content || row.content.trim() === '') {
      errors.push(`Row ${index + 2}: Content is required`);
    }
    
    // Validate platforms
    if (!row.platforms || row.platforms.trim() === '') {
      errors.push(`Row ${index + 2}: Platforms are required`);
    } else {
      // Parse platforms (can be comma or pipe separated)
      const platforms = row.platforms
        .split(/[,|]/)
        .map(p => p.trim().toLowerCase())
        .filter(p => p);
      
      const validPlatforms = ['twitter', 'linkedin', 'facebook', 'instagram', 'mastodon', 'github'];
      const invalidPlatforms = platforms.filter(p => !validPlatforms.includes(p));
      
      if (invalidPlatforms.length > 0) {
        warnings.push(`Row ${index + 2}: Unknown platforms: ${invalidPlatforms.join(', ')}`);
      }
      
      row.platforms = platforms.filter(p => validPlatforms.includes(p));
      
      if (row.platforms.length === 0) {
        errors.push(`Row ${index + 2}: No valid platforms specified`);
      }
    }
    
    // Validate scheduled time
    if (!row.scheduled_time || row.scheduled_time.trim() === '') {
      errors.push(`Row ${index + 2}: Scheduled time is required`);
    } else {
      // Try to parse the date
      const date = new Date(row.scheduled_time);
      if (isNaN(date.getTime())) {
        errors.push(`Row ${index + 2}: Invalid date format: ${row.scheduled_time}`);
      } else if (date <= new Date()) {
        warnings.push(`Row ${index + 2}: Scheduled time is in the past`);
      } else {
        row.scheduled_time = date.toISOString();
      }
    }
    
    // Check content length for platforms
    if (row.content && row.platforms) {
      const contentLength = row.content.length;
      
      if (row.platforms.includes('twitter') && contentLength > 280) {
        warnings.push(`Row ${index + 2}: Content exceeds Twitter's 280 character limit (${contentLength} chars)`);
      }
      
      if (row.platforms.includes('mastodon') && contentLength > 500) {
        warnings.push(`Row ${index + 2}: Content exceeds Mastodon's 500 character limit (${contentLength} chars)`);
      }
    }
    
    // Parse optional fields
    if (row.media) {
      // Media can be URLs or file paths, separated by pipe
      row.media = row.media.split('|').map(m => m.trim()).filter(m => m);
    }
    
    if (row.tags) {
      // Tags separated by comma
      row.tags = row.tags.split(',').map(t => t.trim()).filter(t => t);
    }
    
    return { errors, warnings };
  }
  
  // Import CSV file
  async importFromFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return await this.importFromContent(content);
    } catch (error) {
      throw new Error(`Failed to read CSV file: ${error.message}`);
    }
  }
  
  // Import from CSV content
  async importFromContent(content) {
    const results = {
      total: 0,
      imported: 0,
      failed: 0,
      errors: [],
      warnings: [],
      posts: []
    };
    
    try {
      // Parse CSV
      const rows = this.parseCSV(content);
      results.total = rows.length;
      
      // Validate all rows first
      const validRows = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const { errors, warnings } = this.validateRow(row, i);
        
        if (errors.length > 0) {
          results.errors.push(...errors);
          results.failed++;
        } else {
          validRows.push(row);
          if (warnings.length > 0) {
            results.warnings.push(...warnings);
          }
        }
      }
      
      // Import valid rows
      for (const row of validRows) {
        try {
          const post = await this.db.insert('posts', {
            content: row.content,
            platforms: JSON.stringify(row.platforms),
            scheduled_time: row.scheduled_time,
            status: 'pending',
            media: row.media ? JSON.stringify(row.media) : null,
            tags: row.tags ? JSON.stringify(row.tags) : null
          });
          
          results.posts.push(post);
          results.imported++;
        } catch (error) {
          results.errors.push(`Failed to import post: ${error.message}`);
          results.failed++;
        }
      }
      
      return results;
    } catch (error) {
      results.errors.push(error.message);
      return results;
    }
  }
  
  // Generate sample CSV template
  generateTemplate() {
    const template = `Content,Platforms,Scheduled Time,Media,Tags
"Hello world! This is my first scheduled post.","twitter,mastodon","2025-01-01 10:00:00","",""
"Check out our new product launch! 🚀","twitter|linkedin|facebook","2025-01-02 14:30:00","https://example.com/image.jpg","product,launch,announcement"
"Happy New Year everyone! 🎉🎊","twitter,mastodon,facebook","2025-01-01 00:00:00","","newyear,celebration"
"Blog post: 10 Tips for Social Media Success","linkedin,twitter","2025-01-03 09:00:00","","blog,tips,socialmedia"
"Behind the scenes at our office today","instagram,facebook","2025-01-04 15:00:00","path/to/local/image.jpg|path/to/another.jpg","office,behindthescenes"

# CSV Import Instructions:
# 1. Content: The text of your post (required)
# 2. Platforms: Comma or pipe separated list of platforms (required)
#    Valid platforms: twitter, linkedin, facebook, instagram, mastodon, github
# 3. Scheduled Time: When to post (required) - Format: YYYY-MM-DD HH:MM:SS
# 4. Media: Pipe-separated list of image URLs or file paths (optional)
# 5. Tags: Comma-separated list of tags/hashtags (optional)
#
# Tips:
# - Use quotes around content if it contains commas
# - Escape quotes in content by doubling them: ""like this""
# - Times should be in 24-hour format
# - Leave Media and Tags empty if not needed
`;
    
    return template;
  }
  
  // Export scheduled posts to CSV
  async exportToCSV(filePath) {
    try {
      const posts = await this.db.find('posts', { status: 'pending' });
      
      if (posts.length === 0) {
        throw new Error('No scheduled posts to export');
      }
      
      // Generate CSV content
      let csv = 'Content,Platforms,Scheduled Time,Status,Media,Tags\n';
      
      for (const post of posts) {
        const content = this.escapeCSVField(post.content);
        const platforms = post.platforms ? JSON.parse(post.platforms).join('|') : '';
        const scheduledTime = new Date(post.scheduled_time).toLocaleString();
        const status = post.status;
        const media = post.media ? JSON.parse(post.media).join('|') : '';
        const tags = post.tags ? JSON.parse(post.tags).join(',') : '';
        
        csv += `${content},${platforms},${scheduledTime},${status},${media},${tags}\n`;
      }
      
      await fs.writeFile(filePath, csv, 'utf8');
      
      return {
        success: true,
        exported: posts.length,
        filePath
      };
    } catch (error) {
      throw new Error(`Failed to export CSV: ${error.message}`);
    }
  }
  
  // Escape CSV field
  escapeCSVField(field) {
    if (field === null || field === undefined) {
      return '';
    }
    
    field = String(field);
    
    // Check if field needs escaping
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      // Escape quotes by doubling them
      field = field.replace(/"/g, '""');
      // Wrap in quotes
      field = `"${field}"`;
    }
    
    return field;
  }
}

module.exports = CSVImporter;