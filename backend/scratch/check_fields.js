const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

const testFields = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const users = await User.find().lean();
    console.log('Got users');
    users.forEach(u => {
      console.log(`User: ${u.username}`);
      Object.keys(u).forEach(key => {
        const size = Buffer.byteLength(JSON.stringify(u[key]));
        if (size > 1000) {
          console.log(`  Field: ${key}, Size: ${size} bytes`);
        }
      });
    });
    process.exit(0);
  } catch (error) {
    console.error('Error during find:', error);
    process.exit(1);
  }
};

testFields();
