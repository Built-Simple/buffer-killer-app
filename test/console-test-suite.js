/**
 * BUFFER KILLER - COMPREHENSIVE CONSOLE TEST SUITE
 * 
 * Copy and paste these tests into the Electron dev console to verify functionality
 * Run each section to identify exactly what's broken
 */

console.log('🧪 BUFFER KILLER TEST SUITE STARTING...\n');

// ============================================
// TEST 1: Check if API is available
// ============================================
async function testAPIAvailability() {
    console.log('📌 TEST 1: API Availability');
    console.log('=========================');
    
    const apiMethods = [
        'getAccounts',
        'addAccount',
        'removeAccount',
        'postNow',
        'schedulePost',
        'getScheduledPosts',
        'getWorkspaces',
        'getCurrentWorkspace',
        'switchWorkspace',
        'createWorkspace',
        'addAccountToWorkspace',
        'removeAccountFromWorkspace'
    ];
    
    const results = {};
    for (const method of apiMethods) {
        results[method] = typeof window.bufferKillerAPI[method] === 'function' ? '✅' : '❌';
    }
    
    console.table(results);
    return results;
}

// ============================================
// TEST 2: Database and Account Management
// ============================================
async function testAccountManagement() {
    console.log('\n📌 TEST 2: Account Management');
    console.log('============================');
    
    try {
        // Get all accounts
        console.log('Getting all accounts...');
        const accounts = await window.bufferKillerAPI.getAccounts();
        console.log('Total accounts:', accounts.length);
        console.table(accounts);
        
        // Check each account's structure
        if (accounts.length > 0) {
            console.log('\nFirst account details:');
            console.log(JSON.stringify(accounts[0], null, 2));
        }
        
        return accounts;
    } catch (error) {
        console.error('❌ Account retrieval failed:', error);
        return [];
    }
}

// ============================================
// TEST 3: Workspace System
// ============================================
async function testWorkspaceSystem() {
    console.log('\n📌 TEST 3: Workspace System');
    console.log('==========================');
    
    try {
        // Get all workspaces
        const workspaces = await window.bufferKillerAPI.getWorkspaces();
        console.log('Total workspaces:', workspaces.length);
        console.table(workspaces);
        
        // Get current workspace
        const currentWorkspace = await window.bufferKillerAPI.getCurrentWorkspace();
        console.log('\nCurrent workspace:', currentWorkspace);
        
        // Check workspace accounts
        if (currentWorkspace) {
            console.log('Accounts in current workspace:', currentWorkspace.accounts || []);
        }
        
        return { workspaces, currentWorkspace };
    } catch (error) {
        console.error('❌ Workspace system failed:', error);
        return null;
    }
}

// ============================================
// TEST 4: OAuth Flow Test
// ============================================
async function testOAuthFlow() {
    console.log('\n📌 TEST 4: OAuth Flow');
    console.log('====================');
    
    console.log('Testing Mastodon OAuth...');
    console.log('1. Click "Add Mastodon Account" button');
    console.log('2. Enter instance: mastodon.social');
    console.log('3. Complete authorization');
    console.log('4. Run testAccountManagement() again to check if saved');
    
    // Simulate button click
    const addButton = document.querySelector('[data-platform="mastodon"]');
    if (addButton) {
        console.log('✅ Add Mastodon button found');
        console.log('Button element:', addButton);
    } else {
        console.log('❌ Add Mastodon button not found');
        console.log('Available buttons:', document.querySelectorAll('.platform-button'));
    }
}

