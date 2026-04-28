const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

const testCount = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const count = await User.countDocuments();
    console.log(`Total users: ${count}`);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

testCount();
