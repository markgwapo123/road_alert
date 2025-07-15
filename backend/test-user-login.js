const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');

async function testUserLogin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Create a test user first
    console.log('🔧 Setting up test user...');
    
    // Clear existing test user
    await User.deleteOne({ email: 'testuser@example.com' });
    
    // Create test user
    const testUser = new User({
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'password123',
      profile: {
        firstName: 'Test',
        lastName: 'User',
        phone: '+639123456789'
      }
    });
    
    await testUser.save();
    console.log('✅ Test user created');

    // Simulate login by updating lastLogin
    console.log('🔓 Simulating user login...');
    await testUser.updateLastLogin();
    console.log('✅ User lastLogin updated');

    // Check user counts
    const totalUsers = await User.countDocuments();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeUsers = await User.countDocuments({ 
      lastLogin: { $gte: oneDayAgo } 
    });

    console.log('\n📊 User Statistics:');
    console.log(`Total Users: ${totalUsers}`);
    console.log(`Active Users (last 24h): ${activeUsers}`);
    console.log(`Inactive Users: ${totalUsers - activeUsers}`);

    // Show the test user details
    const updatedUser = await User.findById(testUser._id);
    console.log('\n👤 Test User Details:');
    console.log(`Username: ${updatedUser.username}`);
    console.log(`Email: ${updatedUser.email}`);
    console.log(`Last Login: ${updatedUser.lastLogin}`);
    console.log(`Is Active: ${updatedUser.isActive}`);

    console.log('\n✅ User login tracking test completed successfully!');
    console.log('🔍 The system can now properly track when users log in.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during test:', error);
    process.exit(1);
  }
}

testUserLogin();
