# 🎨 Image Generation System Documentation

## Overview
The Buffer Killer app now includes a powerful **Image Generation System** that automatically creates professional social media images from text posts. This feature uses Puppeteer to render HTML/CSS templates into high-quality images optimized for each platform.

## Features

### ✨ Core Capabilities
- **10 Built-in Templates**: Professional designs for all major platforms
- **Custom Templates**: Create and save your own designs
- **Platform Optimization**: Auto-sized for Twitter, Instagram, LinkedIn, etc.
- **Batch Generation**: Create images for multiple posts at once
- **Real-time Preview**: See your image before generating
- **Watermarks**: Optional branding on generated images
- **High Quality**: 2x resolution for crisp display on all devices

### 🎨 Available Templates

1. **Default** - Universal design (1200×630px)
2. **Instagram Square** - Perfect 1:1 ratio (1080×1080px)  
3. **Instagram Story** - Vertical format (1080×1920px)
4. **Twitter Card** - Optimized for tweets (1200×675px)
5. **LinkedIn Post** - Professional look (1200×628px)
6. **Facebook Post** - Standard format (1200×630px)
7. **Quote** - Elegant typography for quotes
8. **Announcement** - Eye-catching for news
9. **Minimalist** - Clean, simple design
10. **Dark Mode** - Modern dark theme

## Usage Guide

### Quick Start
1. Type your post content in the composer
2. Check "🎨 Generate Image from Text"
3. Select a template
4. Click "Preview Image" to see result
5. Click "Generate Image" to create full quality
6. Attach to your post or download

### Customization Options
- **Background**: Choose from 10 gradient presets or custom color
- **Text Color**: Pick any color for your text
- **Font Size**: Adjust from 24px to 120px
- **Watermark**: Add/remove branding

### Keyboard Shortcuts
- `Ctrl+G` - Generate image
- `Ctrl+P` - Preview image
- `Ctrl+D` - Download image

## Technical Details

### Architecture
```
lib/image-generator/
├── index.js           # Core generator engine
├── template-manager.js # Template system
├── utils.js           # Helper functions
├── ipc-handlers.js    # Electron IPC
└── preload.js         # Renderer API
```

### Template Structure
```javascript
{
  name: 'Template Name',
  width: 1200,
  height: 630,
  backgroundColor: 'gradient or color',
  textColor: '#ffffff',
  fontSize: 48,
  fontFamily: 'font stack',
  padding: 60,
  watermark: true
}
```

### API Reference

#### Generate Image
```javascript
await window.electronAPI.generateImage({
  text: 'Your post content',
  template: 'instagram-square',
  backgroundColor: '#667eea',
  textColor: '#ffffff',
  fontSize: 56,
  watermark: true
});
```

#### Create Custom Template
```javascript
await window.electronAPI.createTemplate('my-template', {
  width: 1200,
  height: 630,
  backgroundColor: 'linear-gradient(45deg, #ff6b6b, #4ecdc4)',
  // ... other options
});
```

#### Batch Generation
```javascript
await window.electronAPI.generateBatchImages([
  { text: 'Post 1', template: 'twitter-card' },
  { text: 'Post 2', template: 'instagram-square' }
]);
```

## Platform Guidelines

### Twitter/X
- Recommended: 1200×675px (16:9)
- Max file size: 5MB
- Formats: PNG, JPEG, GIF

### Instagram
- Square: 1080×1080px (1:1)
- Portrait: 1080×1350px (4:5)
- Story: 1080×1920px (9:16)
- Max file size: 30MB

### LinkedIn
- Recommended: 1200×628px
- Min: 552×289px
- Max file size: 5MB

### Facebook
- Recommended: 1200×630px (1.91:1)
- Min: 600×315px
- Max file size: 4MB

## Performance Tips

1. **Preview First**: Use preview (lower quality) to test designs
2. **Batch Processing**: Generate multiple images at once
3. **Template Reuse**: Save custom templates for consistency
4. **Optimize Text**: Keep text under 200 characters for best display
5. **Cache Templates**: Templates are cached after first use

## Troubleshooting

### Common Issues

**Image not generating?**
- Check Puppeteer is installed: `npm install puppeteer`
- Ensure sufficient memory (at least 2GB free)
- Try restarting the app

**Text cut off?**
- Reduce font size
- Shorten text content
- Use a larger template

**Slow generation?**
- First generation initializes browser (takes longer)
- Subsequent generations are faster
- Close other Chrome instances

**Custom template not saving?**
- Check write permissions in templates folder
- Ensure valid JSON format
- Template name must be unique

## Advanced Features

### Custom HTML Templates
Create fully custom designs with HTML/CSS:

```javascript
const customHTML = `
  <div style="background: linear-gradient(45deg, #f093fb, #f5576c);">
    <h1>${text}</h1>
    <img src="${logo}" />
  </div>
`;
```

### Dynamic Content
Use variables in templates:
- `{text}` - Post content
- `{date}` - Current date
- `{platform}` - Target platform
- `{username}` - Account username

### Collage Creation
Combine multiple images:
```javascript
await window.electronAPI.createCollage([image1, image2], {
  layout: 'grid',
  spacing: 10
});
```

## Best Practices

1. **Brand Consistency**: Create custom templates matching your brand
2. **Text Hierarchy**: Use font size to emphasize key points
3. **Color Contrast**: Ensure text is readable on background
4. **Mobile First**: Test how images look on mobile devices
5. **A/B Testing**: Try different templates to see what performs best

## Future Enhancements

### Coming Soon
- [ ] AI-powered background generation
- [ ] Custom font upload
- [ ] Animation support (GIF/MP4)
- [ ] Template marketplace
- [ ] Advanced text effects
- [ ] QR code integration
- [ ] Chart/graph embedding
- [ ] Multiple text blocks
- [ ] Image filters
- [ ] Emoji support

## Support

For issues or feature requests, please check:
- GitHub Issues: [buffer-killer-app/issues]
- Documentation: `/docs/IMAGE_GENERATION.md`
- Discord: #image-generation channel

---

*Last Updated: January 2025*
*Version: 1.0.0*
