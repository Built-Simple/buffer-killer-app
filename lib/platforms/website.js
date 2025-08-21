// Website Webhook API Implementation
// Posts content to your own website via webhook/API endpoint

const axios = require('axios');

class WebsiteAPI {
  constructor(webhookUrl, apiKey) {
    this.webhookUrl = webhookUrl;
    this.apiKey = apiKey;
    
    if (!this.webhookUrl) {
      throw new Error('Website webhook URL is required');
    }
  }
  
  // Post content to your website
  async post(content, options = {}) {
    try {
      const payload = {
        content: content,
        timestamp: new Date().toISOString(),
        source: 'buffer-killer',
        ...options // Allow custom fields
      };
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // Add API key if provided
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
        // Also support X-API-Key header format
        headers['X-API-Key'] = this.apiKey;
      }
      
      const response = await axios.post(this.webhookUrl, payload, { headers });
      
      return {
        success: true,
        id: response.data.id || Date.now(),
        url: response.data.url || this.webhookUrl,
        response: response.data
      };
    } catch (error) {
      console.error('Website webhook error:', error.response?.data || error.message);
      
      // Provide helpful error messages
      if (error.response?.status === 401) {
        throw new Error('Authentication failed. Check your API key.');
      } else if (error.response?.status === 404) {
        throw new Error('Webhook URL not found. Please check the URL.');
      } else if (error.response?.status === 500) {
        throw new Error('Server error on your website. Check server logs.');
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error('Connection refused. Is your website running?');
      } else if (error.code === 'ENOTFOUND') {
        throw new Error('Website not found. Check the URL.');
      }
      
      throw new Error(`Failed to post to website: ${error.response?.data?.message || error.message}`);
    }
  }
  
  // Test the webhook connection
  async testConnection() {
    try {
      const testPayload = {
        test: true,
        content: 'Test connection from Buffer Killer',
        timestamp: new Date().toISOString()
      };
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
        headers['X-API-Key'] = this.apiKey;
      }
      
      const response = await axios.post(this.webhookUrl, testPayload, { 
        headers,
        timeout: 5000 // 5 second timeout
      });
      
      return {
        success: true,
        message: 'Connection successful',
        response: response.data
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.response?.data
      };
    }
  }
  
  // Get webhook status (optional endpoint)
  async getStatus() {
    try {
      // Try to GET the webhook URL to check if it's alive
      const headers = {};
      
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
        headers['X-API-Key'] = this.apiKey;
      }
      
      const response = await axios.get(this.webhookUrl, { 
        headers,
        timeout: 5000
      });
      
      return {
        success: true,
        status: 'online',
        response: response.data
      };
    } catch (error) {
      return {
        success: false,
        status: 'offline',
        error: error.message
      };
    }
  }
}

module.exports = WebsiteAPI;

/* Example webhook endpoint for your website (PHP):

<?php
// webhook.php - Place this on your website

header('Content-Type: application/json');

// Check API key
$apiKey = $_SERVER['HTTP_X_API_KEY'] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? '';
$expectedKey = 'your-secret-api-key';

if ($apiKey !== $expectedKey && $apiKey !== "Bearer $expectedKey") {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// Get the POST data
$input = file_get_contents('php://input');
$data = json_decode($input, true);

// Process the post
if ($data) {
    // Save to database, create blog post, etc.
    $postId = uniqid();
    
    // Log it for now
    file_put_contents('social-posts.log', $input . "\n", FILE_APPEND);
    
    // Return success response
    echo json_encode([
        'success' => true,
        'id' => $postId,
        'url' => "https://your-website.com/posts/$postId",
        'message' => 'Post received'
    ]);
} else {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid data']);
}
?>

Example webhook endpoint for Node.js/Express:

app.post('/api/social-posts', (req, res) => {
  // Check API key
  const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
  if (apiKey !== process.env.WEBHOOK_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Process the post
  const { content, timestamp, source } = req.body;
  
  // Save to database, etc.
  const postId = Date.now();
  
  res.json({
    success: true,
    id: postId,
    url: `https://your-website.com/posts/${postId}`,
    message: 'Post received'
  });
});
*/
