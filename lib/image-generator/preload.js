// Preload script for Image Generator
// Exposes image generation API to renderer process

const { contextBridge, ipcRenderer } = require('electron');

// Image Generator API
const imageGeneratorAPI = {
  // Get available templates
  getImageTemplates: () => ipcRenderer.invoke('image-generator:get-templates'),
  
  // Generate image preview
  generateImagePreview: (options) => ipcRenderer.invoke('image-generator:preview', options),
  
  // Generate full quality image
  generateImage: (options) => ipcRenderer.invoke('image-generator:generate', options),
  
  // Save image to file
  saveImage: (imageData) => ipcRenderer.invoke('image-generator:save', imageData),
  
  // Generate batch images
  generateBatchImages: (posts, options) => ipcRenderer.invoke('image-generator:batch', posts, options),
  
  // Create custom template
  createTemplate: (name, config) => ipcRenderer.invoke('image-generator:create-template', name, config),
  
  // Delete custom template
  deleteTemplate: (name) => ipcRenderer.invoke('image-generator:delete-template', name),
  
  // Generate image from URL
  generateFromURL: (url, options) => ipcRenderer.invoke('image-generator:from-url', url, options),
  
  // Create collage
  createCollage: (images, options) => ipcRenderer.invoke('image-generator:collage', images, options)
};

// Expose in main window
if (window.electronAPI) {
  // Add to existing electronAPI
  Object.assign(window.electronAPI, imageGeneratorAPI);
} else {
  // Create new electronAPI with image generator
  contextBridge.exposeInMainWorld('electronAPI', imageGeneratorAPI);
}
