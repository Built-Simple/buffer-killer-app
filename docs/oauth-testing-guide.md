# OAuth Testing Guide for Buffer Killer

## Overview
This guide documents how to test OAuth authentication flows for each supported platform in Buffer Killer.

## Prerequisites
- Electron app running in development mode
- Valid developer accounts for each platform
- Registered OAuth applications

---

## Twitter/X OAuth 2.0 Testing

### Setup
1. **Create Twitter Developer App**
   - Go to https://developer.twitter.com/en/portal/dashboard
   - Create a new app or use existing
   - Note your Client ID and Client Secret

2. **Configure OAuth 2.0 Settings**
   - Set Redirect URI: `http://localhost:3000/callback`
   - Enable OAuth 2.0
   - Select scopes: `tweet.read`, `tweet.write`, `users.read`, `offline.access`

3. **Update Buffer Killer Config**
   ```javascript
   // lib/platforms/twitter.js
   const TWITTER_CONFIG = {
     clientId: 'YOUR_CLIENT_ID',
     clientSecret: 'YOUR_CLIENT_SECRET', // Store securely!
     redirectUri: 'http://localhost:3000/callback',
     scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access']
   };
   ```

### Testing Flow
1. Click "Connect Twitter" in Accounts page
2. Browser opens to Twitter authorization
3. Approve the app permissions
4. Redirect back to app with authorization code
5. App exchanges code for tokens
6. Verify account appears in connected accounts

### Expected Results
- ✅ Access token received (2-hour expiry)
- ✅ Refresh token received
- ✅ User profile loaded
- ✅ Can post tweets
- ✅ Token auto-refreshes after 2 hours

### Troubleshooting
- **Error: Invalid redirect URI** - Check URI matches exactly in app settings
- **Error: Scope not allowed** - Verify app has proper access level
- **Error: Token expired** - Check refresh token logic

---

## LinkedIn OAuth 2.0 Testing

### Setup
1. **Create LinkedIn App**
   - Go to https://www.linkedin.com/developers/apps
   - Create new app
   - Note Client ID and Client Secret

2. **Configure OAuth Settings**
   - Add redirect URL: `http://localhost:3000/callback/linkedin`
   - Request Products:
     - Sign In with LinkedIn
     - Share on LinkedIn
     - Marketing Developer Platform (if available)

3. **Update Buffer Killer Config**
   ```javascript
   // lib/platforms/linkedin.js
   const LINKEDIN_CONFIG = {
     clientId: 'YOUR_CLIENT_ID',
     clientSecret: 'YOUR_CLIENT_SECRET',
     redirectUri: 'http://localhost:3000/callback/linkedin',
     scopes: ['r_liteprofile', 'r_emailaddress', 'w_member_social']
   };
   ```

### Testing Flow
1. Click "Connect LinkedIn" 
2. LinkedIn authorization page opens
3. Sign in and approve permissions
4. Redirect with authorization code
5. Exchange for access token
6. Load user profile

### Expected Results
- ✅ Access token received (60-day expiry)
- ✅ User profile with name and email
- ✅ Can post to LinkedIn feed
- ✅ Can post to company pages (if admin)

### Troubleshooting
- **Error: Scope not authorized** - Need to request product access
- **Error: Invalid client** - Check client credentials
- **Error: Rate limited** - LinkedIn has strict rate limits

---

## Facebook/Instagram OAuth Testing

### Setup
1. **Create Facebook App**
   - Go to https://developers.facebook.com/apps
   - Create app (Business type)
   - Add Facebook Login product

2. **Configure OAuth**
   - Valid OAuth Redirect URIs: `http://localhost:3000/callback/facebook`
   - App Domains: `localhost`
   - Site URL: `http://localhost:3000`

3. **Required Permissions**
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_posts`
   - `instagram_basic`
   - `instagram_content_publish`

### Testing Flow
1. Click "Connect Facebook"
2. Facebook login dialog
3. Select pages to manage
4. Grant permissions
5. Exchange code for token
6. Load pages and Instagram accounts

### Expected Results
- ✅ User access token (2 hours)
- ✅ Page access tokens (no expiry)
- ✅ List of managed pages
- ✅ Connected Instagram accounts
- ✅ Can post to pages and Instagram

---

## Mastodon OAuth Testing (Already Working!)

### Current Implementation
✅ **FULLY FUNCTIONAL** - No changes needed!

### Testing Flow
1. Enter Mastodon instance URL
2. App auto-registers with instance
3. Browser opens for authorization
4. User approves
5. Token received and stored

### Working Features
- ✅ Dynamic app registration
- ✅ Multi-instance support
- ✅ Posting with media
- ✅ No API keys required!

---

## GitHub OAuth Testing (Already Working!)

### Current Implementation
✅ **FULLY FUNCTIONAL** - Using device flow, no keys needed!

### Testing Flow
1. Click "Connect GitHub"
2. Get device code
3. Enter code at github.com/login/device
4. Approve access
5. Token automatically received

### Working Features
- ✅ No client secret needed
- ✅ Device flow authentication
- ✅ Post to profile README
- ✅ Create gists
- ✅ Update status

---

## Testing Checklist

### For Each Platform:
- [ ] Connect account successfully
- [ ] Verify token storage
- [ ] Post a test message
- [ ] Post with media
- [ ] Schedule a post
- [ ] Refresh token (if applicable)
- [ ] Disconnect and reconnect
- [ ] Handle errors gracefully

### Security Testing:
- [ ] Tokens encrypted in storage
- [ ] No tokens in renderer process
- [ ] Secure IPC communication
- [ ] PKCE flow for OAuth 2.0
- [ ] State parameter validation

### Error Handling:
- [ ] Invalid credentials
- [ ] Network errors
- [ ] Rate limiting
- [ ] Token expiration
- [ ] Revoked access

---

## Common Issues and Solutions

### Issue: "Redirect URI mismatch"
**Solution**: Ensure the redirect URI in your app config matches EXACTLY what's registered with the platform, including protocol, port, and path.

### Issue: "Invalid scope"
**Solution**: Check that requested scopes are available for your app's access level. Some platforms require app review for certain scopes.

### Issue: "Token expired"
**Solution**: Implement automatic token refresh using refresh tokens. Store refresh tokens securely and use them before access tokens expire.

### Issue: "Rate limited"
**Solution**: Implement exponential backoff and respect rate limit headers. Use the rate limiting system built into Buffer Killer.

### Issue: "CORS errors"
**Solution**: OAuth flows should open in external browser, not in Electron window, to avoid CORS issues.

---

## Production Considerations

1. **Secure Storage**: Use Electron's safeStorage API for tokens
2. **Environment Variables**: Never commit API keys
3. **Token Rotation**: Implement refresh token rotation
4. **Error Recovery**: Graceful handling of auth failures
5. **User Experience**: Clear error messages and retry options

---

## Next Steps

1. Complete Twitter OAuth 2.0 implementation
2. Complete LinkedIn OAuth implementation  
3. Test Facebook/Instagram flow
4. Add automated tests for auth flows
5. Implement token refresh scheduler
6. Add auth flow analytics

---

*Last Updated: January 18, 2025*
*Status: Mastodon ✅ | GitHub ✅ | Twitter 🔄 | LinkedIn 🔄 | Facebook 🔄*