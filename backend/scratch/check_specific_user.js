const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

const testUserFields = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const id = '692e5d4efba3b30bd1e197b2';
    console.log(`Checking fields for user ${id}...`);
    
    // Fetch all keys
    const rawUser = await User.findById(id).lean();
    if (!rawUser) {
        console.log('User not found');
        process.exit(0);
    }
    
    for (const key of Object.keys(rawUser)) {
        console.log(`Checking field: ${key}...`);
        try {
            const field = rawUser[key];
            const size = Buffer.byteLength(JSON.stringify(field));
            console.log(`  Size: ${size} bytes`);
        } catch (err) {
            console.log(`  Error checking field ${key}: ${err.message}`);
        }
    }

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

testUserFields();
