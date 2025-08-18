// Image Generator Utilities
// Helper functions for image generation

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

async function createTempFile(content, extension = 'html') {
  const tempDir = path.join(__dirname, '../../temp');
  
  // Ensure temp directory exists
  try {
    await fs.mkdir(tempDir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
  
  const filename = `temp_${crypto.randomBytes(8).toString('hex')}.${extension}`;
  const filepath = path.join(tempDir, filename);
  
  await fs.writeFile(filepath, content);
  
  return filepath;
}

async function cleanupTempFiles() {
  const tempDir = path.join(__dirname, '../../temp');
  
  try {
    const files = await fs.readdir(tempDir);
    
    for (const file of files) {
      if (file.startsWith('temp_')) {
        const filepath = path.join(tempDir, file);
        const stats = await fs.stat(filepath);
        
        // Delete files older than 1 hour
        const hourAgo = Date.now() - (60 * 60 * 1000);
        if (stats.mtimeMs < hourAgo) {
          await fs.unlink(filepath);
        }
      }
    }
  } catch (error) {
    // Temp directory might not exist
  }
}

function getImageDimensions(platform) {
  const dimensions = {
    'twitter': { width: 1200, height: 675 },
    'instagram-square': { width: 1080, height: 1080 },
    'instagram-story': { width: 1080, height: 1920 },
    'instagram-landscape': { width: 1080, height: 566 },
    'instagram-portrait': { width: 1080, height: 1350 },
    'facebook': { width: 1200, height: 630 },
    'linkedin': { width: 1200, height: 628 },
    'pinterest': { width: 1000, height: 1500 },
    'youtube-thumbnail': { width: 1280, height: 720 },
    'default': { width: 1200, height: 630 }
  };
  
  return dimensions[platform] || dimensions.default;
}

function generateGradient(type = 'random') {
  const gradients = {
    'purple': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'blue': 'linear-gradient(135deg, #3494E6 0%, #EC6EAD 100%)',
    'green': 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    'orange': 'linear-gradient(135deg, #fc4a1a 0%, #f7b733 100%)',
    'pink': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'teal': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'sunset': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'ocean': 'linear-gradient(135deg, #330867 0%, #30cfd0 100%)',
    'forest': 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
    'fire': 'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)'
  };
  
  if (type === 'random') {
    const keys = Object.keys(gradients);
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    return gradients[randomKey];
  }
  
  return gradients[type] || gradients.purple;
}

function generateColorPalette(baseColor) {
  // Simple color palette generation
  // In a real app, you'd use a proper color theory library
  return {
    primary: baseColor,
    secondary: adjustBrightness(baseColor, -20),
    accent: adjustBrightness(baseColor, 30),
    text: getContrastColor(baseColor),
    background: adjustBrightness(baseColor, 60)
  };
}

function adjustBrightness(color, percent) {
  // Simple brightness adjustment
  // Convert hex to RGB, adjust, convert back
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  
  return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255))
    .toString(16).slice(1);
}

function getContrastColor(hexcolor) {
  // Determine if text should be white or black based on background
  const r = parseInt(hexcolor.substr(1, 2), 16);
  const g = parseInt(hexcolor.substr(3, 2), 16);
  const b = parseInt(hexcolor.substr(5, 2), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '#000000' : '#ffffff';
}

async function saveImageToFile(buffer, filename, outputDir) {
  const outputPath = path.join(outputDir, filename);
  await fs.writeFile(outputPath, buffer);
  return outputPath;
}

function validateImageOptions(options) {
  const errors = [];
  
  if (options.width && (options.width < 100 || options.width > 4000)) {
    errors.push('Width must be between 100 and 4000 pixels');
  }
  
  if (options.height && (options.height < 100 || options.height > 4000)) {
    errors.push('Height must be between 100 and 4000 pixels');
  }
  
  if (options.quality && (options.quality < 1 || options.quality > 100)) {
    errors.push('Quality must be between 1 and 100');
  }
  
  if (options.fontSize && (options.fontSize < 10 || options.fontSize > 200)) {
    errors.push('Font size must be between 10 and 200');
  }
  
  return errors;
}

// Cleanup temp files periodically
setInterval(cleanupTempFiles, 60 * 60 * 1000); // Every hour

module.exports = {
  createTempFile,
  cleanupTempFiles,
  getImageDimensions,
  generateGradient,
  generateColorPalette,
  adjustBrightness,
  getContrastColor,
  saveImageToFile,
  validateImageOptions
};
