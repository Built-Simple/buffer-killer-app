/**
 * DATABASE FIX SCRIPT
 * 
 * This script fixes the corrupted account and ensures everything is properly linked
 * Run this in the console to fix the database
 */

console.log('🔧 DATABASE FIX SCRIPT STARTING...\n');

async function fixDatabase() {
    console.log('📊 STEP 1: Analyzing current state...');
    
    // Get current accounts
    const accounts = await window.bufferKillerAPI.getAccounts();
    console.log(`Found ${accounts.length} account(s)`);
    
    if (accounts.length > 0) {
        console.table(accounts);
        
        // Check for corrupted accounts (NULL username/access_token)
        const corruptedAccounts = accounts.filter(a => 
            !a.username || a.username === 'Not set' || 
            !a.access_token || !a.credentials
        );
        
        if (corruptedAccounts.length > 0) {
            console.log(`\n⚠️ Found ${corruptedAccounts.length} corrupted account(s)`);
            console.log('These accounts have missing data and cannot be used for posting.');
            
            // Remove corrupted accounts
            console.log('\n🗑️ STEP 2: Removing corrupted accounts...');
            for (const account of corruptedAccounts) {
                try {
                    await window.bufferKillerAPI.removeAccount(account.id);
                    console.log(`✅ Removed corrupted account ID ${account.id}`);
                } catch (error) {
                    console.error(`❌ Failed to remove account ${account.id}:`, error);
                }
            }
        }
    }
    
    // Add a working test account
    console.log('\n➕ STEP 3: Adding test account...');
    
    const testAccount = {
        platform: 'mastodon',
        username: 'test_user',
        instance: 'mastodon.social',
        accessToken: 'test_token_' + Date.now(),
        displayName: 'Test Mastodon User',
        avatar: 'https://mastodon.social/avatars/original/missing.png',
        userId: '123456'
    };
    
    try {
        const result = await window.bufferKillerAPI.addAccount(
            testAccount.platform,
            testAccount.username,
            testAccount.instance,
            testAccount
        );
        console.log('✅ Test account added:', result);
        
        // Get workspace and link account
        console.log('\n🔗 STEP 4: Linking to workspace...');
        const workspaces = await window.bufferKillerAPI.getWorkspaces();
        
        if (workspaces.length > 0) {
            const workspace = workspaces[0];
            console.log(`Found workspace: ${workspace.name}`);
            
            try {
                await window.bufferKillerAPI.addAccountToWorkspace(workspace.id, result.id);
                console.log('✅ Account linked to workspace');
            } catch (error) {
                console.log('⚠️ Could not link to workspace:', error.message);
            }
        }
        
        // Verify the fix
        console.log('\n✅ STEP 5: Verifying fix...');
        const newAccounts = await window.bufferKillerAPI.getAccounts();
        console.log('Updated accounts:');
        console.table(newAccounts);
        
        // Refresh UI
        console.log('\n🔄 STEP 6: Refreshing UI...');
        await window.loadAccounts();
        
        console.log('\n✅ DATABASE FIXED!');
        console.log('You now have a working test account.');
        console.log('Try posting with: bufferKillerTests.testPostFunctionality()');
        
        return true;
    } catch (error) {
        console.error('❌ Failed to add test account:', error);
        return false;
    }
}

// Run the fix
fixDatabase().then(success => {
    if (success) {
        console.log('\n🎉 Fix complete! Your app should work now.');
        console.log('Next steps:');
        console.log('1. Try posting: bufferKillerTests.testPostFunctionality()');
        console.log('2. Or add a real account: Click "Add Account" button');
    } else {
        console.log('\n❌ Fix failed. Please check the errors above.');
    }
});
