# Backend FCM Integration Analysis

## Overview
This document analyzes the existing backend architecture and identifies the changes required to integrate Firebase Cloud Messaging (FCM) for real-time push notifications while preserving the current notification system.

## Current Backend Architecture

### Existing Notification System
- **Model**: `Notification.js` - MongoDB schema for notifications
- **Routes**: `routes/notifications.js` - REST API endpoints for notifications
- **Service**: `services/NotificationService.js` - Business logic for notifications
- **Database**: MongoDB with existing notification collection
- **Authentication**: JWT-based via `middleware/userAuth.js`

### Current Notification Flow
1. User submits report → Status = "Pending"
2. Admin changes status → Notification created in MongoDB
3. Frontend polls notifications every 10-30 seconds
4. Frontend displays ToastNotification and updates NotificationPanel

## Required Changes for FCM Integration

### 1. New Dependencies to Install

**File**: `backend/package.json`

**Why**: Need Firebase Admin SDK for FCM integration

**Changes**:
```json
{
  "dependencies": {
    "firebase-admin": "^12.0.0"
  }
}
```

---

### 2. New Model: Device Registration

**File**: `backend/models/Device.js` (NEW FILE)

**Why**: Need to store FCM device tokens for each user to send push notifications

**Schema**:
```javascript
{
  userId: ObjectId (ref: User),
  token: String (FCM token, unique),
  platform: String (android/ios/web),
  model: String,
  osVersion: String,
  appVersion: String,
  lastActive: Date,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

**Index**: `{ userId: 1, token: 1 }` for efficient lookups

---

### 3. New Model: Notification Preferences

**File**: `backend/models/NotificationPreferences.js` (NEW FILE)

**Why**: Users need to control which push notifications they receive

**Schema**:
```javascript
{
  userId: ObjectId (ref: User, unique),
  preferences: {
    verifiedReports: Boolean,
    barangayAnnouncements: Boolean,
    emergencyAlerts: Boolean,
    systemNotifications: Boolean,
    adminResponses: Boolean,
    statusUpdates: Boolean
  },
  createdAt: Date,
  updatedAt: Date
}
```

---

### 4. New Service: FCM Service

**File**: `backend/services/FcmService.js` (NEW FILE)

**Why**: Centralize FCM logic - token management, sending notifications, error handling

**Responsibilities**:
- Initialize Firebase Admin SDK
- Send push notifications via FCM
- Handle invalid tokens (remove from database)
- Retry failed notifications
- Format notification payload

**Key Methods**:
- `initialize()` - Setup Firebase Admin
- `sendNotification(tokens, notification)` - Send to specific tokens
- `sendBroadcast(notification)` - Send to all active devices
- `removeInvalidToken(token)` - Clean up expired tokens
- `formatVerifiedReportNotification(report)` - Format notification content

---

### 5. New Routes: Device Management

**File**: `backend/routes/devices.js` (NEW FILE)

**Why**: Frontend needs endpoints to register/update/remove device tokens

**Endpoints**:
- `POST /api/devices/register` - Register device with FCM token
- `PUT /api/devices/:deviceId/token` - Update token when it changes
- `DELETE /api/devices/:deviceId` - Remove device (logout)
- `PUT /api/devices/:deviceId/active` - Update last active timestamp

**Authentication**: Uses existing `userAuth` middleware

---

### 6. New Routes: Notification Preferences

**File**: Add to `backend/routes/notifications.js` (MODIFY)

**Why**: Frontend needs to manage user notification preferences

**New Endpoints**:
- `GET /api/notifications/preferences` - Get user preferences
- `PUT /api/notifications/preferences` - Update user preferences

**Authentication**: Uses existing `userAuth` middleware

---

### 7. REMOVED: Push Notification Sending Endpoint

**Why**: Per user approval, frontend should NOT trigger push notifications. Push notifications are sent automatically by the backend when an administrator verifies a report (status change from pending → verified).

**No separate push endpoint exists.** All push notifications are triggered internally by the backend during report status updates.

---

### 8. Modify: Report Status Update Logic

**File**: `backend/routes/reports.js` (MODIFY)

**Why**: When admin changes status from Pending → Verified, send push notification to all users

**Current Flow**:
1. Admin updates report status
2. NotificationService creates notification in MongoDB
3. Frontend polls and shows notification

**New Flow**:
1. Admin updates report status
2. Check if status changed from "pending" to "verified"
3. Create notification in MongoDB (existing behavior)
4. Call FcmService to send push notification to all users
5. Prevent duplicate notifications (check if already sent)

**Location**: In the PUT endpoint that updates report status (around line 200-300)

**Changes**:
```javascript
// After updating report status
if (oldStatus === 'pending' && newStatus === 'verified') {
  // Create MongoDB notification (existing)
  await NotificationService.createReportStatusNotification({...});
  
  // NEW: Send push notification to all users
  await FcmService.sendVerifiedReportNotification(report);
}
```

---

### 9. Modify: NotificationService

**File**: `backend/services/NotificationService.js` (MODIFY)

**Why**: Add push notification integration to existing notification methods

**Changes**:
- Import FcmService
- Add push notification call to `createReportStatusNotification` when status = "verified"
- Add push notification call to `broadcastNewReportNotification` (admin only)
- Add push notification call to `broadcastNewsNotification`

---

### 10. Modify: Server Configuration

**File**: `backend/server.js` (MODIFY)

**Why**: Initialize Firebase Admin SDK and register new routes

**Changes**:
1. Import FcmService at top
2. Initialize Firebase Admin after database connection
3. Register device routes: `app.use('/api/devices', require('./routes/devices'))`

**Location**: After line 206 (after notifications route)

---

### 11. New Environment Variables

**File**: `backend/.env` (MODIFY)

**Why**: Firebase credentials for FCM

**New Variables**:
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_DATABASE_URL=your-database-url
```

