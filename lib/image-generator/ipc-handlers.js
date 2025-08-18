// Image Generator IPC Handlers
// Handles communication between renderer and main process for image generation

const { ipcMain, dialog, app } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const imageGenerator = require('./index');
const templateManager = require('./template-manager');

function setupImageGeneratorIPC() {
  // Get all available templates
  ipcMain.handle('image-generator:get-templates', async () => {
    try {
      return templateManager.getAllTemplates();
    } catch (error) {
      console.error('Error getting templates:', error);
      throw error;
    }
  });

  // Generate image preview (lower quality for speed)
  ipcMain.handle('image-generator:preview', async (event, options) => {
    try {
      const previewOptions = {
        ...options,
        quality: 60,
        format: 'jpeg'
      };
      
      const result = await imageGenerator.generateImage(options.text, previewOptions);
      
      // Convert buffer to base64 for preview
      const base64 = result.buffer.toString('base64');
      const dataUrl = `data:image/${result.format};base64,${base64}`;
      
      return {
        dataUrl,
        width: result.width,
        height: result.height,
        template: result.template
      };
    } catch (error) {
      console.error('Error generating preview:', error);
      throw error;
    }
  });

  // Generate full quality image
  ipcMain.handle('image-generator:generate', async (event, options) => {
    try {
      const result = await imageGenerator.generateImage(options.text, options);
      
      // Convert buffer to base64
      const base64 = result.buffer.toString('base64');
      const dataUrl = `data:image/${result.format};base64,${base64}`;
      
      return {
        buffer: result.buffer,
        dataUrl,
        format: result.format,
        width: result.width,
        height: result.height,
        template: result.template
      };
    } catch (error) {
      console.error('Error generating image:', error);
      throw error;
    }
  });

  // Save image to file
  ipcMain.handle('image-generator:save', async (event, imageData) => {
    try {
      const result = await dialog.showSaveDialog({
        title: 'Save Image',
        defaultPath: path.join(app.getPath('pictures'), `generated-${Date.now()}.${imageData.format}`),
        filters: [
          { name: 'Images', extensions: ['png', 'jpg', 'jpeg'] },
          { name: 'PNG', extensions: ['png'] },
          { name: 'JPEG', extensions: ['jpg', 'jpeg'] }
        ]
      });

      if (!result.canceled && result.filePath) {
        // If imageData.buffer is a Buffer, write it directly
        // If it's base64, decode it first
        let buffer;
        if (Buffer.isBuffer(imageData.buffer)) {
          buffer = imageData.buffer;
        } else if (imageData.dataUrl) {
          // Extract base64 from data URL
          const base64 = imageData.dataUrl.split(',')[1];
          buffer = Buffer.from(base64, 'base64');
        }
        
        await fs.writeFile(result.filePath, buffer);
        return { success: true, filePath: result.filePath };
      }
      
      return { success: false, canceled: true };
    } catch (error) {
      console.error('Error saving image:', error);
      throw error;
    }
  });

  // Generate batch images
  ipcMain.handle('image-generator:batch', async (event, posts, options) => {
    try {
      const results = await imageGenerator.generateBatch(posts, options);
      
      // Convert buffers to base64 for successful results
      return results.map(result => {
        if (result.success && result.image) {
          const base64 = result.image.buffer.toString('base64');
          const dataUrl = `data:image/${result.image.format};base64,${base64}`;
          
          return {
            ...result,
            image: {
              ...result.image,
              dataUrl
            }
          };
        }
        return result;
      });
    } catch (error) {
      console.error('Error generating batch images:', error);
      throw error;
    }
  });

  // Create custom template
  ipcMain.handle('image-generator:create-template', async (event, name, config) => {
    try {
      await templateManager.saveCustomTemplate(name, config);
      return { success: true };
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  });

  // Delete custom template
  ipcMain.handle('image-generator:delete-template', async (event, name) => {
    try {
      await templateManager.deleteCustomTemplate(name);
      return { success: true };
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  });

  // Generate image from URL
  ipcMain.handle('image-generator:from-url', async (event, url, options) => {
    try {
      const buffer = await imageGenerator.generateFromURL(url, options);
      const base64 = buffer.toString('base64');
      const dataUrl = `data:image/${options.format || 'png'};base64,${base64}`;
      
      return {
        buffer,
        dataUrl,
        format: options.format || 'png'
      };
    } catch (error) {
      console.error('Error generating from URL:', error);
      throw error;
    }
  });

  // Create collage from multiple images
  ipcMain.handle('image-generator:collage', async (event, images, options) => {
    try {
      const buffer = await imageGenerator.createCollage(images, options);
      const base64 = buffer.toString('base64');
      const dataUrl = `data:image/png;base64,${base64}`;
      
      return {
        buffer,
        dataUrl,
        format: 'png'
      };
    } catch (error) {
      console.error('Error creating collage:', error);
      throw error;
    }
  });

  // Cleanup on app quit
  app.on('before-quit', async () => {
    await imageGenerator.cleanup();
  });

  console.log('✅ Image Generator IPC handlers registered');
}

module.exports = { setupImageGeneratorIPC };
