// GitHub API Client
// Handles creating issues, gists, and repository files for blog-style posts

const axios = require('axios');

class GitHubAPI {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.baseUrl = 'https://api.github.com';
    
    // Configure axios instance
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
  }

  // Post as a GitHub Issue (great for blog-style posts with comments)
  async createIssue(owner, repo, title, body, labels = []) {
    try {
      const data = {
        title: title,
        body: body,
        labels: labels
      };
      
      const response = await this.client.post(`/repos/${owner}/${repo}/issues`, data);
      
      return {
        id: response.data.id,
        number: response.data.number,
        url: response.data.html_url,
        title: response.data.title,
        createdAt: response.data.created_at
      };
    } catch (error) {
      console.error('Error creating issue:', error.response?.data || error.message);
      throw new Error(`Failed to create issue: ${error.response?.data?.message || error.message}`);
    }
  }

  // Post as a Markdown file in a repository
  async createRepoFile(owner, repo, path, content, message, branch = 'main') {
    try {
      // Convert content to base64
      const encodedContent = Buffer.from(content).toString('base64');
      
      const data = {
        message: message || `Add post: ${path}`,
        content: encodedContent,
        branch: branch
      };
      
      const response = await this.client.put(`/repos/${owner}/${repo}/contents/${path}`, data);
      
      return {
        path: response.data.content.path,
        sha: response.data.content.sha,
        url: response.data.content.html_url,
        downloadUrl: response.data.content.download_url
      };
    } catch (error) {
      console.error('Error creating file:', error.response?.data || error.message);
      
      // If file exists, we might want to update it
      if (error.response?.status === 422) {
        throw new Error('File already exists. Use updateRepoFile to update existing files.');
      }
      
      throw new Error(`Failed to create file: ${error.response?.data?.message || error.message}`);
    }
  }

  // Update an existing file in a repository
  async updateRepoFile(owner, repo, path, content, message, sha, branch = 'main') {
    try {
      const encodedContent = Buffer.from(content).toString('base64');
      
      const data = {
        message: message || `Update post: ${path}`,
        content: encodedContent,
        sha: sha, // Required for updates
        branch: branch
      };
      
      const response = await this.client.put(`/repos/${owner}/${repo}/contents/${path}`, data);
      
      return {
        path: response.data.content.path,
        sha: response.data.content.sha,
        url: response.data.content.html_url,
        downloadUrl: response.data.content.download_url
      };
    } catch (error) {
      console.error('Error updating file:', error.response?.data || error.message);
      throw new Error(`Failed to update file: ${error.response?.data?.message || error.message}`);
    }
  }

  // Get file content (to check if it exists)
  async getRepoFile(owner, repo, path, branch = 'main') {
    try {
      const response = await this.client.get(`/repos/${owner}/${repo}/contents/${path}`, {
        params: { ref: branch }
      });
      
      return {
        sha: response.data.sha,
        content: Buffer.from(response.data.content, 'base64').toString('utf8'),
        url: response.data.html_url
      };
    } catch (error) {
      if (error.response?.status === 404) {
        return null; // File doesn't exist
      }
      throw error;
    }
  }

  // Create a Gist (great for code snippets or short posts)
  async createGist(description, files, isPublic = true) {
    try {
      const data = {
        description: description,
        public: isPublic,
        files: files // Object with filename as key and {content: "..."} as value
      };
      
      const response = await this.client.post('/gists', data);
      
      return {
        id: response.data.id,
        url: response.data.html_url,
        description: response.data.description,
        createdAt: response.data.created_at
      };
    } catch (error) {
      console.error('Error creating gist:', error.response?.data || error.message);
      throw new Error(`Failed to create gist: ${error.response?.data?.message || error.message}`);
    }
  }

  // Create a discussion (if the repo has discussions enabled)
  async createDiscussion(owner, repo, categoryId, title, body) {
    try {
      // This uses GitHub's GraphQL API
      const query = `
        mutation {
          createDiscussion(input: {
            repositoryId: "${repo}",
            categoryId: "${categoryId}",
            title: "${title}",
            body: "${body}"
          }) {
            discussion {
              id
              url
            }
          }
        }
      `;
      
      const response = await axios.post(
        'https://api.github.com/graphql',
        { query },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return {
        id: response.data.data.createDiscussion.discussion.id,
        url: response.data.data.createDiscussion.discussion.url
      };
    } catch (error) {
      console.error('Error creating discussion:', error.response?.data || error.message);
      throw new Error(`Failed to create discussion: ${error.response?.data?.message || error.message}`);
    }
  }

  // Get user's repositories
  async getUserRepos(type = 'owner', sort = 'updated') {
    try {
      const response = await this.client.get('/user/repos', {
        params: {
          type: type, // owner, member, all
          sort: sort, // created, updated, pushed, full_name
          per_page: 100
        }
      });
      
      return response.data.map(repo => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        private: repo.private,
        url: repo.html_url,
        defaultBranch: repo.default_branch
      }));
    } catch (error) {
      console.error('Error getting repos:', error.response?.data || error.message);
      throw new Error(`Failed to get repositories: ${error.response?.data?.message || error.message}`);
    }
  }

  // Post a status update (using a special repo or gist)
  async postStatus(content, options = {}) {
    const {
      repo = 'social-posts',
      owner = null,
      type = 'issue' // 'issue', 'file', or 'gist'
    } = options;
    
    try {
      // Get username if not provided
      let username = owner;
      if (!username) {
        const user = await this.client.get('/user');
        username = user.data.login;
      }
      
      const timestamp = new Date().toISOString();
      const title = content.substring(0, 50) + (content.length > 50 ? '...' : '');
      
      if (type === 'issue') {
        // Post as an issue
        return await this.createIssue(username, repo, title, content, ['social-post']);
      } else if (type === 'file') {
        // Post as a markdown file
        const date = new Date();
        const filename = `posts/${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${Date.now()}.md`;
        const fileContent = `---
title: ${title}
date: ${timestamp}
---

${content}`;
        
        return await this.createRepoFile(username, repo, filename, fileContent, `Add post: ${title}`);
      } else if (type === 'gist') {
        // Post as a gist
        const filename = `${Date.now()}.md`;
        return await this.createGist(title, {
          [filename]: { content: content }
        });
      }
    } catch (error) {
      console.error('Error posting status:', error);
      throw error;
    }
  }

  // Get rate limit status
  async getRateLimit() {
    try {
      const response = await this.client.get('/rate_limit');
      return response.data.rate;
    } catch (error) {
      console.error('Error getting rate limit:', error.response?.data || error.message);
      throw new Error(`Failed to get rate limit: ${error.response?.data?.message || error.message}`);
    }
  }
}

module.exports = GitHubAPI;