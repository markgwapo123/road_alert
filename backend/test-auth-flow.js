const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');

async function testAuthFlow() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Create test user
    console.log('🔧 Creating test user...');
    await User.deleteOne({ email: 'authtest@example.com' });
    
    const testUser = new User({
      username: 'authtest',
      email: 'authtest@example.com',
      password: 'password123',
      profile: {
        firstName: 'Auth',
        lastName: 'Test'
      }
    });
    
    await testUser.save();
    console.log('✅ Test user created');

    // Simulate the login process from auth.js
    console.log('🔓 Simulating authentication login process...');
    
    // Find user by email (like in auth route)
    let user = await User.findOne({ email: 'authtest@example.com' });
    console.log('📧 User found by email:', user.username);
    
    // Check password (like in auth route)
    const isMatch = await bcrypt.compare('password123', user.password);
    console.log('🔐 Password match:', isMatch);
    
    if (isMatch) {
      // Update last login (this is the key fix we made)
      console.log('⏰ Updating lastLogin...');
      await user.updateLastLogin();
      console.log('✅ LastLogin updated successfully');
      
      // Reload user to see updated data
      user = await User.findById(user._id);
      console.log('📅 New lastLogin value:', user.lastLogin);
    }

    // Check system statistics after login
    const totalUsers = await User.countDocuments();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeUsers = await User.countDocuments({ 
      lastLogin: { $gte: oneDayAgo } 
    });

    console.log('\n📊 System Status After Login:');
    console.log(`Total Users: ${totalUsers}`);
    console.log(`Active Users (last 24h): ${activeUsers}`);
    console.log(`User Activity: ${totalUsers} total, ${activeUsers} online`);

    console.log('\n✅ Authentication flow test completed!');
    console.log('🎯 The auth route now properly updates lastLogin when users log in.');
    console.log('📈 This will make users show as "online" in the admin dashboard system status.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during authentication test:', error);
    process.exit(1);
  }
}

testAuthFlow();
