# Vercel Deployment Configuration

## Project Settings
- **Framework Preset:** Vite
- **Root Directory:** users (if deploying from root, set this to users/)
- **Build Command:** npm run build
- **Output Directory:** dist
- **Install Command:** npm install

## Environment Variables (if needed)
Add these in Vercel dashboard under Environment Variables:

```
VITE_API_BASE_URL=your-backend-api-url
VITE_BACKEND_URL=your-backend-url
```

## Build & Output Settings
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`
- Development Command: `npm run dev`

## Vercel.json Configuration (already exists)
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

## Deployment Steps:
1. Push your code to GitHub
2. Connect GitHub repo to Vercel
3. Set root directory to "users"
4. Deploy!