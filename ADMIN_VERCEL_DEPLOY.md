# Deploy Admin Dashboard to Vercel

## Quick Deploy Steps

### Option 1: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI** (if not installed):
```powershell
npm install -g vercel
```

2. **Login to Vercel**:
```powershell
vercel login
```

3. **Deploy from the root directory**:
```powershell
cd D:\copy\road_alert
vercel
```

4. **Follow the prompts**:
   - Set up and deploy? **Y**
   - Which scope? Select your account
   - Link to existing project? **N** (first time) or **Y** (if already created)
   - What's your project's name? `road-alert-admin` (or your choice)
   - In which directory is your code located? `./` (press Enter)
   - Want to override the settings? **N**

5. **Deploy to production**:
```powershell
vercel --prod
```

### Option 2: Deploy via Vercel Dashboard

1. **Go to** [vercel.com](https://vercel.com)
2. **Click** "Add New Project"
3. **Import** your GitHub repository (`markgwapo123/road_alert`)
4. **Configure**:
   - Framework Preset: **Vite**
   - Root Directory: `./` (leave as root)
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

5. **Environment Variables** (if needed):
   - No environment variables needed (backend URL already set in code)

6. **Click** "Deploy"

## After Deployment

### Your admin dashboard will be available at:
- Production: `https://your-project-name.vercel.app`
- You can set a custom domain in Vercel dashboard

### Access on Mobile:
1. Open the Vercel URL on your phone's browser
2. You can also add to home screen for app-like experience:
   - **iOS**: Safari → Share → Add to Home Screen
   - **Android**: Chrome → Menu (⋮) → Add to Home Screen

## Important Notes

✅ **Already Configured:**
- `vercel.json` exists with proper routing for SPA
- `package.json` has correct build scripts
- Backend URL points to production: `https://roadalert-backend-xze4.onrender.com`

✅ **Mobile Responsive:**
- Dashboard is now fully mobile-responsive
- Hamburger menu works on phones
- All pages optimized for touch

## Troubleshooting

### Build fails?
```powershell
# Test build locally first
npm run build

# If successful, commit and push
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 404 errors after deploy?
- Already fixed with `vercel.json` rewrites configuration
- All routes redirect to `index.html` for client-side routing

### Need to update backend URL?
- Edit `src/config/index.js`
- Change `BACKEND_URL` and `API_BASE_URL`
- Commit and redeploy

## Quick Commands Summary

```powershell
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Test build locally
npm run build

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# View deployment URL
vercel ls
```

## Mobile Access

Once deployed, share the Vercel URL with your team. The admin dashboard will work perfectly on:
- ✅ Desktop browsers
- ✅ Mobile phones (iOS/Android)
- ✅ Tablets
- ✅ Any device with a modern browser

The responsive design ensures a great experience on all screen sizes!
