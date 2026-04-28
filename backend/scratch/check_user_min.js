const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

const testUserExcludingMore = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const id = '692e5d4efba3b30bd1e197b2';
    console.log(`Checking user ${id} EXCLUDING gallery and warnings...`);
    
    const user = await User.findById(id, {
        'profile.profilePictureGallery': 0,
        'warnings': 0
    }).lean().maxTimeMS(5000);
    
    if (user) {
        console.log('Successfully fetched user!');
        console.log(Object.keys(user));
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Failed:', error.message);
    process.exit(1);
  }
};

testUserExcludingMore();
