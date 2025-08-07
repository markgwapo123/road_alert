const mongoose = require('mongoose');
const User = require('./models/User');
const Notification = require('./models/Notification');
require('dotenv').config();

async function addTestNotification() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');
    
    // Find the macoy user
    const user = await User.findOne({ username: 'macoy' });
    if (!user) {
      console.log('User macoy not found');
      process.exit(1);
    }
    
    console.log(`Found user: ${user.username} (ID: ${user._id})`);
    
    // Create a test verification approved notification
    await Notification.notifyVerificationStatus(user._id, 'approved', 'Admin');
    console.log('Test verification approved notification created');
    
    // Create a test verification rejected notification
    await Notification.notifyVerificationStatus(user._id, 'rejected', 'Admin');
    console.log('Test verification rejected notification created');
    
    // Check notifications for the user
    const notifications = await Notification.find({ userId: user._id }).sort({ createdAt: -1 });
    console.log(`\nUser now has ${notifications.length} notifications:`);
    
    notifications.forEach((notif, index) => {
      console.log(`${index + 1}. ${notif.title}: ${notif.message}`);
      console.log(`   Type: ${notif.type}, Read: ${notif.read}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addTestNotification();
