# Social Login Setup Instructions

## Google OAuth Setup

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/
   - Create a new project or select an existing one

2. **Enable Google+ API:**
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it
   - Also enable "Google Identity Services"

3. **Create OAuth Credentials:**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized JavaScript origins:
     - `http://localhost:5173`
     - `http://localhost:5174`
     - `http://localhost:5175`
     - Your production domain
   - Add authorized redirect URIs:
     - `http://localhost:5173/login`
     - `http://localhost:5174/login`
     - `http://localhost:5175/login`
     - Your production domain/login

4. **Update Environment Variables:**
   - Copy the Client ID from Google Console
   - Update `backend/.env`:
     ```
     GOOGLE_CLIENT_ID=your-actual-google-client-id.apps.googleusercontent.com
     GOOGLE_CLIENT_SECRET=your-actual-google-client-secret
     ```
   - Update `users/src/pages/Login.jsx` line with `client_id` value

## Facebook OAuth Setup

1. **Go to Facebook Developers:**
   - Visit: https://developers.facebook.com/
   - Create a new app or use existing one

2. **Set up Facebook Login:**
   - Add "Facebook Login" product to your app
   - Go to Facebook Login > Settings
   - Add valid OAuth Redirect URIs:
     - `http://localhost:5173/`
     - `http://localhost:5174/`
     - `http://localhost:5175/`
     - Your production domain

3. **Update Environment Variables:**
   - Copy the App ID from Facebook Console
   - Update `backend/.env`:
     ```
     FACEBOOK_APP_ID=your-actual-facebook-app-id
     FACEBOOK_APP_SECRET=your-actual-facebook-app-secret
     ```
   - Update `users/src/pages/Login.jsx` line with `appId` value

## Testing the Setup

1. **Start Backend Server:**
   ```bash
   cd backend
   node server.js
   ```

2. **Start Frontend Server:**
   ```bash
   cd users
   npm run dev
   ```

3. **Test Login:**
   - Visit the login page
   - Click "Sign in with Google" or "Continue with Facebook"
   - Grant permissions
   - Should redirect to dashboard if successful

## Troubleshooting

- **"Google services not loaded"**: Check if the Google Client ID is correct
- **"Facebook services not loaded"**: Check if the Facebook App ID is correct
- **CORS errors**: Make sure your domain is added to authorized origins
- **"Invalid token"**: Check if the backend environment variables are set correctly

## Current Configuration Status

The current setup uses placeholder IDs:
- Google Client ID: `1082052259909598-example.apps.googleusercontent.com` (REPLACE THIS)
- Facebook App ID: `1082052259909598` (REPLACE THIS)

Replace these with your actual app credentials for the social login to work.