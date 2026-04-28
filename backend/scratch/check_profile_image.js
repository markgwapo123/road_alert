const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

const testProfileImage = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const id = '692e5d4efba3b30bd1e197b2';
    console.log(`Checking profileImage for user ${id}...`);
    
    const user = await User.findById(id, {
        'profile.profileImage': 1
    }).lean().maxTimeMS(5000);
    
    if (user && user.profile && user.profile.profileImage) {
        console.log(`Profile image length: ${user.profile.profileImage.length} characters`);
        console.log(`Profile image start: ${user.profile.profileImage.substring(0, 100)}...`);
    } else {
        console.log('No profile image found');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Failed:', error.message);
    process.exit(1);
  }
};

testProfileImage();
