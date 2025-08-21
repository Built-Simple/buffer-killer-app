# Buffer Killer - Free Social Media Scheduler (ALPHA)

⚠️ **ALPHA SOFTWARE WARNING** ⚠️  
This is early development software. Most features are incomplete. See [HONEST_STATUS.md](HONEST_STATUS.md) for reality check.

## Current Reality (v0.3.0-alpha)

### ✅ What Actually Works:
- Basic Electron desktop app
- OAuth authentication for Mastodon
- SQLite database (with setup issues)
- Draft system with auto-save
- CSV import/export
- Post scheduling infrastructure

### ⚠️ Partially Working:
- Twitter/X OAuth (untested posting)
- GitHub OAuth (untested posting)
- Rate limiting framework (not integrated)

### ❌ Not Working / Not Built:
- LinkedIn (stub only)
- Facebook/Instagram (dangerous stubs)
- Image generation (missing dependencies)
- Video editing (not implemented)
- Analytics (shows fake data only)
- Plugin system (empty)
- AI features (not started)

## Known Issues

🔴 **CRITICAL BUGS:**
- Account data not saving after OAuth (NULL username/token)
- `npm install` fails due to sqlite3 binary compilation
- Media upload broken (FormData implementation incorrect)

## Installation (Probably Won't Work)

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/buffer-killer
cd buffer-killer

# Install dependencies (WILL LIKELY FAIL)
npm install

# If sqlite3 fails, try:
npm install --build-from-source sqlite3
# Or switch to: npm install better-sqlite3

# Start app (if you got this far)
npm run dev
```

## Realistic Development Timeline

### Current State: 30% Complete (Alpha)

### Path to Beta (6 weeks):
- Week 1: Fix critical bugs
- Week 2: Complete Mastodon platform
- Week 3: Complete Twitter platform  
- Week 4: Real analytics
- Week 5-6: Testing and documentation

### Path to 1.0 (3-6 months):
- Make 3 platforms work reliably
- Add basic image generation
- Complete error handling
- Comprehensive testing
- Accurate documentation

## Why This Exists

This project started as an ambitious attempt to create a free Buffer alternative. The architecture is solid, but implementation is incomplete. With significant additional development (3-6 months), this could become usable software.

## Contributing

We need help! If you're interested in:
- Fixing the OAuth persistence bug
- Completing platform integrations
- Adding error handling
- Writing tests
- Updating documentation

Please contribute! The foundation is here, it just needs work.

## Tech Stack

- **Electron** - Desktop app framework
- **SQLite** - Local database
- **Node.js** - Backend
- **Express** - OAuth server
- **Chart.js** - Analytics (when implemented)

## Project Structure

```
buffer-killer/
├── main.js           # Electron main process
├── preload.js        # Secure IPC bridge
├── renderer.js       # UI logic
├── index.html        # User interface
├── lib/
│   └── platforms/    # Platform integrations (mostly stubs)
├── src/
│   ├── database/     # SQLite implementation
│   └── drafts/       # Draft management (works!)
└── test/            # Testing framework
```

## Honest Feature Status

| Feature | Claimed | Reality | Status |
|---------|---------|---------|---------|
| Post Scheduling | ✅ | ✅ | Working |
| Draft Management | ✅ | ✅ | Working |
| CSV Import/Export | ✅ | ✅ | Working |
| Mastodon | ✅ | ⚠️ | OAuth works, posting untested |
| Twitter/X | ✅ | ⚠️ | OAuth works, posting untested |
| GitHub | ✅ | ⚠️ | OAuth works, posting untested |
| LinkedIn | ✅ | ❌ | Stub only |
| Facebook | ✅ | ❌ | Dangerous stub, no error handling |
| Instagram | ✅ | ❌ | Doesn't work |
| Image Generation | ✅ | ❌ | Missing Puppeteer dependency |
| Video Editing | ✅ | ❌ | Not implemented |
| Analytics | ✅ | ❌ | Shows fake data only |
| AI Features | ✅ | ❌ | Not started |
| Plugin System | ✅ | ❌ | Returns empty array |

## Testing

```javascript
// In browser console (F12):
// Copy test/console-test-suite.js content
bufferKillerTests.runAllTests()
// Result: ~75% pass (but many features are stubs)
```

## License

MIT - Because at least the license is real!

## Disclaimer

This software is provided as-is. It's not production-ready. Most advertised features don't work. The architecture is solid but implementation is incomplete. Use at your own risk.

## The Truth

An audit revealed that this project claimed ~20 features but only ~6 partially work. This README has been updated to reflect reality. The original oversold version has been archived.

See:
- [HONEST_STATUS.md](HONEST_STATUS.md) - Full reality check
- [TODO_REALISTIC.md](TODO_REALISTIC.md) - What actually needs to be done
- [AUDIT_RESPONSE.md](AUDIT_RESPONSE.md) - Our response to the audit

---

**Building in public means being honest in public.** This is alpha software that needs work. With your help, it could become something great.
