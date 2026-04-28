const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

const verifyFix = async () => {
  try {
    console.log('🧪 Verifying API Fix (Direct DB Query simulation)...');
    await mongoose.connect(process.env.MONGODB_URI);
    
    const startTime = Date.now();
    const users = await User.find({}, {
      password: 0,
      'profile.profileImage': 0,
      'profile.profilePictureGallery': 0
    })
    .sort({ createdAt: -1 })
    .lean()
    .maxTimeMS(5000); // Should be very fast now

    const endTime = Date.now();
    console.log(`✅ Success! Fetched ${users.length} users in ${endTime - startTime}ms`);
    
    if (users.length > 0) {
        console.log('Sample user structure check:');
        const sample = users[0];
        console.log(`  - Username: ${sample.username}`);
        console.log(`  - Profile Image Excluded: ${sample.profile?.profileImage === undefined}`);
        console.log(`  - Gallery Excluded: ${sample.profile?.profilePictureGallery === undefined}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
};

verifyFix();