// ============================================
// TEST 5: Manual Account Addition (Bypass OAuth)
// ============================================
async function testManualAccountAdd() {
    console.log('\n📌 TEST 5: Manual Account Addition');
    console.log('=================================');
    
    const testAccount = {
        platform: 'mastodon',
        username: 'test_user',
        instance: 'mastodon.social',
        accessToken: 'test_token_12345',
        displayName: 'Test Mastodon Account',
        avatar: 'https://mastodon.social/avatars/original/missing.png'
    };
    
    console.log('Adding test account:', testAccount);
    
    try {
        const result = await window.bufferKillerAPI.addAccount(
            testAccount.platform,
            testAccount.username,
            testAccount.instance,
            testAccount
        );
        console.log('✅ Account added:', result);
        
        // Verify it was saved
        const accounts = await window.bufferKillerAPI.getAccounts();
        const found = accounts.find(a => a.username === 'test_user');
        if (found) {
            console.log('✅ Account found in database:', found);
        } else {
            console.log('❌ Account not found after adding');
        }
        
        return result;
    } catch (error) {
        console.error('❌ Manual add failed:', error);
        return null;
    }
}

// ============================================
// TEST 6: UI Element Check
// ============================================
function testUIElements() {
    console.log('\n📌 TEST 6: UI Elements');
    console.log('=====================');
    
    // FIXED: Updated with correct selectors from index.html
    const elements = {
        'Post textarea': document.querySelector('#post-content'),
        'Schedule button': document.querySelector('#schedule-btn'),  // Fixed
        'Post now button': document.querySelector('#post-now-btn'),  // Fixed  
        'Account selector': document.querySelector('.account-selector'),
        'Account list': document.querySelector('#accounts-list'),    // Fixed
        'Platform tabs': document.querySelectorAll('.nav-item'),     // Fixed
        'Add account buttons': document.querySelectorAll('.connect-platform')  // Fixed
    };
    
    const results = {};
    for (const [name, element] of Object.entries(elements)) {
        if (element instanceof NodeList) {
            results[name] = element.length > 0 ? `✅ (${element.length} found)` : '❌';
        } else {
            results[name] = element ? '✅' : '❌';
        }
    }
    
    console.table(results);
    
    // Check event listeners
    console.log('\nChecking event listeners...');
    const postButton = document.querySelector('#post-now');
    if (postButton) {
        const listeners = getEventListeners ? getEventListeners(postButton) : 'Cannot check';
        console.log('Post button listeners:', listeners);
    }
    
    return results;
}

// ============================================
// TEST 7: Post Functionality
// ============================================
async function testPostFunctionality() {
    console.log('\n📌 TEST 7: Post Functionality');
    console.log('============================');
    
    // First check if we have accounts
    const accounts = await window.bufferKillerAPI.getAccounts();
    if (accounts.length === 0) {
        console.log('❌ No accounts available. Add an account first.');
        return;
    }
    
    console.log(`Found ${accounts.length} account(s)`);
    
    // Try to post
    const testPost = {
        content: 'Test post from console - ' + new Date().toISOString(),
        platforms: ['mastodon'],
        selectedAccounts: {
            mastodon: [accounts[0].id]
        }
    };
    
    console.log('Attempting to post:', testPost);
    
    try {
        const result = await window.bufferKillerAPI.postNow(
            testPost.content,
            testPost.platforms,
            testPost.selectedAccounts
        );
        console.log('✅ Post successful:', result);
        return result;
    } catch (error) {
        console.error('❌ Post failed:', error);
        console.log('Error details:', error.message);
        return null;
    }
}

// ============================================
// TEST 8: Check IPC Communication
// ============================================
async function testIPCCommunication() {
    console.log('\n📌 TEST 8: IPC Communication');
    console.log('===========================');
    
    // Test a simple IPC call
    try {
        console.log('Testing database connection...');
        const accounts = await window.bufferKillerAPI.getAccounts();
        console.log('✅ IPC working - received', accounts.length, 'accounts');
        
        // Test OAuth server status
        console.log('\nChecking OAuth server...');
        // This would need a specific API method to check
        
        return true;
    } catch (error) {
        console.error('❌ IPC communication failed:', error);
        return false;
    }
}

