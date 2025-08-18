// Twitter/X API v2 Implementation with Rate Limiting
// Handles posting tweets, threads, and media uploads with automatic rate limiting

const axios = require('axios');
const { withRateLimit, PRIORITY } = require('../rate-limiter');

class TwitterAPI {
  constructor(accessToken, accountId = 'default') {
    this.accessToken = accessToken;
    this.accountId = accountId; // For rate limiting isolation
    this.apiUrl = 'https://api.twitter.com/2';
    this.uploadUrl = 'https://upload.twitter.com/1.1';
  }

  // Set or update access token
  setAccessToken(token) {
    this.accessToken = token;
  }

  // Set account ID for rate limiting
  setAccountId(accountId) {
    this.accountId = accountId;
  }

  // Post a tweet with rate limiting
  async postTweet(text, options = {}) {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    return withRateLimit(
      'twitter',
      this.accountId,
      async () => {
        try {
          const data = {
            text: text
          };

          // Add optional parameters
          if (options.replyToId) {
            data.reply = { in_reply_to_tweet_id: options.replyToId };
          }

          if (options.mediaIds && options.mediaIds.length > 0) {
            data.media = { media_ids: options.mediaIds };
          }

          if (options.pollOptions) {
            data.poll = {
              options: options.pollOptions,
              duration_minutes: options.pollDuration || 1440 // Default 24 hours
            };
          }

          const response = await axios.post(
            `${this.apiUrl}/tweets`,
            data,
            {
              headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
              }
            }
          );

          return {
            success: true,
            data: response.data.data,
            id: response.data.data.id,
            text: response.data.data.text
          };
        } catch (error) {
          console.error('Error posting tweet:', error.response?.data || error.message);
          
          // Handle rate limiting
          if (error.response?.status === 429) {
            const resetTime = error.response.headers['x-rate-limit-reset'];
            const retryAfter = error.response.headers['retry-after'];
            
            // Create error with rate limit info for the rate limiter to handle
            const rateLimitError = new Error(`Rate limit exceeded. Resets at ${new Date(resetTime * 1000).toLocaleString()}`);
            rateLimitError.statusCode = 429;
            rateLimitError.retryAfter = retryAfter;
            throw rateLimitError;
          }
          
          throw new Error(`Failed to post tweet: ${error.response?.data?.detail || error.message}`);
        }
      },
      { 
        priority: PRIORITY.CRITICAL, // Posts have highest priority
        endpoint: 'tweets'
      }
    );
  }

  // Post a thread (multiple tweets) with rate limiting
  async postThread(tweets) {
    if (!Array.isArray(tweets) || tweets.length === 0) {
      throw new Error('Tweets must be a non-empty array');
    }

    const postedTweets = [];
    let replyToId = null;

    try {
      for (let i = 0; i < tweets.length; i++) {
        const tweetText = tweets[i];
        const options = {};
        
        // Reply to previous tweet in thread
        if (replyToId) {
          options.replyToId = replyToId;
        }

        const result = await this.postTweet(tweetText, options);
        postedTweets.push(result);
        replyToId = result.id;

        // Rate limiter handles delays automatically
      }

      return {
        success: true,
        tweets: postedTweets,
        threadId: postedTweets[0].id
      };
    } catch (error) {
      console.error('Error posting thread:', error);
      throw new Error(`Failed to post thread: ${error.message}`);
    }
  }

  // Delete a tweet with rate limiting
  async deleteTweet(tweetId) {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    return withRateLimit(
      'twitter',
      this.accountId,
      async () => {
        try {
          const response = await axios.delete(
            `${this.apiUrl}/tweets/${tweetId}`,
            {
              headers: {
                'Authorization': `Bearer ${this.accessToken}`
              }
            }
          );

          return {
            success: true,
            deleted: response.data.data.deleted
          };
        } catch (error) {
          console.error('Error deleting tweet:', error.response?.data || error.message);
          
          if (error.response?.status === 429) {
            const rateLimitError = new Error('Rate limit exceeded');
            rateLimitError.statusCode = 429;
            rateLimitError.retryAfter = error.response.headers['retry-after'];
            throw rateLimitError;
          }
          
          throw new Error(`Failed to delete tweet: ${error.response?.data?.detail || error.message}`);
        }
      },
      { 
        priority: PRIORITY.HIGH, 
        endpoint: 'tweets'
      }
    );
  }

  // Get tweet metrics with rate limiting
  async getTweetMetrics(tweetId) {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    return withRateLimit(
      'twitter',
      this.accountId,
      async () => {
        try {
          const response = await axios.get(
            `${this.apiUrl}/tweets/${tweetId}`,
            {
              headers: {
                'Authorization': `Bearer ${this.accessToken}`
              },
              params: {
                'tweet.fields': 'public_metrics,created_at',
                'expansions': 'author_id'
              }
            }
          );

          return {
            success: true,
            metrics: response.data.data.public_metrics,
            createdAt: response.data.data.created_at
          };
        } catch (error) {
          console.error('Error getting tweet metrics:', error.response?.data || error.message);
          
          if (error.response?.status === 429) {
            const rateLimitError = new Error('Rate limit exceeded');
            rateLimitError.statusCode = 429;
            rateLimitError.retryAfter = error.response.headers['retry-after'];
            throw rateLimitError;
          }
          
          throw new Error(`Failed to get tweet metrics: ${error.response?.data?.detail || error.message}`);
        }
      },
      { 
        priority: PRIORITY.LOW, // Analytics have lower priority
        endpoint: 'tweets'
      }
    );
  }

  // Check rate limit status with rate limiting
  async getRateLimitStatus() {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    return withRateLimit(
      'twitter',
      this.accountId,
      async () => {
        try {
          // Make a lightweight request to check headers
          const response = await axios.get(
            `${this.apiUrl}/users/me`,
            {
              headers: {
                'Authorization': `Bearer ${this.accessToken}`
              }
            }
          );

          const headers = response.headers;
          
          return {
            limit: parseInt(headers['x-rate-limit-limit'] || 0),
            remaining: parseInt(headers['x-rate-limit-remaining'] || 0),
            reset: new Date(parseInt(headers['x-rate-limit-reset'] || 0) * 1000)
          };
        } catch (error) {
          console.error('Error checking rate limit:', error.response?.data || error.message);
          
          if (error.response?.status === 429) {
            const rateLimitError = new Error('Rate limit exceeded');
            rateLimitError.statusCode = 429;
            rateLimitError.retryAfter = error.response.headers['retry-after'];
            throw rateLimitError;
          }
          
          throw error;
        }
      },
      { 
        priority: PRIORITY.BACKGROUND,
        endpoint: 'users' 
      }
    );
  }

  // Utility function for delays
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Upload media (images/videos) with rate limiting
  async uploadMedia(mediaBuffer, mediaType) {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    return withRateLimit(
      'twitter',
      this.accountId,
      async () => {
        try {
          // Step 1: Initialize upload
          const totalBytes = mediaBuffer.length;
          const mediaCategory = mediaType.startsWith('video/') ? 'tweet_video' : 'tweet_image';
          
          const initResponse = await axios.post(
            `${this.uploadUrl}/media/upload.json`,
            null,
            {
              headers: {
                'Authorization': `Bearer ${this.accessToken}`,
              },
              params: {
                command: 'INIT',
                total_bytes: totalBytes,
                media_type: mediaType,
                media_category: mediaCategory
              }
            }
          );

          const mediaId = initResponse.data.media_id_string;

          // Step 2: Upload media in chunks (for large files)
          const chunkSize = 5 * 1024 * 1024; // 5MB chunks
          let segmentIndex = 0;
          
          for (let i = 0; i < totalBytes; i += chunkSize) {
            const chunk = mediaBuffer.slice(i, Math.min(i + chunkSize, totalBytes));
            
            const formData = new FormData();
            formData.append('command', 'APPEND');
            formData.append('media_id', mediaId);
            formData.append('segment_index', segmentIndex);
            formData.append('media', chunk, {
              filename: 'media',
              contentType: 'application/octet-stream'
            });

            await axios.post(
              `${this.uploadUrl}/media/upload.json`,
              formData,
              {
                headers: {
                  'Authorization': `Bearer ${this.accessToken}`,
                  ...formData.getHeaders()
                }
              }
            );
            
            segmentIndex++;
          }

          // Step 3: Finalize upload
          const finalizeResponse = await axios.post(
            `${this.uploadUrl}/media/upload.json`,
            null,
            {
              headers: {
                'Authorization': `Bearer ${this.accessToken}`,
              },
              params: {
                command: 'FINALIZE',
                media_id: mediaId
              }
            }
          );

          // Step 4: Check status if processing is required
          if (finalizeResponse.data.processing_info) {
            await this.waitForMediaProcessing(mediaId);
          }

          return {
            success: true,
            mediaId: mediaId,
            mediaUrl: finalizeResponse.data.media_url || null
          };
        } catch (error) {
          console.error('Error uploading media:', error.response?.data || error.message);
          
          if (error.response?.status === 429) {
            const rateLimitError = new Error('Rate limit exceeded');
            rateLimitError.statusCode = 429;
            rateLimitError.retryAfter = error.response.headers['retry-after'];
            throw rateLimitError;
          }
          
          throw new Error(`Failed to upload media: ${error.response?.data?.error || error.message}`);
        }
      },
      { 
        priority: PRIORITY.HIGH,
        endpoint: 'mediaUpload'
      }
    );
  }

  // Wait for media processing to complete (already rate limited through uploadMedia)
  async waitForMediaProcessing(mediaId, maxAttempts = 20) {
    for (let i = 0; i < maxAttempts; i++) {
      const statusResponse = await axios.get(
        `${this.uploadUrl}/media/upload.json`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
          params: {
            command: 'STATUS',
            media_id: mediaId
          }
        }
      );

      const processingInfo = statusResponse.data.processing_info;
      
      if (!processingInfo) {
        return true; // Processing complete
      }

      if (processingInfo.state === 'succeeded') {
        return true;
      }

      if (processingInfo.state === 'failed') {
        throw new Error(`Media processing failed: ${processingInfo.error?.message || 'Unknown error'}`);
      }

      // Wait before checking again
      const checkAfterSecs = processingInfo.check_after_secs || 1;
      await this.delay(checkAfterSecs * 1000);
    }

    throw new Error('Media processing timed out');
  }
}

module.exports = TwitterAPI;
