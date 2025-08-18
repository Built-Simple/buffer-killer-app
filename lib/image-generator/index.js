// Image Generator Core Module
// Generates images from text using Puppeteer and HTML/CSS templates

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;
const templateManager = require('./template-manager');
const { createTempFile } = require('./utils');

class ImageGenerator {
  constructor() {
    this.browser = null;
    this.isInitialized = false;
    this.generationQueue = [];
    this.isProcessing = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      console.log('🚀 Initializing Puppeteer browser...');
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });
      this.isInitialized = true;
      console.log('✅ Browser initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize browser:', error);
      throw error;
    }
  }

  async generateImage(text, options = {}) {
    const {
      template = 'default',
      platform = 'general',
      backgroundColor = null,
      textColor = null,
      fontSize = null,
      fontFamily = null,
      logo = null,
      watermark = true,
      format = 'png',
      quality = 90
    } = options;

    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Get template configuration
      const templateConfig = await templateManager.getTemplate(template, platform);
      
      // Merge custom options with template defaults
      const finalConfig = {
        ...templateConfig,
        text,
        backgroundColor: backgroundColor || templateConfig.backgroundColor,
        textColor: textColor || templateConfig.textColor,
        fontSize: fontSize || templateConfig.fontSize,
        fontFamily: fontFamily || templateConfig.fontFamily,
        logo: logo || templateConfig.logo,
        watermark: watermark !== false ? templateConfig.watermark : false
      };

      // Generate HTML from template
      const html = await templateManager.renderTemplate(finalConfig);
      
      // Create new page
      const page = await this.browser.newPage();
      
      // Set viewport to template dimensions
      await page.setViewport({
        width: templateConfig.width,
        height: templateConfig.height,
        deviceScaleFactor: 2 // For high quality
      });

      // Set content
      await page.setContent(html, {
        waitUntil: 'networkidle0'
      });

      // Wait for fonts to load
      await page.evaluateHandle('document.fonts.ready');

      // Take screenshot
      const screenshot = await page.screenshot({
        type: format,
        quality: format === 'jpeg' ? quality : undefined,
        omitBackground: format === 'png'
      });

      // Close page
      await page.close();

      return {
        buffer: screenshot,
        format,
        width: templateConfig.width,
        height: templateConfig.height,
        template: template
      };

    } catch (error) {
      console.error('Error generating image:', error);
      throw error;
    }
  }

  async generateBatch(posts, options = {}) {
    const results = [];
    
    for (const post of posts) {
      try {
        const result = await this.generateImage(post.text, {
          ...options,
          template: post.template || options.template,
          platform: post.platform || options.platform
        });
        
        results.push({
          success: true,
          postId: post.id,
          image: result
        });
      } catch (error) {
        results.push({
          success: false,
          postId: post.id,
          error: error.message
        });
      }
    }
    
    return results;
  }

  async generateFromURL(url, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const page = await this.browser.newPage();
    
    try {
      // Navigate to URL
      await page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Get dimensions or use defaults
      const dimensions = options.dimensions || { width: 1200, height: 630 };
      
      await page.setViewport({
        width: dimensions.width,
        height: dimensions.height,
        deviceScaleFactor: 2
      });

      // Take screenshot
      const screenshot = await page.screenshot({
        type: options.format || 'png',
        quality: options.quality || 90,
        fullPage: options.fullPage || false
      });

      return screenshot;

    } finally {
      await page.close();
    }
  }

  async createCollage(images, options = {}) {
    const {
      layout = 'grid',
      spacing = 10,
      backgroundColor = '#ffffff',
      width = 1200,
      height = 1200
    } = options;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            width: ${width}px;
            height: ${height}px;
            background: ${backgroundColor};
            display: flex;
            flex-wrap: wrap;
            gap: ${spacing}px;
            padding: ${spacing}px;
            align-items: center;
            justify-content: center;
          }
          .image {
            flex: 1;
            min-width: calc(50% - ${spacing}px);
            height: calc(50% - ${spacing}px);
            background-size: cover;
            background-position: center;
            border-radius: 8px;
          }
        </style>
      </head>
      <body>
        ${images.map((img, i) => `
          <div class="image" style="background-image: url('${img}')"></div>
        `).join('')}
      </body>
      </html>
    `;

    const page = await this.browser.newPage();
    
    try {
      await page.setViewport({ width, height, deviceScaleFactor: 2 });
      await page.setContent(html);
      
      const screenshot = await page.screenshot({
        type: 'png',
        omitBackground: false
      });
      
      return screenshot;
      
    } finally {
      await page.close();
    }
  }

  async addWatermark(imageBuffer, watermarkText, options = {}) {
    const {
      position = 'bottom-right',
      fontSize = 14,
      opacity = 0.7,
      color = '#ffffff'
    } = options;

    // This would use Sharp or Canvas to add watermark
    // For now, return the original buffer
    return imageBuffer;
  }

  async optimizeImage(imageBuffer, options = {}) {
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 85,
      format = 'jpeg'
    } = options;

    // This would use Sharp to optimize
    // For now, return the original buffer
    return imageBuffer;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.isInitialized = false;
    }
  }
}

// Export singleton instance
module.exports = new ImageGenerator();
