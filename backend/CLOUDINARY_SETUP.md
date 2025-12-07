# Fix Image Loss Issue - Setup Cloudinary

## Problem
Images uploaded to Render are deleted after server restarts because Render uses ephemeral filesystem.

## Solution: Use Cloudinary for Permanent Image Storage

### Step 1: Create Cloudinary Account

1. Go to [cloudinary.com](https://cloudinary.com/users/register/free)
2. Sign up for free account (25GB storage, 25GB bandwidth/month)
3. After login, go to Dashboard
4. Copy these credentials:
   - **Cloud Name**: (e.g., `dxxxxx`)
   - **API Key**: (e.g., `123456789012345`)
   - **API Secret**: (e.g., `abcdefghijklmnopqrstuvwxyz`)

### Step 2: Install Cloudinary Package

```bash
cd backend
npm install cloudinary
```

### Step 3: Add Environment Variables to Render

1. Go to your Render dashboard: https://dashboard.render.com
2. Select your backend service (`roadalert-backend-xze4`)
3. Go to **Environment** tab
4. Add these variables:
   ```
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```
5. Click **Save Changes**

### Step 4: Update Backend Code

I'll create the necessary files to integrate Cloudinary.

### Step 5: Redeploy

After updating the code:
```bash
git add .
git commit -m "Add Cloudinary for permanent image storage"
git push origin main
```

Render will automatically redeploy with the new image storage system.

## Benefits

✅ **Permanent Storage**: Images never deleted
✅ **Fast CDN**: Images served from global CDN
✅ **Automatic Optimization**: Images automatically compressed
✅ **Free Tier**: 25GB storage, perfect for your app
✅ **Backup**: Images stored securely in the cloud

## Alternative: If you want to keep local storage

You can also use:
- **AWS S3** (more complex, paid after free tier)
- **Google Cloud Storage** (similar to S3)
- **Supabase Storage** (easy, generous free tier)
- **Imgur API** (simple but limited)

Let me know if you want to proceed with Cloudinary (recommended) or another option!
