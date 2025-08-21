# Buffer Killer - Social Media Scheduler 🚀

A free, open-source alternative to Buffer for scheduling social media posts. Built with Electron and no monthly fees!

## Current Status: v0.9.0 (Beta)

### ✅ Working Features:
- **Core Architecture** - Electron app with secure IPC
- **Database System** - SQLite with migrations
- **OAuth Server** - Runs on localhost:3000
- **Platform Support Started**:
  - Mastodon (OAuth works, posting ready)
  - Twitter/X (OAuth ready)
  - GitHub (OAuth ready)
- **Post Scheduling** - Create and manage scheduled posts
- **Draft System** - Save and manage drafts
- **CSV Import/Export** - Bulk operations
- **Media Upload** - Image and video support
- **Workspace System** - Multi-workspace support
- **Testing Framework** - Complete console test suite

### 🔧 Known Issues (Being Fixed):
- Account persistence after OAuth needs work
- Account selector UI component missing
- Some accounts may have corrupted data
- Workspace linking not always working

### 🚀 Quick Start:

```bash
# Install dependencies
npm install

# Start the app
npm run dev

# Run tests (in browser console)
# Copy test/console-test-suite.js and paste in console
bufferKillerTests.runAllTests()
```

### 📁 Project Structure:
```
buffer-killer-app/
├── main.js              # Main Electron process
├── preload.js           # Secure IPC bridge
├── renderer.js          # UI logic
├── index.html           # Main UI
├── lib/                 # Platform integrations
│   ├── platforms/       # OAuth and API implementations
│   ├── rate-limiter/    # Rate limiting system
│   └── image-generator/ # Text-to-image system
├── src/                 
│   ├── database/        # SQLite database
│   ├── main/           # Main process modules
│   └── drafts/         # Draft management
├── test/               # Testing framework
│   ├── console-test-suite.js
│   ├── quick-fix-diagnostic.js
│   └── database-fix.js
└── data/               # App data (gitignored)
```

### 🧪 Testing:

The app includes a comprehensive browser-based test suite:

```javascript
// Load tests (paste test/console-test-suite.js in console)
// Then run:
bufferKillerTests.runAllTests()        // Run all tests
bufferKillerTests.testManualAccountAdd() // Add test account
bufferKillerTests.testPostFunctionality() // Test posting
```

### 🔐 Security:
- Context isolation enabled
- Sandbox mode active
- Secure token storage
- OAuth 2.0 with PKCE
- No API keys needed for most platforms

### 📝 TODO (Next Features):
- [ ] Fix account persistence after OAuth
- [ ] Complete Twitter posting
- [ ] Add LinkedIn support
- [ ] Add Facebook/Instagram
- [ ] Analytics dashboard
- [ ] Plugin system
- [ ] AI content enhancement
- [ ] Team collaboration
- [ ] Mobile app

### 🤝 Contributing:

This is an active project! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests
- Test the app

### 📄 License:

MIT License - Free to use, modify, and distribute!

### 💡 Philosophy:

Why pay monthly fees for something you can own? Buffer Killer gives you:
- **No monthly fees** - One-time setup, use forever
- **Your data** - Everything stored locally
- **Extensible** - Add any platform with an API
- **Open source** - See and modify the code

### 🚨 Current Session Notes:

**Session 10 Status:**
- Fixed 5 missing API methods
- Fixed UI selector issues
- Created comprehensive test suite
- Database system working
- OAuth flow functional
- Ready for continued development

**Next Steps:**
- Fix account data persistence
- Test real Mastodon posting
- Add more platforms
- Polish UI

---

Built with ❤️ as a Buffer alternative. No subscription required!
