# APK Network Fix - MVP Checklist

## 🔍 Root Cause Analysis

The "Cannot connect to server" error in the APK was caused by:

1. **Missing `ACCESS_NETWORK_STATE` permission** - Required to check network connectivity
2. **No pre-auth health check** - App tried to authenticate before confirming backend is reachable
3. **Insufficient timeout handling** - Render.com free tier has 30-60 second cold starts
4. **No retry logic** - Single failed requests showed generic errors

## ✅ Fixes Applied

### 1. Android Permissions (`AndroidManifest.xml`)
- [x] `INTERNET` permission (was present)
- [x] Added `ACCESS_NETWORK_STATE` permission

### 2. Network Security Config (`network_security_config.xml`)
- [x] HTTPS-only by default (more secure)
- [x] Whitelisted production domains (onrender.com, Google, Cloudinary)
- [x] Localhost allowed only for development

### 3. API Service (`src/services/api.js`)
- [x] Created centralized axios instance with interceptors
- [x] 60-second timeout for cold-start scenarios
- [x] `checkBackendHealth()` function with retry support
- [x] `authApi` wrapper with automatic health checks before auth requests
- [x] Proper error messages for network failures

### 4. Login Page (`src/pages/Login.jsx`)
- [x] Uses new `authApi` service for all auth calls
- [x] Health check happens automatically before login attempts
- [x] Better error messaging for users

### 5. Capacitor Config (`capacitor.config.json`)
- [x] `androidScheme: "https"` (secure)
- [x] `allowNavigation` whitelist for external domains
- [x] Disabled debug mode for production

### 6. App Config (`src/config/index.js`)
- [x] Hardcoded production URL (no env vars that might fail in APK)
- [x] Added timeout constants
- [x] Added retry configuration

---

## 🔨 Build & Test Checklist

### Pre-Build
```bash
# 1. Navigate to users directory
cd users

# 2. Install dependencies
npm install

# 3. Build web assets
npm run build

# 4. Sync to Android
npx cap sync android
```

### Build APK
```bash
# Option A: Debug APK (for testing)
cd android
./gradlew assembleDebug
# Output: android/app/build/outputs/apk/debug/app-debug.apk

# Option B: Release APK (for distribution)
./gradlew assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk
```

### Testing Checklist

1. **Install on real device** (not emulator for best results)

2. **Test with backend cold start**:
   - Wait 15+ minutes without using the app
   - Open app and try to login
   - Should see "connecting..." for up to 60 seconds
   - Should succeed after backend wakes up

3. **Test with backend warm**:
   - Use app within 15 minutes of last request
   - Login should be instant

4. **Test offline mode**:
   - Turn off WiFi/data
   - Try to login
   - Should see "Cannot connect to server. Please check your internet connection."

5. **Test slow network**:
   - Use network throttling (Android dev options)
   - App should still work with extended timeouts

---

## 🐛 Troubleshooting

### Error: "Cannot connect to server"
1. Check device has internet (open browser)
2. Backend may be sleeping - wait 60 seconds
3. Check `https://roadalert-backend-xze4.onrender.com/api/health` in browser

### Error: "Network Error" in logcat
```bash
adb logcat | grep -E "(BantayDalan|Network|API)"
```

### Backend not responding
- Visit Render dashboard
- Check if service is active
- Look at logs for errors

### HTTPS/SSL errors
- Verify `network_security_config.xml` is correct
- Ensure `AndroidManifest.xml` references it
- Check certificate is valid (Render provides free SSL)

---

## 📱 Quick Test Commands

```bash
# Build and install in one command
cd users
npm run build && npx cap sync android && cd android && ./gradlew installDebug

# View device logs
adb logcat -s chromium ReactNativeJS

# Check if backend is reachable from terminal
curl -I https://roadalert-backend-xze4.onrender.com/api/health
```

---

## 🚀 Production Ready

After testing, for Play Store release:

1. Update `android/app/build.gradle` with version code/name
2. Generate signed APK/AAB:
   ```bash
   ./gradlew bundleRelease
   ```
3. Keep debug logging minimal (current setup is good)
4. Consider paid Render tier to eliminate cold starts

---

## Files Modified

| File | Change |
|------|--------|
| `android/app/src/main/AndroidManifest.xml` | Added `ACCESS_NETWORK_STATE` permission |
| `android/app/src/main/res/xml/network_security_config.xml` | Updated domain whitelist, HTTPS-only default |
| `src/services/api.js` | **NEW** - Centralized API service with health checks |
| `src/pages/Login.jsx` | Uses new auth API with health checks |
| `src/config/index.js` | Added timeout/retry config |
| `capacitor.config.json` | Added navigation whitelist, disabled debug mode |
