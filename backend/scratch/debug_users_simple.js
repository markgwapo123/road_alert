const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

const testQuery = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected!');

    console.log('Fetching users (WITHOUT SORT)...');
    const users = await User.find({}, {
      _id: 1,
      username: 1
    })
    .limit(10)
    .lean()
    .maxTimeMS(5000);

    console.log(`Found ${users.length} users.`);
    console.log(users);

    process.exit(0);
  } catch (error) {
    console.error('❌ Query failed:', error);
    process.exit(1);
  }
};

testQuery();
