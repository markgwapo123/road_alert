const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

const testQuery = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected!');

    console.log('Fetching users...');
    const users = await User.find({}, {
      password: 0,
      'profile.profilePictureGallery': 0
    })
    .sort({ createdAt: -1 })
    .lean()
    .maxTimeMS(30000);

    console.log(`Found ${users.length} users.`);
    
    if (users.length > 0) {
      console.log('Processing users...');
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const usersWithStatus = users.map(user => {
        const isOnline = user.lastActivity && user.lastActivity > fiveMinutesAgo;
        return {
          ...user,
          isOnline
        };
      });
      console.log('Processing complete!');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Query failed:', error);
    process.exit(1);
  }
};

testQuery();
