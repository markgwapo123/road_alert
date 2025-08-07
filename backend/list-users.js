const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function listUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');
    
    const users = await User.find({}).select('username email _id');
    console.log(`Found ${users.length} users:`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. Username: ${user.username}, Email: ${user.email}, ID: ${user._id}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

listUsers();
