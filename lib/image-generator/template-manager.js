// Template Manager
// Manages image templates and renders them with data

const fs = require('fs').promises;
const path = require('path');

class TemplateManager {
  constructor() {
    this.templates = new Map();
    this.customTemplates = new Map();
    this.loadBuiltInTemplates();
  }

  loadBuiltInTemplates() {
    // Default template
    this.templates.set('default', {
      name: 'Default',
      width: 1200,
      height: 630,
      backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      textColor: '#ffffff',
      fontSize: 48,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: 60,
      watermark: true
    });

    // Instagram Square
    this.templates.set('instagram-square', {
      name: 'Instagram Square',
      width: 1080,
      height: 1080,
      backgroundColor: 'linear-gradient(45deg, #f093fb 0%, #f5576c 100%)',
      textColor: '#ffffff',
      fontSize: 56,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: 80,
      watermark: true
    });

    // Instagram Story
    this.templates.set('instagram-story', {
      name: 'Instagram Story',
      width: 1080,
      height: 1920,
      backgroundColor: 'linear-gradient(180deg, #a8edea 0%, #fed6e3 100%)',
      textColor: '#2d3436',
      fontSize: 64,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: 100,
      watermark: true
    });

    // Twitter/X Card
    this.templates.set('twitter-card', {
      name: 'Twitter Card',
      width: 1200,
      height: 675,
      backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      textColor: '#ffffff',
      fontSize: 52,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: 60,
      watermark: true
    });

    // LinkedIn Post
    this.templates.set('linkedin-post', {
      name: 'LinkedIn Post',
      width: 1200,
      height: 628,
      backgroundColor: '#0077b5',
      textColor: '#ffffff',
      fontSize: 48,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: 60,
      watermark: true
    });

    // Facebook Post
    this.templates.set('facebook-post', {
      name: 'Facebook Post',
      width: 1200,
      height: 630,
      backgroundColor: '#1877f2',
      textColor: '#ffffff',
      fontSize: 48,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: 60,
      watermark: true
    });

    // Quote Template
    this.templates.set('quote', {
      name: 'Quote',
      width: 1080,
      height: 1080,
      backgroundColor: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      textColor: '#2c3e50',
      fontSize: 48,
      fontFamily: 'Georgia, serif',
      padding: 100,
      watermark: true,
      quoteMarks: true
    });

    // Announcement Template
    this.templates.set('announcement', {
      name: 'Announcement',
      width: 1200,
      height: 630,
      backgroundColor: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
      textColor: '#2c3e50',
      fontSize: 56,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: 60,
      watermark: true,
      badge: '📢 ANNOUNCEMENT'
    });

    // Minimalist Template
    this.templates.set('minimalist', {
      name: 'Minimalist',
      width: 1200,
      height: 630,
      backgroundColor: '#ffffff',
      textColor: '#000000',
      fontSize: 42,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: 80,
      watermark: false,
      border: '2px solid #000000'
    });

    // Dark Mode Template
    this.templates.set('dark', {
      name: 'Dark Mode',
      width: 1200,
      height: 630,
      backgroundColor: '#1a1a1a',
      textColor: '#ffffff',
      fontSize: 48,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: 60,
      watermark: true,
      accent: '#00ff88'
    });
  }

  async getTemplate(templateId, platform = null) {
    // If platform-specific template requested
    if (platform && this.templates.has(`${platform}-post`)) {
      return this.templates.get(`${platform}-post`);
    }
    
    // Return requested template or default
    return this.templates.get(templateId) || this.templates.get('default');
  }

  async renderTemplate(config) {
    const {
      text,
      width,
      height,
      backgroundColor,
      textColor,
      fontSize,
      fontFamily,
      padding,
      watermark,
      logo,
      quoteMarks,
      badge,
      border,
      accent
    } = config;

    // Process text for better display
    const processedText = this.processText(text);
    
    // Calculate dynamic font size if text is too long
    const dynamicFontSize = this.calculateFontSize(text, width, height, fontSize, padding);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Playfair+Display:wght@700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      width: ${width}px;
      height: ${height}px;
      background: ${backgroundColor};
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
      ${border ? `border: ${border};` : ''}
    }
    
