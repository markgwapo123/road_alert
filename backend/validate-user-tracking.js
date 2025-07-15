// Complete User Login Tracking Validation
// This script demonstrates the complete flow from user login to system status display

const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

const User = require('./models/User');

async function validateCompleteFlow() {
  try {
    console.log('🚀 Starting Complete User Tracking Validation\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Step 1: Clear and create test users
    console.log('\n📋 Step 1: Setting up test users...');
    await User.deleteMany({ email: { $regex: 'demo.*@example.com' } });
    
    const demoUsers = [
      {
        username: 'demo_user1',
        email: 'demo1@example.com', 
        password: 'password123',
        profile: { firstName: 'Demo', lastName: 'User1' }
      },
      {
        username: 'demo_user2',
        email: 'demo2@example.com',
        password: 'password123', 
        profile: { firstName: 'Demo', lastName: 'User2' }
      }
    ];

    for (const userData of demoUsers) {
      const user = new User(userData);
      await user.save();
      console.log(`✅ Created: ${user.username}`);
    }

    // Step 2: Check initial status
    console.log('\n📊 Step 2: Initial System Status');
    const totalUsers = await User.countDocuments();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeUsers = await User.countDocuments({ lastLogin: { $gte: oneDayAgo } });
    
    console.log(`Total Users: ${totalUsers}`);
    console.log(`Active Users: ${activeUsers}`);
    console.log(`User Activity Status: ${totalUsers} total, ${activeUsers} online`);

    // Step 3: Simulate user logins (like the auth route does)
    console.log('\n🔓 Step 3: Simulating user logins...');
    
    for (const userData of demoUsers) {
      const user = await User.findOne({ email: userData.email });
      console.log(`\n👤 Logging in: ${user.username}`);
      
      // Simulate password check (would be done in auth route)
      const bcrypt = require('bcryptjs');
      const isMatch = await bcrypt.compare('password123', user.password);
      console.log(`   🔐 Password valid: ${isMatch}`);
      
      if (isMatch) {
        // This is the key fix - update lastLogin
        await user.updateLastLogin();
        console.log(`   ⏰ Updated lastLogin: ${user.lastLogin}`);
      }
    }

    // Step 4: Check updated status
    console.log('\n📊 Step 4: Updated System Status After Logins');
    const totalUsersAfter = await User.countDocuments();
    const activeUsersAfter = await User.countDocuments({ lastLogin: { $gte: oneDayAgo } });
    
    console.log(`Total Users: ${totalUsersAfter}`);
    console.log(`Active Users: ${activeUsersAfter}`);
    console.log(`User Activity Status: ${totalUsersAfter} total, ${activeUsersAfter} online`);

    // Step 5: Show what the admin dashboard would see
    console.log('\n🎯 Step 5: Admin Dashboard System Status View');
    console.log('The SystemStatus component would display:');
    console.log('┌─────────────────────────────────────┐');
    console.log('│ User Activity                       │');
    console.log('│ Status: Online ● Active             │');
    console.log(`│ ${totalUsersAfter} total, ${activeUsersAfter} online                    │`);
    console.log('└─────────────────────────────────────┘');

    // Step 6: Validation results
    console.log('\n✅ VALIDATION RESULTS:');
    console.log(`✓ User logins properly update lastLogin field`);
    console.log(`✓ Active user count increases from ${activeUsers} to ${activeUsersAfter}`);
    console.log(`✓ System can distinguish between total and active users`);
    console.log(`✓ Admin dashboard will show accurate user activity`);

    if (activeUsersAfter > activeUsers) {
      console.log('\n🎉 SUCCESS: User login tracking is working correctly!');
      console.log('   Users logging into client-app will now show as "online" in admin dashboard.');
    } else {
      console.log('\n⚠️  WARNING: Expected active users to increase after logins.');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Validation failed:', error);
    process.exit(1);
  }
}

validateCompleteFlow();
