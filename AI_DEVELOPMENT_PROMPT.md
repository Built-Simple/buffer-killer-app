# 🚀 BUFFER KILLER APP - AI DEVELOPMENT ASSISTANT PROMPT

## PROJECT CONTEXT
You are helping build a Buffer Killer social media scheduling desktop application. This is an Electron-based app that will allow users to schedule posts across multiple social media platforms without monthly fees. The project is located at `C:\buffer-killer-app\` and has direct file system access.

## CURRENT PROJECT STATE
The project structure has been initialized with the following:
- ✅ Complete directory structure created
- ✅ package.json configured with dependencies
- ✅ .gitignore, .env.template, and README files created
- ✅ MASTER_TODO_LIST.md with 300+ tasks in 13 phases
- ⏳ No actual code implementation yet
- ⏳ Dependencies not installed yet

## FILE LOCATIONS

### 📋 Primary Task List
**`C:\buffer-killer-app\MASTER_TODO_LIST.md`** - Contains all 300+ development tasks organized in 13 phases

### 📁 Directory Structure
```
C:\buffer-killer-app\
├── assets\          # Put icons, images here
├── config\          # Configuration files will go here
├── db\              # SQLite database files will be stored here
├── lib\             # Core libraries to be created
│   └── platforms\   # Platform-specific integrations (twitter.js, linkedin.js, etc.)
├── plugins\         # Plugin system (implement in Phase 8)
├── src\             # Main source code
│   ├── main\        # Electron main process files
│   └── renderer\    # Electron renderer process files
├── templates\       # HTML templates for image generation
├── tests\           # Test files (implement in Phase 10)
├── .env.template    # Template for environment variables
├── .gitignore       # Git ignore configuration
├── package.json     # NPM configuration with all dependencies listed
├── README.md        # Project documentation
├── QUICK_START.md   # Quick start guide
└── MASTER_TODO_LIST.md  # THE MAIN TASK LIST
```

### 🔧 Key Files to Create (Priority Order)
1. `main.js` - Main Electron entry point (root directory)
2. `index.html` - Main window UI (root directory)
3. `renderer.js` - Renderer process logic (root directory)
4. `src/main/database.js` - Database connection and queries
5. `src/main/auth.js` - OAuth2 authentication handler
6. `lib/platforms/twitter.js` - Twitter API integration
7. `lib/scheduler.js` - Scheduling engine
8. `lib/image-generator.js` - Text to image conversion

## DEVELOPMENT INSTRUCTIONS

### Phase 1: Initial Setup (Start Here!)
1. **First, install dependencies:**
   ```bash
   cd C:\buffer-killer-app
   npm install
   ```

2. **Create the main.js file** with basic Electron setup (TODO List Phase 1.2)

3. **Create index.html** with the UI from the Buffer killer document

4. **Set up the database schema** in `db/` folder (TODO List Phase 4.1)

### Current MVP Priorities (Phases 1-4)
- **Phase 1**: Project Setup & Foundation
- **Phase 2**: Security & Authentication Architecture  
- **Phase 3**: Social Media Platform Integration (start with ONE platform)
- **Phase 4**: Database & Data Management

### Items Marked "NEEDS RESEARCH"
When you see `[NEEDS RESEARCH]` in the TODO list, these require:
- External documentation lookup
- API requirement verification
- Best practice investigation
- Security consideration analysis

High-priority research areas:
- Facebook API approval process
- LinkedIn unpublished rate limits
- Code signing for distribution
- OAuth2 with PKCE using AppAuth-JS
- Legal compliance (GDPR)

## IMPLEMENTATION APPROACH

### For Each Task:
1. **Check the MASTER_TODO_LIST.md** for the specific task details
2. **Create the necessary files** in the correct directories
3. **Follow the architecture** from the "Building a modular social media scheduler" document principles
4. **Implement security first** - never store unencrypted tokens
5. **Test as you go** - create simple test files in `tests/` directory

### Code Style Guidelines:
- Use ES6+ JavaScript features
- Implement async/await for all asynchronous operations
- Follow Electron security best practices (contextIsolation, nodeIntegration settings)
- Comment complex logic
- Use meaningful variable names
- Implement error handling for all API calls

### Platform Integration Priority:
1. **Start with Mastodon** - Simplest API, good documentation
2. **Then Twitter/X** - Well-documented but complex rate limits
3. **Then LinkedIn** - Requires approval
4. **Finally Facebook** - Most complex approval process

## QUICK IMPLEMENTATION EXAMPLES

### When asked to implement authentication:
- Check Phase 2 in MASTER_TODO_LIST.md
- Use Electron's safeStorage API (not keytar - it's deprecated)
- Implement OAuth2 with PKCE
- Store tokens in main process only

### When asked to implement scheduling:
- Check Phase 7 in MASTER_TODO_LIST.md
- Use node-schedule for cron jobs
- Implement bottleneck.js for rate limiting
- Create PQueue instances per account

### When asked to implement image generation:
- Check Phase 6 in MASTER_TODO_LIST.md
- Use Puppeteer with headless Chrome
- Create templates in `templates/` directory
- Output to buffer for direct posting

## CURRENT TASK EXECUTION

To start implementing:
1. Open and read `C:\buffer-killer-app\MASTER_TODO_LIST.md`
2. Start with Phase 1, Task 1.1 - Environment Setup
3. Move through tasks sequentially unless dependencies require jumping ahead
4. Mark tasks as complete in the TODO list as you finish them
5. Create git commits after each major task completion

## CRITICAL REMINDERS
- ⚠️ NEVER store API keys in code - use .env file
- ⚠️ ALWAYS use contextIsolation: true in BrowserWindow
- ⚠️ IMPLEMENT rate limiting before making API calls
- ⚠️ TEST token refresh mechanism thoroughly
- ⚠️ VALIDATE all IPC messages between main and renderer

## HELPER COMMANDS

```bash
# Install dependencies
npm install

# Run the app
npm start

# Run in development mode
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## SUCCESS CRITERIA
- [ ] App launches without errors
- [ ] Can connect at least one social media account
- [ ] Can create and schedule a post
- [ ] Post publishes at scheduled time
- [ ] Tokens refresh automatically
- [ ] Data persists between app restarts

---

**TO BEGIN DEVELOPMENT:**
1. Read the MASTER_TODO_LIST.md file
2. Start with Phase 1 tasks
3. Create files in the appropriate directories
4. Test each component as you build
5. Move to next phase when current phase is complete

**Remember:** The MASTER_TODO_LIST.md at `C:\buffer-killer-app\MASTER_TODO_LIST.md` is your primary guide. It contains 300+ specific tasks with clear instructions. Start there and work through systematically!