---

## Notification Architecture: FCM as Primary

### Primary Mechanism: FCM Push Notifications
- **Backend triggers**: When admin changes report status from Pending → Verified
- **Frontend receives**: Capacitor Push Notifications plugin
- **App open**: Shows ToastNotification, updates NotificationContext/Panel/badge
- **App background/closed**: Shows native system notification
- **Tap notification**: Navigates to report details

### Fallback Mechanism: Polling
- **Purpose**: Development environment or when FCM is unavailable
- **Current behavior**: Frontend polls every 10-30 seconds
- **Preserved**: Existing polling logic remains as backup
- **Trigger**: Set environment flag `FCM_ENABLED=false` to force polling mode

### No Manual Push Triggers
- Frontend does NOT have endpoint to trigger push notifications
- All push notifications are sent automatically by backend
- Only trigger: Report status change (pending → verified)

## Frontend-Backend Communication Flow

### Device Registration Flow

**Frontend → Backend**:
1. User logs in successfully
2. Frontend calls `deviceService.initializePushNotifications()`
3. Capacitor gets FCM token
4. Frontend sends `POST /api/devices/register` with token
5. Backend saves token in Device collection

**Backend → Frontend**:
- Returns success with deviceId
- Frontend stores deviceId in localStorage

---

### Push Notification Sending Flow

**Backend (Report Verified)**:
1. Admin changes report status to "verified"
2. Backend checks duplicate prevention (only pending → verified)
3. Backend creates MongoDB notification (existing)
4. Backend queries Device collection for all active tokens
5. Backend calls FcmService.sendNotification()
6. FCM sends push to all devices
7. Backend logs success/failure
8. Backend removes invalid tokens from database

**Frontend (App Open)**:
1. Capacitor receives push notification
2. Frontend formats notification for ToastNotification
3. ToastNotification appears
4. NotificationContext updates
5. NotificationPanel updates
6. Unread badge updates

**Frontend (App Closed/Background)**:
1. OS displays native system notification
2. User taps notification
3. App launches
4. Frontend reads notification data
5. Frontend navigates to report details

---

### Notification Preferences Flow

**Frontend → Backend**:
1. User opens NotificationPreferences component
2. Frontend calls `GET /api/notifications/preferences`
3. Backend returns user preferences
4. User toggles preferences
5. Frontend calls `PUT /api/notifications/preferences`
6. Backend saves preferences
7. Backend uses preferences when sending push notifications

---

## Duplicate Prevention Strategy

### Current Implementation
- Frontend: `notificationService.shouldSendNotification()` checks status transition
- Backend: Need to implement similar logic

### Backend Implementation
**File**: `backend/services/FcmService.js`

**Method**: `checkNotificationSent(reportId, type)`

**Logic**:
1. Check MongoDB Notification collection for existing notification
2. If notification exists for this reportId and type, don't send push
3. Only send push when creating NEW notification

**Integration**:
- Call this check before sending push notification
- Only send if check returns false (not already sent)

---

## Error Handling & Reliability

### Invalid Token Handling
**File**: `backend/services/FcmService.js`

**Logic**:
1. FCM returns error for invalid tokens
2. Catch error in sendNotification
3. Remove invalid token from Device collection
4. Log the removal
5. Continue sending to remaining tokens

