# Buffer Killer - Free Social Media Scheduler

A free, open-source alternative to Buffer. Schedule posts across multiple platforms without monthly fees!

## ✅ Working Platforms

| Platform | Status | Auth Method | Requirements |
|----------|--------|-------------|--------------|
| Twitter/X | ✅ Working | Browser OAuth 2.0 PKCE | None - fully automated! |
| Mastodon | ✅ Working | Dynamic App Registration | None - pick your instance! |
| GitHub | ✅ Working | OAuth App | User's Client ID/Secret |
| LinkedIn | ✅ Working | OAuth 2.0 | User's Client ID/Secret |
| Facebook | ❌ TODO | - | - |
| Instagram | ❌ TODO | - | - |

## Features

- 📅 **Schedule posts** for any time
- 🖼️ **Media uploads** (images & videos)
- 📝 **Draft system** with auto-save
- 📊 **Analytics dashboard** 
- 🎨 **Image generation** from text
- 📁 **CSV import/export**
- ⚡ **Rate limiting** protection
- 🔌 **Plugin system**

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the app:**
   ```bash
   npm start
   ```

3. **Configure platforms:**
   - **Twitter/Mastodon**: Just click connect!
   - **LinkedIn**: Create app at [developer.linkedin.com](https://developer.linkedin.com), add credentials in Settings
   - **GitHub**: Create OAuth app, add credentials in Settings

## Platform Details

### Twitter/X ✅
- **No API keys needed!** Uses browser OAuth 2.0 with PKCE
- Posts tweets successfully
- Media upload support
- 2-hour token refresh cycle

### Mastodon ✅
- **No API keys needed!** Dynamic app registration
- Multi-instance support - user selects their instance
- Posts toots successfully
- Media upload support

### GitHub ✅
- Posts as issues to repositories
- Browser-based OAuth flow
- User provides their own OAuth app credentials
- Configurable default repository

### LinkedIn ✅
- Posts to LinkedIn feed
- Uses `w_member_social` scope (no LinkedIn review needed!)
- 60-day access tokens
- REST API implementation

## Why Buffer Killer?

### 🆓 No Monthly Fees!
- Own your data
- No usage limits
- Self-hosted
- Fully open source

### 🔒 Privacy First
- All data stored locally
- No tracking or analytics
- Secure token storage with Electron safeStorage
- You control your OAuth apps

### 🚀 Developer Friendly
- MIT License - use freely!
- Plugin architecture
- SQLite database
- Modern tech stack

## Tech Stack

- **Electron v28** - Desktop app framework
- **Node.js v18+** - Runtime
- **SQLite** - Local database
- **Puppeteer** - Image generation
- **FFmpeg.wasm** - Video editing
- **OAuth 2.0** - Secure authentication

## Key Files

- `main.js` - Electron main process with OAuth handling
- `renderer.js` - UI logic and interactions  
- `index.html` - Main interface
- `lib/platforms/` - Platform implementations
- `src/database/` - Database layer
- `.env` - User's API credentials (git ignored)

## Development Status

### ✅ FULLY WORKING:
- Twitter/X posting with browser OAuth
- Mastodon multi-instance support
- GitHub issue creation
- LinkedIn posting with w_member_social scope
- Full scheduling system with SQLite
- Media uploads and video support
- Draft system with auto-save
- CSV import/export
- Rate limiting per platform
- Analytics dashboard
- Image generation (10 templates)
- Plugin architecture

### ⚠️ TODO:
- Facebook integration (complex API)
- Instagram integration (requires Facebook Graph API)
- Bulk operations improvements
- Team features
- Mobile companion app

## Requirements

- **Node.js v18+**
- **Electron v28**
- **For LinkedIn & GitHub**: User provides OAuth app credentials
- **For Twitter/Mastodon**: No setup required!

## License

MIT - Use it however you want!

## Contributing

This is an open source project. Feel free to:
- Report bugs
- Request features  
- Submit pull requests
- Create plugins

## Support

- Check the built-in help system
- Review the documentation in `/docs`
- Run diagnostics with the built-in tools
- Test OAuth flows with included test scripts

---

**Built with ❤️ as a free alternative to expensive social media tools**