    .container {
      width: 100%;
      height: 100%;
      padding: ${padding}px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    
    .content {
      text-align: center;
      max-width: 90%;
    }
    
    .text {
      color: ${textColor};
      font-size: ${dynamicFontSize}px;
      font-family: ${fontFamily};
      font-weight: 600;
      line-height: 1.4;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
      word-wrap: break-word;
      ${quoteMarks ? `quotes: "\"" "\"" "'" "'";` : ''}
    }
    
    ${quoteMarks ? `
    .text::before {
      content: open-quote;
      font-size: 1.5em;
      color: ${accent || textColor};
      opacity: 0.7;
    }
    
    .text::after {
      content: close-quote;
      font-size: 1.5em;
      color: ${accent || textColor};
      opacity: 0.7;
    }
    ` : ''}
    
    ${badge ? `
    .badge {
      position: absolute;
      top: ${padding}px;
      left: 50%;
      transform: translateX(-50%);
      background: ${accent || 'rgba(255,255,255,0.2)'};
      color: ${textColor};
      padding: 8px 24px;
      border-radius: 24px;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 1px;
      backdrop-filter: blur(10px);
    }
    ` : ''}
    
    ${watermark ? `
    .watermark {
      position: absolute;
      bottom: ${padding / 2}px;
      right: ${padding / 2}px;
      color: ${textColor};
      font-size: 14px;
      opacity: 0.5;
      font-family: ${fontFamily};
      font-weight: 600;
    }
    ` : ''}
    
    ${logo ? `
    .logo {
      position: absolute;
      top: ${padding / 2}px;
      left: ${padding / 2}px;
      width: 60px;
      height: 60px;
      background-image: url('${logo}');
      background-size: contain;
      background-repeat: no-repeat;
    }
    ` : ''}
    
    .decoration {
      position: absolute;
      width: 100%;
      height: 100%;
      pointer-events: none;
      opacity: 0.1;
    }
    
    .decoration::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, ${accent || textColor} 1px, transparent 1px);
      background-size: 50px 50px;
      transform: rotate(45deg);
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .text {
      animation: fadeIn 0.6s ease-out;
    }
  </style>
</head>
<body>
  <div class="container">
    ${badge ? `<div class="badge">${badge}</div>` : ''}
    ${logo ? `<div class="logo"></div>` : ''}
    <div class="decoration"></div>
    <div class="content">
      <p class="text">${processedText}</p>
    </div>
    ${watermark ? `<div class="watermark">Built Simple Scheduler</div>` : ''}
  </div>
</body>
</html>
    `;

    return html;
  }

  processText(text) {
    // Convert line breaks to HTML
    let processed = text.replace(/\n/g, '<br>');
    
    // Escape HTML entities
    processed = processed
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    
    // Add emphasis to hashtags
    processed = processed.replace(/#(\w+)/g, '<span style="opacity: 0.8">#$1</span>');
    
    // Add emphasis to @mentions
    processed = processed.replace(/@(\w+)/g, '<span style="opacity: 0.8">@$1</span>');
    
    return processed;
  }

  calculateFontSize(text, width, height, baseFontSize, padding) {
    const maxWidth = width - (padding * 2);
    const maxHeight = height - (padding * 2);
    const textLength = text.length;
    
    // Rough calculation of optimal font size
    if (textLength < 50) {
      return baseFontSize;
    } else if (textLength < 100) {
      return Math.floor(baseFontSize * 0.9);
    } else if (textLength < 200) {
      return Math.floor(baseFontSize * 0.75);
    } else if (textLength < 300) {
      return Math.floor(baseFontSize * 0.65);
    } else {
      return Math.floor(baseFontSize * 0.5);
    }
  }

  async saveCustomTemplate(name, config) {
    this.customTemplates.set(name, config);
    
    // Save to file
    const templatesPath = path.join(__dirname, '../../templates/custom-templates.json');
    const existing = await this.loadCustomTemplates();
    existing[name] = config;
    
    await fs.writeFile(templatesPath, JSON.stringify(existing, null, 2));
  }

  async loadCustomTemplates() {
    try {
      const templatesPath = path.join(__dirname, '../../templates/custom-templates.json');
      const data = await fs.readFile(templatesPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return {};
    }
  }

  getAllTemplates() {
    const builtIn = Array.from(this.templates.entries()).map(([id, template]) => ({
      id,
      ...template,
      type: 'built-in'
    }));
    
    const custom = Array.from(this.customTemplates.entries()).map(([id, template]) => ({
      id,
      ...template,
      type: 'custom'
    }));
    
    return [...builtIn, ...custom];
  }

  async deleteCustomTemplate(name) {
    this.customTemplates.delete(name);
    
    const templatesPath = path.join(__dirname, '../../templates/custom-templates.json');
    const existing = await this.loadCustomTemplates();
    delete existing[name];
    
    await fs.writeFile(templatesPath, JSON.stringify(existing, null, 2));
  }
}

module.exports = new TemplateManager();
