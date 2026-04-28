const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

const testUserExcludingGallery = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const id = '692e5d4efba3b30bd1e197b2';
    console.log(`Checking user ${id} EXCLUDING gallery...`);
    
    const user = await User.findById(id, {
        'profile.profilePictureGallery': 0
    }).lean().maxTimeMS(5000);
    
    if (user) {
        console.log('Successfully fetched user!');
        const size = Buffer.byteLength(JSON.stringify(user));
        console.log(`Size without gallery: ${size} bytes`);
    } else {
        console.log('User not found');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Failed:', error.message);
    process.exit(1);
  }
};

testUserExcludingGallery();
