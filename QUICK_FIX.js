/**
 * 🚀 BUFFER KILLER QUICK FIX - RUN THIS!
 * 
 * This is the complete fix for your app.
 * IMPORTANT: Restart the app first to load the new code!
 * 
 * Then copy and paste this entire script into the console.
 */

console.log('🚀 BUFFER KILLER QUICK FIX STARTING...\n');
console.log('====================================\n');

// Step 1: Check if new API methods are available (from our fixes)
console.log('📌 STEP 1: Checking if fixes are loaded...');
const newMethods = [
    'addAccount',
    'removeAccount', 
    'postNow',
    'getCurrentWorkspace',
    'removeAccountFromWorkspace'
];

let allMethodsAvailable = true;
for (const method of newMethods) {
    if (typeof window.bufferKillerAPI[method] === 'function') {
        console.log(`✅ ${method} is available`);
    } else {
        console.log(`❌ ${method} is NOT available - RESTART THE APP!`);
        allMethodsAvailable = false;
    }
}

if (!allMethodsAvailable) {
    console.error('\n❌ STOP! The app needs to be restarted to load the fixes.');
    console.error('1. Press Ctrl+C to stop the app');
    console.error('2. Run: npm run dev');
    console.error('3. Run this script again');
    throw new Error('App restart required');
}

console.log('\n✅ All new methods loaded successfully!\n');

// Step 2: Fix the database
console.log('📌 STEP 2: Fixing database...');

async function quickFix() {
    try {
        // Get current accounts
        const accounts = await window.bufferKillerAPI.getAccounts();
        console.log(`Found ${accounts.length} existing account(s)`);
        
        // Check for corrupted accounts
        const corruptedAccounts = accounts.filter(a => 
            !a.username || a.username === 'Not set' || 
            a.username === null
        );
        
        if (corruptedAccounts.length > 0) {
            console.log(`\n🗑️ Removing ${corruptedAccounts.length} corrupted account(s)...`);
            for (const account of corruptedAccounts) {
                try {
                    await window.bufferKillerAPI.removeAccount(account.id);
                    console.log(`✅ Removed corrupted account ID ${account.id}`);
                } catch (error) {
                    console.log(`⚠️ Could not remove account ${account.id}:`, error.message);
                }
            }
        }
        
        // Check if we need to add a test account
        const validAccounts = await window.bufferKillerAPI.getAccounts();
        if (validAccounts.length === 0) {
            console.log('\n➕ Adding test account...');
            
            const testAccount = {
                platform: 'mastodon',
                username: 'test_user',
                instance: 'mastodon.social',
                accessToken: 'test_token_' + Date.now(),
                displayName: 'Test Mastodon User',
                avatar: 'https://mastodon.social/avatars/original/missing.png',
                userId: '123456'
            };
            
            const result = await window.bufferKillerAPI.addAccount(
                testAccount.platform,
                testAccount.username,
                testAccount.instance,
                testAccount
            );
            console.log('✅ Test account added:', result);
            
            // Link to workspace
            const workspace = await window.bufferKillerAPI.getCurrentWorkspace();
            if (workspace) {
                try {
                    await window.bufferKillerAPI.addAccountToWorkspace(workspace.id, result.id);
                    console.log('✅ Account linked to workspace');
                } catch (e) {
                    console.log('⚠️ Workspace linking not needed');
                }
            }
        } else {
            console.log('✅ Valid accounts already exist');
        }
        
        // Step 3: Refresh UI
        console.log('\n📌 STEP 3: Refreshing UI...');
        if (typeof window.loadAccounts === 'function') {
            await window.loadAccounts();
            console.log('✅ UI refreshed');
        }
        
        // Step 4: Test everything
        console.log('\n📌 STEP 4: Running tests...');
        
        // Test API
        const apiTest = {
            'addAccount': typeof window.bufferKillerAPI.addAccount === 'function',
            'removeAccount': typeof window.bufferKillerAPI.removeAccount === 'function',
            'postNow': typeof window.bufferKillerAPI.postNow === 'function',
            'getCurrentWorkspace': typeof window.bufferKillerAPI.getCurrentWorkspace === 'function'
        };
        console.log('API Methods:');
        console.table(apiTest);
        
        // Test UI elements
        const uiTest = {
            'Post textarea': !!document.querySelector('#post-content'),
            'Schedule button': !!document.querySelector('#schedule-btn'),
            'Post now button': !!document.querySelector('#post-now-btn'),
            'Accounts list': !!document.querySelector('#accounts-list')
        };
        console.log('\nUI Elements:');
        console.table(uiTest);
        
        // Test accounts
        const finalAccounts = await window.bufferKillerAPI.getAccounts();
        console.log('\nFinal Accounts:');
        console.table(finalAccounts);
        
        // Success!
        console.log('\n====================================');
        console.log('✅ QUICK FIX COMPLETE!');
        console.log('====================================\n');
        
        console.log('🎉 Your app is now fixed and ready!\n');
        console.log('📝 What you can do now:');
        console.log('1. Test posting: testMastodonPost()');
        console.log('2. Add real account: Click "Add Account" button');
        console.log('3. Run full tests: bufferKillerTests.runAllTests()');
        console.log('\n💡 Helper functions available:');
        console.log('- window.testMastodonPost() - Test post to Mastodon');
        console.log('- window.bufferKillerDebug.showAccounts() - Show all accounts');
        console.log('- window.bufferKillerTests.runAllTests() - Run all tests');
        
        return true;
    } catch (error) {
        console.error('❌ Quick fix failed:', error);
        console.error('Error details:', error.message);
        return false;
    }
}

// Run the quick fix
quickFix().catch(error => {
    console.error('❌ Fatal error:', error);
    console.log('\n🔧 Manual fix required:');
    console.log('1. Make sure the app is running (npm run dev)');
    console.log('2. Check for errors in the main terminal');
    console.log('3. Try running: bufferKillerFixes.runDiagnostics()');
});
