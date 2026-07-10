# Push Notification Backend API Documentation

This document outlines the backend API endpoints required for the push notification system to work with the BantayDalan application.

## Overview

The push notification system uses Capacitor's Push Notifications API and requires backend endpoints for:
1. Device registration and management
2. Sending push notifications
3. Notification preferences management

## Required Backend Endpoints

### 1. Device Registration

#### POST /devices/register
Register a device for push notifications.

**Request Body:**
```json
{
  "userId": "string",
  "token": "string (FCM token)",
  "platform": "string (android/ios/web)",
  "model": "string",
  "osVersion": "string",
  "appVersion": "string",
  "lastActive": "ISO date string"
}
```

**Response:**
```json
{
  "success": true,
  "deviceId": "string",
  "message": "Device registered successfully"
}
```

---

#### PUT /devices/{deviceId}/token
Update device token when it changes.

**Request Body:**
```json
{
  "oldToken": "string",
  "newToken": "string",
  "lastActive": "ISO date string"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token updated successfully"
}
```

---

#### DELETE /devices/{deviceId}
Remove device token (on logout).

**Response:**
```json
{
  "success": true,
  "message": "Device removed successfully"
}
```

---

#### PUT /devices/{deviceId}/active
Update last active timestamp.

**Request Body:**
```json
{
  "lastActive": "ISO date string"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Last active updated"
}
```

---

### 2. Push Notification Sending

#### POST /notifications/push
Send push notification to users.

**Request Body:**
```json
{
  "notification": {
    "title": "string",
    "body": "string",
    "type": "string (report_verified, report_pending, etc.)",
    "data": {
      "reportId": "string (optional)",
      "title": "string",
      "category": "string",
      "barangay": "string",
      "status": "string",
      "timestamp": "ISO date string",
      "description": "string (optional)"
    }
  },
  "userIds": ["string array (optional)"],
  "broadcast": "boolean (default: false)"
}
```

**Response:**
```json
{
  "success": true,
  "sentCount": 10,
  "failedCount": 0,
  "message": "Notifications sent successfully"
}
```

---

### 3. Notification Preferences

#### GET /notifications/preferences
Get user notification preferences.

**Response:**
```json
{
  "success": true,
  "preferences": {
    "verifiedReports": true,
    "barangayAnnouncements": true,
    "emergencyAlerts": true,
    "systemNotifications": true,
    "adminResponses": true,
    "statusUpdates": true
  }
}
```

---

#### PUT /notifications/preferences
Update user notification preferences.

**Request Body:**
```json
{
  "preferences": {
    "verifiedReports": boolean,
    "barangayAnnouncements": boolean,
    "emergencyAlerts": boolean,
    "systemNotifications": boolean,
    "adminResponses": boolean,
    "statusUpdates": boolean
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Preferences updated successfully"
}
```

---

## Database Schema

### Devices Collection

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  token: String (FCM token),
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

### Notification Preferences Collection

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
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

## Notification Logic

### Pending Report (Admin Only)
When a citizen submits a report with "Pending" status:
1. Save report as Pending
2. Call `POST /notifications/push` with:
   - `userIds`: Array of admin user IDs
   - `notification.type`: "report_pending"
   - `broadcast`: false
3. Only administrators receive this notification

### Verified Report (Broadcast)
When an administrator changes status from Pending to Verified:
1. Update report status to Verified
2. Check if notification should be sent (only on Pending → Verified transition)
3. Call `POST /notifications/push` with:
   - `notification.type`: "report_verified"
   - `broadcast`: true (send to all registered users)
   - Include report details in notification data
4. All users receive push notification

### Duplicate Prevention
Only send notification when:
- Status changes from "pending" to "verified"

Do NOT send notification when:
- Status changes from "verified" to any other status
- Status changes from "pending" to other statuses (except verified)

---

## FCM Integration

The backend needs to integrate with Firebase Cloud Messaging (FCM):

### Required Setup
1. Create Firebase project
2. Enable Cloud Messaging API
3. Get server key and sender ID
4. Configure backend with FCM credentials

### FCM API Call Example
```javascript
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccountKey)
});

// Send push notification
async function sendPushNotification(tokens, notification) {
  const message = {
    notification: {
      title: notification.title,
      body: notification.body
    },
    data: notification.data,
    tokens: tokens // Array of FCM tokens
  };

  const response = await admin.messaging().sendMulticast(message);
  return response;
}
```

---

## Error Handling

### Invalid Tokens
- Remove invalid tokens from database
- Log failed deliveries
- Retry failed notifications (max 3 attempts)

### Rate Limiting
- Limit push notifications per user (e.g., max 10 per hour)
- Implement queue system for bulk notifications

### Security
- Validate all incoming requests
- Check user authentication
- Verify user permissions (admin-only endpoints)

---

## Testing

### Test Endpoints
1. Register a test device
2. Send a test push notification
3. Verify notification received on device
4. Test notification preferences
5. Test token update flow

### Test Scenarios
- App in foreground: Should show toast notification
- App in background: Should show system notification
- App closed: Should show system notification
- Tap notification: Should navigate to report details

---

## Monitoring

### Metrics to Track
- Notification delivery rate
- Open rate (notifications tapped)
- Failed deliveries
- Invalid token count
- User preference changes

### Logging
- Log all notification sends
- Log failures with error details
- Track token refresh events
- Monitor API response times

---

## Next Steps

1. Implement the backend endpoints
2. Set up Firebase Cloud Messaging
3. Create database collections
4. Test device registration flow
5. Test push notification delivery
6. Implement notification queue system (optional)
7. Add analytics and monitoring
