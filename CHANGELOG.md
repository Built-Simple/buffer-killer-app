# Changelog

All notable changes to Buffer Killer will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.0-beta] - 2025-08-20

### Added
- Comprehensive browser-based testing framework
- Console test suite with 9 different test categories
- Quick fix diagnostic tools
- Database repair utilities
- 5 missing API methods (addAccount, removeAccount, postNow, getCurrentWorkspace, removeAccountFromWorkspace)
- IPC handlers for all new methods
- Testing documentation and guides
- Git commit helpers (PowerShell and Batch scripts)
- Session summaries and handoff documentation

### Fixed
- UI element selectors in test suite
- IPC communication between main and renderer
- Workspace system integration
- OAuth flow debugging capabilities
- Database helper methods

### Changed
- Updated preload.js with missing methods
- Improved error handling in OAuth callbacks
- Enhanced main.js with proper IPC handlers
- Better console logging for debugging

### Known Issues
- Account data not persisting correctly after OAuth completion
- Account selector UI component missing
- Workspace linking inconsistent
- updateAccountList function not defined

## [0.8.0-alpha] - 2025-08-19

### Added
- OAuth server implementation
- Mastodon authentication flow
- Twitter/X browser-based auth (no API keys required)
- GitHub OAuth preparation
- SQLite database with migrations
- Post scheduling system
- Draft management with auto-save
- CSV import/export functionality
- Media upload support
- Workspace system

### Fixed
- OAuth callback handling
- Database migrations from JSON
- Rate limiting system

## [0.7.0-alpha] - 2025-08-18

### Added
- Initial Electron app structure
- Basic UI with sidebar navigation
- Platform selection interface
- Character counting
- Dark theme

## [Unreleased]

### Planned
- Complete account persistence fix
- Twitter posting implementation
- LinkedIn integration
- Facebook/Instagram support
- Analytics dashboard
- Plugin system
- AI content enhancement
- Team collaboration features
- Mobile application

---

## Version Guide

- **0.9.0-beta**: Core functionality working, testing framework complete
- **0.8.0-alpha**: OAuth and database systems implemented
- **0.7.0-alpha**: Initial UI and structure
- **1.0.0**: First stable release (planned)
