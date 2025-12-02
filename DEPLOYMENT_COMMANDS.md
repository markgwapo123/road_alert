# Quick Deployment Commands

## Backend to Render
1. Commit and push changes:
```bash
git add .
git commit -m "Update for production deployment"
git push origin main
```

2. Go to render.com and create web service from GitHub repo
3. Use these settings:
   - Root Directory: (leave empty)
   - Build Command: `cd backend && npm ci`
   - Start Command: `cd backend && npm start`

## Users App to Vercel

### Option 1: Via Vercel CLI
```bash
cd users
npm run build
vercel --prod
```

### Option 2: Via GitHub (Recommended)
1. Go to vercel.com
2. Import GitHub repository
3. Set Root Directory: `users`
4. Framework: Vite
5. Build Command: `npm run build`
6. Output Directory: `dist`

## Environment Variables

### Render (Backend)
```
NODE_ENV=production
PORT=10000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_here
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### Vercel (Frontend)
```
VITE_API_URL=https://your-render-backend-url.onrender.com/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

## After Deployment
1. Update VITE_API_URL in Vercel with your actual Render backend URL
2. Test camera functionality on mobile devices
3. Verify API connections between frontend and backend