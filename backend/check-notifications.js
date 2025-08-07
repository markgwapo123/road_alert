const mongoose = require('mongoose');
const User = require('./models/User');
const Notification = require('./models/Notification');
require('dotenv').config();

async function checkNotifications() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');
    
    // Get all users
    const users = await User.find({}).select('username email _id');
    console.log(`Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`- ${user.username} (${user.email}) - ID: ${user._id}`);
    });
    
    // Get all notifications
    const notifications = await Notification.find({}).sort({ createdAt: -1 });
    console.log(`\nFound ${notifications.length} notifications:`);
    
    notifications.forEach((notif, index) => {
      console.log(`${index + 1}. Type: ${notif.type}, Title: ${notif.title}`);
      console.log(`   User ID: ${notif.userId}, Read: ${notif.read}`);
      console.log(`   Created: ${notif.createdAt}`);
      console.log('');
    });
    
    // Check notifications for each user
    for (const user of users) {
      const userNotifs = await Notification.find({ userId: user._id });
      console.log(`User ${user.username} has ${userNotifs.length} notifications`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkNotifications();
