const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

const testUserNoProfile = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const id = '692e5d4efba3b30bd1e197b2';
    console.log(`Checking user ${id} EXCLUDING profile...`);
    
    const user = await User.findById(id, {
        'profile': 0
    }).lean().maxTimeMS(5000);
    
    if (user) {
        console.log('Successfully fetched user!');
        console.log(user);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Failed:', error.message);
    process.exit(1);
  }
};

testUserNoProfile();