// ============================================
// TEST 9: Account Display Refresh
// ============================================
async function testAccountDisplayRefresh() {
    console.log('\n📌 TEST 9: Account Display Refresh');
    console.log('=================================');
    
    // Check if updateAccountList function exists
    if (typeof window.updateAccountList === 'function') {
        console.log('✅ updateAccountList function found');
        console.log('Calling updateAccountList()...');
        await window.updateAccountList();
        console.log('Check if accounts now appear in UI');
    } else {
        console.log('❌ updateAccountList function not found');
        console.log('Available window functions:', Object.keys(window).filter(k => typeof window[k] === 'function'));
    }
    
    // Check account display element
    const accountList = document.querySelector('#account-list');
    if (accountList) {
        console.log('Account list HTML:', accountList.innerHTML);
        console.log('Child elements:', accountList.children.length);
    }
}

// ============================================
// RUN ALL TESTS
// ============================================
async function runAllTests() {
    console.log('🚀 RUNNING ALL TESTS...\n');
    console.log('=====================================\n');
    
    await testAPIAvailability();
    await testAccountManagement();
    await testWorkspaceSystem();
    testOAuthFlow();
    testUIElements();
    await testIPCCommunication();
    await testAccountDisplayRefresh();
    
    console.log('\n=====================================');
    console.log('✅ TEST SUITE COMPLETE');
    console.log('=====================================\n');
    console.log('💡 Next steps:');
    console.log('1. Run testManualAccountAdd() to add a test account');
    console.log('2. Run testPostFunctionality() to test posting');
    console.log('3. Check console output for specific failures');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Clear all accounts (use with caution!)
async function clearAllAccounts() {
    if (!confirm('This will delete ALL accounts. Are you sure?')) return;
    
    const accounts = await window.bufferKillerAPI.getAccounts();
    for (const account of accounts) {
        await window.bufferKillerAPI.removeAccount(account.id);
    }
    console.log('✅ All accounts cleared');
}

// Force UI refresh
async function forceUIRefresh() {
    console.log('Forcing UI refresh...');
    
    // Try different refresh methods
    if (window.updateAccountList) await window.updateAccountList();
    if (window.loadWorkspaces) await window.loadWorkspaces();
    if (window.updateUI) await window.updateUI();
    
    // Dispatch custom event
    window.dispatchEvent(new Event('accounts-updated'));
    window.dispatchEvent(new Event('workspace-changed'));
    
    console.log('✅ UI refresh attempted');
}

// Debug specific account
async function debugAccount(accountId) {
    const accounts = await window.bufferKillerAPI.getAccounts();
    const account = accounts.find(a => a.id === accountId);
    
    if (account) {
        console.log('Account details:');
        console.log(JSON.stringify(account, null, 2));
        
        // Check if in workspace
        const workspace = await window.bufferKillerAPI.getCurrentWorkspace();
        const inWorkspace = workspace?.accounts?.includes(accountId);
        console.log('In current workspace:', inWorkspace);
    } else {
        console.log('Account not found');
    }
}

// ============================================
// EXPORT TEST FUNCTIONS
// ============================================
window.bufferKillerTests = {
    runAllTests,
    testAPIAvailability,
    testAccountManagement,
    testWorkspaceSystem,
    testOAuthFlow,
    testManualAccountAdd,
    testUIElements,
    testPostFunctionality,
    testIPCCommunication,
    testAccountDisplayRefresh,
    clearAllAccounts,
    forceUIRefresh,
    debugAccount
};

console.log('✅ Test suite loaded!');
console.log('📋 Available commands:');
console.log('  - bufferKillerTests.runAllTests() - Run all tests');
console.log('  - bufferKillerTests.testManualAccountAdd() - Add test account');
console.log('  - bufferKillerTests.testPostFunctionality() - Test posting');
console.log('  - bufferKillerTests.forceUIRefresh() - Force UI update');
console.log('  - bufferKillerTests.clearAllAccounts() - Clear all accounts');
console.log('  - bufferKillerTests.debugAccount(id) - Debug specific account');
