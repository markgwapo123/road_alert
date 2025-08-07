const mongoose = require('mongoose');
const User = require('./models/User');
const Admin = require('./models/Admin');
const Notification = require('./models/Notification');
require('dotenv').config();

async function testNotification() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');
    
    // Find a test user
    let testUser = await User.findOne({ username: 'testuser' });
    if (!testUser) {
      console.log('Creating test user...');
      testUser = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        verification: {
          status: 'submitted',
          submittedAt: new Date(),
          documents: {
            firstName: 'Test',
            lastName: 'User',
            phone: '123456789',
            address: 'Test Address',
            idNumber: 'ID123',
            idType: 'drivers_license'
          }
        }
      });
      await testUser.save();
      console.log('Test user created');
    }
    
    // Test notification creation for approval
    console.log('Testing notification creation for approval...');
    await Notification.notifyVerificationStatus(testUser._id, 'approved', 'TestAdmin');
    
    // Test notification creation for rejection
    console.log('Testing notification creation for rejection...');
    await Notification.notifyVerificationStatus(testUser._id, 'rejected', 'TestAdmin');
    
    // Check if notifications were created
    const notifications = await Notification.find({ userId: testUser._id }).sort({ createdAt: -1 });
    console.log(`Found ${notifications.length} notifications for user`);
    
    notifications.forEach((notif, index) => {
      console.log(`${index + 1}. ${notif.title}: ${notif.message}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testNotification();
