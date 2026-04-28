const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

const testSize = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const users = await User.find().lean();
    users.forEach(u => {
      const size = Buffer.byteLength(JSON.stringify(u));
      console.log(`User: ${u.username}, Size: ${size} bytes`);
    });
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

testSize();
