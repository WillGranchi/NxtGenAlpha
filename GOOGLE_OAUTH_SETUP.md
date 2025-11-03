# Google OAuth Setup Guide

This guide will walk you through setting up Google OAuth for user authentication in the Trading Platform.

## Prerequisites

- A Google account
- Access to [Google Cloud Console](https://console.cloud.google.com/)
- Your application domain (for production) or localhost (for development)

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top of the page
3. Click **"New Project"**
4. Enter a project name (e.g., "Trading Platform")
5. Click **"Create"**
6. Wait for the project to be created and select it from the dropdown

## Step 2: Enable Google+ API

1. In the Google Cloud Console, go to **"APIs & Services"** > **"Library"**
2. Search for **"Google+ API"** or **"People API"**
3. Click on **"People API"** (recommended) or **"Google+ API"**
4. Click **"Enable"**

## Step 3: Create OAuth 2.0 Credentials

1. Go to **"APIs & Services"** > **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** at the top of the page
3. Select **"OAuth client ID"**
4. If prompted, configure the OAuth consent screen first (see Step 4)
5. For **Application type**, select **"Web application"**
6. Enter a name for your OAuth client (e.g., "Trading Platform Web Client")

## Step 4: Configure OAuth Consent Screen (First Time Only)

If this is your first time creating OAuth credentials, you'll need to configure the consent screen:

1. Click **"CONFIGURE CONSENT SCREEN"**
2. Choose **"External"** (unless you have a Google Workspace account)
3. Click **"Create"**
4. Fill in the required information:
   - **App name**: Trading Platform (or your app name)
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
5. Click **"Save and Continue"**
6. On the **Scopes** page, click **"Add or Remove Scopes"**
   - Add: `userinfo.email`, `userinfo.profile`, `openid`
7. Click **"Update"**, then **"Save and Continue"**
8. On the **Test users** page (for development), you can add test users
9. Click **"Save and Continue"**, then **"Back to Dashboard"**

## Step 5: Configure Authorized Redirect URIs

Back in the OAuth client creation screen:

### For Development (localhost):
1. Under **"Authorized JavaScript origins"**, click **"+ ADD URI"** and add:
   - `http://localhost:8000`
   - `http://127.0.0.1:8000`

2. Under **"Authorized redirect URIs"**, click **"+ ADD URI"** and add:
   - `http://localhost:8000/api/auth/google/callback`
   - `http://127.0.0.1:8000/api/auth/google/callback`

### For Production:
1. Under **"Authorized JavaScript origins"**, add:
   - `https://your-domain.com` (replace with your actual domain)
   - `https://api.your-domain.com` (if using separate API domain)

2. Under **"Authorized redirect URIs"**, add:
   - `https://your-domain.com/api/auth/google/callback` (or `https://api.your-domain.com/api/auth/google/callback`)

**Important**: 
- Use `https://` for production (Google requires HTTPS except for localhost)
- The redirect URI must match exactly what's configured in your environment variables

## Step 6: Copy Your Credentials

1. After creating the OAuth client, you'll see a popup with:
   - **Your Client ID** (looks like: `123456789-abcdefghijklmnop.apps.googleusercontent.com`)
   - **Your Client Secret** (looks like: `GOCSPX-abcdefghijklmnopqrstuvwxyz`)

2. **Copy both values** - you'll need them for your environment variables

3. Click **"OK"**

## Step 7: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and set the following variables:
   ```bash
   GOOGLE_CLIENT_ID=your-client-id-here
   GOOGLE_CLIENT_SECRET=your-client-secret-here
   FRONTEND_URL=http://localhost:3000  # or https://your-domain.com for production
   BACKEND_URL=http://localhost:8000   # or https://api.your-domain.com for production
   ```

3. For production, also set:
   ```bash
   ENVIRONMENT=production
   CORS_ORIGINS=https://your-domain.com
   ```

## Step 8: Verify Configuration

1. Start your backend server:
   ```bash
   docker compose up -d backend
   ```

2. Check the logs to verify OAuth configuration:
   ```bash
   docker compose logs backend | grep -i "oauth\|google"
   ```

3. You should see: `"Google OAuth configuration validated successfully"`

## Step 9: Test the Login Flow

1. Open your frontend application (usually `http://localhost:3000`)
2. Click the **"Sign in with Google"** button
3. You should be redirected to Google's login page
4. After signing in, you should be redirected back to your application
5. Check that your user information is displayed

## Troubleshooting

### Error: "redirect_uri_mismatch"
- **Problem**: The redirect URI in your Google Console doesn't match your backend URL
- **Solution**: 
  1. Check your `BACKEND_URL` environment variable
  2. Verify the redirect URI in Google Console is: `{BACKEND_URL}/api/auth/google/callback`
  3. Make sure there are no trailing slashes

### Error: "invalid_client"
- **Problem**: Client ID or Client Secret is incorrect
- **Solution**: 
  1. Double-check your `.env` file has the correct values
  2. Make sure there are no extra spaces or quotes
  3. Restart your Docker containers after updating `.env`

### Error: "access_denied"
- **Problem**: User cancelled the OAuth flow or consent screen issue
- **Solution**: 
  1. Make sure the OAuth consent screen is properly configured
  2. For development, add your test users in the consent screen settings

### OAuth Button Doesn't Appear
- **Problem**: Frontend not loading the LoginButton component
- **Solution**: 
  1. Check browser console for errors
  2. Verify the frontend is running and connected to the backend
  3. Check that `AuthProvider` is wrapping your app in `main.tsx`

### HTTPS Required for Production
- **Problem**: Google requires HTTPS for OAuth in production
- **Solution**: 
  1. Set up SSL/TLS certificates (Let's Encrypt recommended)
  2. Use a reverse proxy (nginx, Traefik) or cloud platform with built-in HTTPS
  3. Update `GOOGLE_REDIRECT_URI` to use `https://`
  4. Set `COOKIE_SECURE=true` in production

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use strong JWT secrets** in production (generate with: `python -c "import secrets; print(secrets.token_urlsafe(32))"`)
3. **Restrict OAuth consent screen** to specific users during development
4. **Use HTTPS in production** - Google OAuth requires it
5. **Rotate credentials** if they're ever exposed
6. **Monitor OAuth usage** in Google Cloud Console

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)
- [OAuth 2.0 Best Practices](https://oauth.net/2/oauth-best-practice/)

## Support

If you encounter issues not covered here:
1. Check the application logs: `docker compose logs backend`
2. Verify your environment variables: `docker compose exec backend env | grep GOOGLE`
3. Review the backend API documentation: `http://localhost:8000/docs`

