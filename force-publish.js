// Force publish pending posts immediately
const Database = require('./src/database/sqlite-database');
const MastodonAPI = require('./lib/platforms/mastodon');

async function forcePublishPending() {
    console.log('🚀 Force Publishing Pending Posts\n');
    
    const db = new Database();
    await db.initialize();
    
    // Get all pending posts
    const posts = await db.all(
        `SELECT * FROM posts WHERE status = 'pending' OR status = 'scheduled'`
    );
    
    console.log(`Found ${posts.length} pending posts\n`);
    
    for (const post of posts) {
        console.log(`\nPost #${post.id}: "${post.content.substring(0, 50)}..."`);
        console.log(`Scheduled for: ${new Date(post.scheduled_time).toLocaleString()}`);
        console.log(`Platforms: ${post.platforms}`);
        
        try {
            const platforms = JSON.parse(post.platforms);
            
            if (platforms.includes('mastodon')) {
                // Get Mastodon account
                const account = await db.get(
                    `SELECT * FROM accounts WHERE platform = 'mastodon' AND active = 1`
                );
                
                if (!account) {
                    console.log('❌ No active Mastodon account found');
                    continue;
                }
                
                const creds = JSON.parse(account.credentials);
                const mastodon = new MastodonAPI(
                    creds.accessToken || account.access_token,
                    creds.instance || 'mastodon.social'
                );
                
                console.log('Posting to Mastodon...');
                const result = await mastodon.postToot(post.content);
                
                console.log('✅ Posted successfully!');
                console.log('URL:', result.url);
                
                // Update post status
                await db.run(
                    `UPDATE posts SET status = 'published', published_at = CURRENT_TIMESTAMP WHERE id = ?`,
                    [post.id]
                );
                console.log('✅ Post marked as published');
            }
        } catch (error) {
            console.error('❌ Failed to publish:', error.message);
            
            // Update with error
            await db.run(
                `UPDATE posts SET status = 'failed', error_message = ? WHERE id = ?`,
                [error.message, post.id]
            );
        }
    }
    
    console.log('\n✅ Done!');
}

forcePublishPending();
