# Deployment Guide for RoadAlert App

## Overview
The RoadAlert application consists of three parts:
1. **Backend API** (Node.js/Express)
2. **Admin Dashboard** (React/Vite)
3. **User App** (React/Vite)

## Step 1: Deploy Backend to Vercel

1. **Navigate to the backend folder:**
   ```bash
   cd backend
   ```

2. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

3. **Deploy the backend:**
   ```bash
   vercel --prod
   ```

4. **Note the deployed backend URL** (e.g., `https://road-alert-backend.vercel.app`)

## Step 2: Update Environment Variables

### For User App:
1. Edit `users/.env.production`:
   ```env
   VITE_API_BASE_URL=https://your-backend-url.vercel.app/api
   VITE_BACKEND_URL=https://your-backend-url.vercel.app
   ```

### For Admin App:
1. Edit `.env.production`:
   ```env
   VITE_API_BASE_URL=https://your-backend-url.vercel.app/api
   VITE_BACKEND_URL=https://your-backend-url.vercel.app
   ```

## Step 3: Deploy Frontend Apps

### Deploy User App:
1. **Navigate to users folder:**
   ```bash
   cd users
   ```

2. **Build and deploy:**
   ```bash
   npm run build
   vercel --prod
   ```

### Deploy Admin App:
1. **Navigate to root folder:**
   ```bash
   cd ..
   ```

2. **Build and deploy:**
   ```bash
   npm run build
   vercel --prod
   ```

## Step 4: Update Backend CORS

Update the backend CORS configuration with your actual frontend URLs in `backend/server.js`:

```javascript
origin: process.env.NODE_ENV === 'production' 
  ? [
      'https://your-user-app.vercel.app',
      'https://your-admin-app.vercel.app'
    ] 
```

## Step 5: Test the Deployment

1. Visit your deployed user app URL
2. Try to login or register
3. Check if the backend connection works

## Troubleshooting

### Network Error Issues:
- Ensure backend is deployed and running
- Check CORS configuration
- Verify environment variables are correct
- Check browser console for errors

### Environment Variables:
- Make sure `.env.production` files have correct backend URLs
- Verify environment variables are loaded (check browser console logs)

## Quick Fix for Current Issue

To fix the current "Login failed: Network Error" issue:

1. **First deploy your backend to get a URL**
2. **Update the production env files with the real backend URL**
3. **Redeploy your frontend apps**

The issue is that your app is trying to connect to `localhost:3001` which doesn't exist on Vercel's servers.
