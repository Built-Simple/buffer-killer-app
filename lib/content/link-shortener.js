// Link Shortener Module - Multiple services support
class LinkShortener {
  constructor() {
    this.services = {
      bitly: {
        name: 'Bitly',
        apiUrl: 'https://api-ssl.bitly.com/v4/shorten',
        requiresAuth: true,
        rateLimit: 100 // per hour
      },
      tinyurl: {
        name: 'TinyURL',
        apiUrl: 'https://api.tinyurl.com/create',
        requiresAuth: true,
        rateLimit: 600 // per month free
      },
      isgd: {
        name: 'is.gd',
        apiUrl: 'https://is.gd/create.php',
        requiresAuth: false,
        rateLimit: 10 // per minute
      },
      vgd: {
        name: 'v.gd',
        apiUrl: 'https://v.gd/create.php',
        requiresAuth: false,
        rateLimit: 10 // per minute
      }
    };
    
    this.cache = new Map(); // Cache shortened URLs
    this.rateLimits = new Map(); // Track rate limits
  }

  // Main shortening function
  async shortenUrl(longUrl, service = 'isgd', options = {}) {
    // Check cache first
    const cacheKey = `${service}:${longUrl}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Check rate limit
    if (!this.checkRateLimit(service)) {
      throw new Error(`Rate limit exceeded for ${service}`);
    }

    try {
      let shortUrl;
      
      switch (service) {
        case 'bitly':
          shortUrl = await this.shortenWithBitly(longUrl, options.apiKey);
          break;
        case 'tinyurl':
          shortUrl = await this.shortenWithTinyUrl(longUrl, options.apiKey);
          break;
        case 'isgd':
          shortUrl = await this.shortenWithIsGd(longUrl);
          break;
        case 'vgd':
          shortUrl = await this.shortenWithVgd(longUrl);
          break;
        default:
          throw new Error(`Unknown service: ${service}`);
      }

      // Cache the result
      this.cache.set(cacheKey, shortUrl);
      
      // Update rate limit
      this.updateRateLimit(service);
      
      return shortUrl;
    } catch (error) {
      console.error(`Error shortening URL with ${service}:`, error);
      throw error;
    }
  }

  // Bitly implementation
  async shortenWithBitly(longUrl, apiKey) {
    if (!apiKey) {
      throw new Error('Bitly requires an API key');
    }

    const response = await fetch(this.services.bitly.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        long_url: longUrl,
        domain: 'bit.ly'
      })
    });

    if (!response.ok) {
      throw new Error(`Bitly error: ${response.status}`);
    }

    const data = await response.json();
    return data.link;
  }

  // TinyURL implementation
  async shortenWithTinyUrl(longUrl, apiKey) {
    if (!apiKey) {
      throw new Error('TinyURL requires an API key');
    }

    const response = await fetch(this.services.tinyurl.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: longUrl,
        domain: 'tinyurl.com'
      })
    });

    if (!response.ok) {
      throw new Error(`TinyURL error: ${response.status}`);
    }

    const data = await response.json();
    return data.data.tiny_url;
  }

  // is.gd implementation (no API key required!)
  async shortenWithIsGd(longUrl) {
    const params = new URLSearchParams({
      format: 'json',
      url: longUrl
    });

    const response = await fetch(`${this.services.isgd.apiUrl}?${params}`);
    
    if (!response.ok) {
      throw new Error(`is.gd error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`is.gd error: ${data.error}`);
    }

    return data.shorturl;
  }

  // v.gd implementation (no API key required!)
  async shortenWithVgd(longUrl) {
    