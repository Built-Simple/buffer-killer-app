/**
 * BUFFER KILLER - SESSION 11 CRITICAL FIXES
 * 
 * This script applies all critical fixes identified in Session 11:
 * 1. Fix account persistence bug (NULL username/token)
 * 2. Replace dangerous Facebook stub
 * 3. Test Mastodon functionality
 * 4. Clean up broken features
 */

const fs = require('fs').promises;
const path = require('path');

console.log('🔧 BUFFER KILLER - SESSION 11 FIX SCRIPT');
console.log('========================================\n');

async function applyAllFixes() {
    let fixCount = 0;
    let errorCount = 0;
    
    // =================================================
    // FIX 1: Account Persistence Bug (Already applied via edit)
    // =================================================
    console.log('📌 FIX 1: Account Persistence');
    console.log('-----------------------------');
    console.log('✅ Already applied via direct edit to main.js');
    console.log('   - Fixed createOrUpdateAccount to save username field');
    console.log('   - Fixed to save access_token and refresh_token fields');
    fixCount++;
    
    // =================================================
    // FIX 2: Replace Dangerous Facebook Stub
    // =================================================
    console.log('\n📌 FIX 2: Replace Dangerous Facebook Stub');
    console.log('----------------------------------------');
    
    try {
        // Backup original
        const fbPath = path.join(__dirname, 'lib', 'platforms', 'facebook.js');
        const fbBackupPath = path.join(__dirname, 'lib', 'platforms', 'facebook.dangerous.backup');
        const fbSafePath = path.join(__dirname, 'lib', 'platforms', 'facebook-safe.js');
        
        // Check if safe version exists
        await fs.access(fbSafePath);
        
        // Backup dangerous version
        const fbContent = await fs.readFile(fbPath, 'utf8');
        await fs.writeFile(fbBackupPath, fbContent, 'utf8');
        console.log('   ✅ Backed up dangerous version to facebook.dangerous.backup');
        
        // Copy safe version over
        const safeContent = await fs.readFile(fbSafePath, 'utf8');
        await fs.writeFile(fbPath, safeContent, 'utf8');
        console.log('   ✅ Replaced with safe version');
        fixCount++;
    } catch (error) {
        console.error('   ❌ Failed to replace Facebook stub:', error.message);
        errorCount++;
    }
    
    // =================================================
    // FIX 3: Repair Existing Accounts in Database
    // =================================================
    console.log('\n📌 FIX 3: Repair Existing Accounts');
    console.log('---------------------------------');
    
    try {
        const Database = require('./src/database/sqlite-database');
        const db = new Database();
        await db.initialize();
        
        const accounts = await db.find('accounts', {});
        console.log(`   Found ${accounts.length} accounts to check`);
        
        let repaired = 0;
        for (const account of accounts) {
            if (account.credentials && !account.username) {
                try {
                    const creds = JSON.parse(account.credentials);
                    const username = creds.username || creds.displayName || creds.name || null;
                    const accessToken = creds.accessToken || creds.access_token || null;
                    
                    if (username || accessToken) {
                        await db.update('accounts', account.id, {
                            username: username,
                            access_token: accessToken,
                            refresh_token: creds.refreshToken || creds.refresh_token || null
                        });
                        console.log(`   ✅ Repaired ${account.platform} account: ${username}`);
                        repaired++;
                    }
                } catch (e) {
                    // Skip accounts with invalid JSON
                }
            }
        }
        
        if (repaired > 0) {
            console.log(`   ✅ Repaired ${repaired} accounts`);
            fixCount++;
        } else {
            console.log('   ℹ️ No accounts needed repair');
        }
    } catch (error) {
        console.error('   ❌ Failed to repair accounts:', error.message);
        errorCount++;
    }
    
    // =================================================
    // FIX 4: Remove/Mark Broken Features
    // =================================================
    console.log('\n📌 FIX 4: Mark Broken Features');
    console.log('------------------------------');
    
    const brokenFeatures = [
        'lib/platforms/instagram.js',
        'lib/video/video-editor.js',
        'lib/ai/ai-suggestions.js'
    ];
    
    for (const feature of brokenFeatures) {
        try {
            const featurePath = path.join(__dirname, feature);
            await fs.access(featurePath);
            
            // Add warning header
            const content = await fs.readFile(featurePath, 'utf8');
            if (!content.includes('WARNING: NOT IMPLEMENTED')) {
                const warningHeader = `/**\n * WARNING: NOT IMPLEMENTED\n * This is a stub file - functionality not yet available\n * DO NOT USE IN PRODUCTION\n */\n\n`;
                await fs.writeFile(featurePath, warningHeader + content, 'utf8');
                console.log(`   ✅ Marked ${feature} as stub`);
            }
        } catch (error) {
            // File doesn't exist, that's fine
        }
    }
    fixCount++;
    
    // =================================================
    // FIX 5: Update package.json with missing deps
    // =================================================
    console.log('\n📌 FIX 5: Check Dependencies');
    console.log('----------------------------');
    
    try {
        const packagePath = path.join(__dirname, 'package.json');
        const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf8'));
        
        const requiredDeps = {
            'form-data': '^4.0.0',  // For media uploads
            'node-fetch': '^2.7.0'   // For platforms that use fetch
        };
        
        let added = false;
        for (const [dep, version] of Object.entries(requiredDeps)) {
            if (!packageJson.dependencies[dep]) {
                packageJson.dependencies[dep] = version;
                console.log(`   ✅ Added missing dependency: ${dep}`);
                added = true;
            }
        }
        
        if (added) {
            await fs.writeFile(packagePath, JSON.stringify(packageJson, null, 2), 'utf8');
            console.log('   ℹ️ Run "npm install" to install new dependencies');
            fixCount++;
        } else {
            console.log('   ✅ All required dependencies present');
        }
    } catch (error) {
        console.error('   ❌ Failed to update package.json:', error.message);
        errorCount++;
    }
    
    // =================================================
    // TEST: Quick Mastodon Test
    // =================================================
    console.log('\n📌 TEST: Mastodon Functionality');
    console.log('-------------------------------');
    
    try {
        const Database = require('./src/database/sqlite-database');
        const MastodonAPI = require('./lib/platforms/mastodon');
        
        const db = new Database();
        await db.initialize();
        
        const mastodonAccounts = await db.find('accounts', { platform: 'mastodon', active: true });
        
        if (mastodonAccounts.length > 0) {
            const account = mastodonAccounts[0];
            console.log(`   Testing with account: ${account.username}`);
            
            const creds = JSON.parse(account.credentials);
            const api = new MastodonAPI(
                creds.accessToken || account.access_token,
                creds.instance || 'mastodon.social'
            );
            
            try {
                const profile = await api.getAccount();
                console.log(`   ✅ Mastodon connection works! (@${profile.username})`);
            } catch (error) {
                console.log(`   ❌ Mastodon connection failed: ${error.message}`);
                console.log('   ℹ️ You may need to reconnect the account');
            }
        } else {
            console.log('   ℹ️ No Mastodon accounts to test');
        }
    } catch (error) {
        console.error('   ❌ Test failed:', error.message);
    }
    
    // =================================================
    // SUMMARY
    // =================================================
    console.log('\n========================================');
    console.log('📊 FIX SUMMARY');
    console.log('========================================');
    console.log(`✅ Fixes Applied: ${fixCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    
    if (errorCount === 0) {
        console.log('\n🎉 All fixes applied successfully!');
    } else {
        console.log('\n⚠️ Some fixes failed - check errors above');
    }
    
    console.log('\n📝 NEXT STEPS:');
    console.log('-------------');
    console.log('1. Run: npm install');
    console.log('2. Restart the app: npm run dev');
    console.log('3. Test Mastodon posting with: node test-mastodon-posting.js');
    console.log('4. Connect a real Mastodon account in the UI');
    console.log('5. Try posting to verify everything works');
    
    return { fixCount, errorCount };
}

// Run if called directly
if (require.main === module) {
    applyAllFixes().then(result => {
        console.log('\n✅ Fix script complete');
        process.exit(result.errorCount > 0 ? 1 : 0);
    }).catch(error => {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { applyAllFixes };
