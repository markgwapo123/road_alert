# 🔧 Google Login Debugging Guide

## ✅ Current Status
- **Backend**: ✅ Running on http://localhost:3001
- **Frontend**: ✅ Running on http://localhost:5173  
- **Google Script**: ✅ Added to index.html
- **Debug Logging**: ✅ Added to login function

## 🧪 Testing Steps

### 1. Open Browser Console
1. Visit: http://localhost:5173
2. Open browser Developer Tools (F12)
3. Go to **Console** tab
4. Look for these debug messages:

**Expected Console Output:**
```
🔧 App Configuration: { API_BASE_URL: "http://localhost:3001/api", ... }
✅ Google Identity Services loaded successfully
```

### 2. Test Google Login
1. Click **"Sign in with Google"** button
2. Watch console for these messages:

**Expected Debug Flow:**
```
🔍 Checking Google services...
✅ Google services available, initializing...
📱 Prompting for Google login...
🔔 Google prompt notification: [object]
🔍 Google login callback received: [credential object]
📤 Sending Google token to backend...
✅ Backend response: [user object]
```

## ❌ Common Error Solutions

### Error: "Failed to load resource: accounts.google.com/gsi/client"
**Solution**: 
- Check your internet connection
- Try refreshing the page
- The script is now loaded in index.html

### Error: "GSI_LOGGER]: The given client ID client:74 is not found"
**Solutions**:
1. **Add Test User in Google Console:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - APIs & Services > OAuth consent screen
   - Add your email to "Test users"

2. **Add Authorized Origins:**
   - APIs & Services > Credentials
   - Click your OAuth client
   - Add to "Authorized JavaScript origins":
     - `http://localhost:5173`
     - `http://localhost:5174`
     - `http://localhost:5175`

### Error: "Google login prompt was not displayed or skipped"
**Solutions**:
- Clear browser cookies for Google
- Try incognito/private browsing mode
- Make sure popup blockers are disabled

## 🎯 Your Google OAuth Settings Should Be:

**Client ID**: `1272896031-jn5nlf6b7dc3b0qk0als90mfy2sfhm5d.apps.googleusercontent.com`

**Authorized JavaScript origins**:
- http://localhost:5173
- http://localhost:5174  
- http://localhost:5175

**Test users**: Your email address

## 🔍 Manual Test

If automated login fails, you can test the backend directly:

```bash
cd E:\finalcapstone\backend
node test-social-login.js
```

Should show: `✅ Google endpoint working`

Let me know what console messages you see when you try to login!