### Retry Mechanism
**File**: `backend/services/FcmService.js`

**Logic**:
1. If send fails with network error
2. Retry up to 3 times with exponential backoff
3. Log each retry attempt
4. After 3 failures, mark as failed and alert admin

### Logging
**File**: `backend/services/FcmService.js`

**Log Events**:
- Notification sent successfully
- Notification failed (with reason)
- Invalid token removed
- Retry attempts
- Batch send statistics (sent/failed counts)

---

## Database Changes Summary

### New Collections
1. **devices** - Store FCM tokens and device info
2. **notificationPreferences** - Store user notification preferences

### Modified Collections
1. **notifications** - No schema changes, just add push notification logic
2. **reports** - No schema changes, just add push notification trigger

---

## API Endpoints Summary

### New Endpoints
- `POST /api/devices/register` - Register device
- `PUT /api/devices/:deviceId/token` - Update token
- `DELETE /api/devices/:deviceId` - Remove device
- `PUT /api/devices/:deviceId/active` - Update last active
- `GET /api/notifications/preferences` - Get preferences
- `PUT /api/notifications/preferences` - Update preferences

### Internal Backend Triggers (No API Endpoint)
- Report status change (pending → verified) → Automatically sends FCM push notification to all users

### Modified Endpoints
- `PUT /api/reports/:id` - Add push notification trigger on status change

---

## Testing Strategy

### Unit Tests
- Test FcmService.sendNotification()
- Test FcmService.removeInvalidToken()
- Test device registration flow
- Test notification preferences

### Integration Tests
- Test report status change → push notification
- Test duplicate prevention
- Test invalid token cleanup
- Test notification preferences filtering

### Manual Testing
1. Register device on login
2. Submit report as citizen (status = pending)
3. Verify admin receives notification (not normal users)
4. Change status to verified as admin
5. Verify all users receive push notification
6. Test with app open → should show toast
7. Test with app closed → should show system notification
8. Tap notification → should navigate to report details

---

## Security Considerations

### Firebase Credentials
- Store in environment variables
- Never commit to git
- Use service account with minimal permissions
- Restrict Firebase project access

### Device Token Security
- Validate JWT before device registration
- Only allow users to register their own devices
- Sanitize input to prevent injection attacks

### Rate Limiting
- Limit device registration attempts
- Limit push notification sends per user
- Prevent spam via push notifications

---

## Performance Considerations

### Batch Sending
- FCM supports sending to multiple tokens in one request
- Batch up to 500 tokens per request
- Reduces API calls and improves performance

### Caching
- Cache user notification preferences
- Cache device tokens for active users
- Reduce database queries

### Database Indexes
- Add indexes on Device collection
- Add indexes on NotificationPreferences collection
- Optimize queries for token retrieval

---

## Rollback Plan

If FCM integration causes issues:

1. **Disable FCM**: Set environment flag `FCM_ENABLED=false`
2. **Fallback**: Existing notification system continues to work
3. **Remove FCM calls**: Comment out FcmService calls in code
4. **Keep MongoDB**: Notifications still saved to database
5. **Frontend polling**: Frontend continues polling as before

---

## Implementation Order

1. Install Firebase Admin SDK
2. Create Device model
3. Create NotificationPreferences model
4. Create FcmService
5. Create device routes
6. Add notification preference routes
7. Add push notification route
8. Modify report status update logic
9. Modify NotificationService
10. Update server.js
11. Add environment variables
12. Test device registration
13. Test push notification sending
14. Test with frontend integration

---

## Summary

**Files to Create (4)**:
1. `backend/models/Device.js`
2. `backend/models/NotificationPreferences.js`
3. `backend/services/FcmService.js`
4. `backend/routes/devices.js`

**Files to Modify (5)**:
1. `backend/package.json` - Add firebase-admin dependency
2. `backend/routes/notifications.js` - Add preferences and push endpoints
3. `backend/routes/reports.js` - Add push notification trigger
4. `backend/services/NotificationService.js` - Integrate FCM
5. `backend/server.js` - Initialize Firebase and register routes

**Environment Variables (4)**:
1. `FIREBASE_PROJECT_ID`
2. `FIREBASE_PRIVATE_KEY`
3. `FIREBASE_CLIENT_EMAIL`
4. `FIREBASE_DATABASE_URL`

**Database Collections (2)**:
1. `devices`
2. `notificationPreferences`

**API Endpoints (6)**:
- 4 device management endpoints
- 2 notification preference endpoints
- 0 push notification sending endpoint (removed - triggered internally)

This plan preserves all existing functionality while adding FCM push notifications as an enhancement layer.
