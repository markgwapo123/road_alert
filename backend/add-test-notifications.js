const mongoose = require('mongoose');
const User = require('./models/User');
const Notification = require('./models/Notification');
require('dotenv').config();

async function addTestNotifications() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');
    
    // Find the user "Macoy"
    const user = await User.findOne({ username: 'Macoy' });
    if (!user) {
      console.log('User "Macoy" not found');
      process.exit(1);
    }
    
    console.log(`Found user: ${user.username} (ID: ${user._id})`);
    
    // Clear existing notifications for this user
    await Notification.deleteMany({ userId: user._id });
    console.log('Cleared existing notifications');
    
    // Create test notifications
    const testNotifications = [
      {
        userId: user._id,
        userType: 'User',
        type: 'verification_status',
        title: '✅ Verification Approved!',
        message: 'Congratulations! Your account verification has been approved by Admin. You can now submit reports and access all features.',
        priority: 'high',
        read: false
      },
      {
        userId: user._id,
        userType: 'User',
        type: 'new_report',
        title: '🚨 New Alert in Your Area',
        message: 'TRAFFIC alert reported: Heavy traffic congestion on Main Street. Please use alternative routes.',
        priority: 'medium',
        read: false
      },
      {
        userId: user._id,
        userType: 'User',
        type: 'system_alert',
        title: '⚠️ System Maintenance',
        message: 'Our system will undergo maintenance tonight from 12:00 AM to 2:00 AM. Some features may be temporarily unavailable.',
        priority: 'medium',
        read: true
      },
      {
        userId: user._id,
        userType: 'User',
        type: 'report_resolved',
        title: '✅ Your Report Has Been Resolved',
        message: 'Your pothole report has been marked as resolved by our team. Thank you for helping make our roads safer!',
        priority: 'medium',
        read: false
      },
      {
        userId: user._id,
        userType: 'User',
        type: 'welcome',
        title: '👋 Welcome to Road Alert!',
        message: 'Thank you for joining Road Alert. Start by verifying your account to submit reports and help your community stay informed about road conditions.',
        priority: 'medium',
        read: true
      }
    ];
    
    // Create notifications
    await Notification.insertMany(testNotifications);
    console.log(`Created ${testNotifications.length} test notifications`);
    
    // Show summary
    const totalNotifications = await Notification.countDocuments({ userId: user._id });
    const unreadNotifications = await Notification.countDocuments({ userId: user._id, read: false });
    
    console.log(`Total notifications: ${totalNotifications}`);
    console.log(`Unread notifications: ${unreadNotifications}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addTestNotifications();
