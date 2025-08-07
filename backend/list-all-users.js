const mongoose = require('mongoose');
const User = require('./models/User');
const Admin = require('./models/Admin');
require('dotenv').config();

async function listUsersAndAdmins() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');
    
    const users = await User.find({}).select('username email _id');
    console.log(`\nFound ${users.length} users:`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. Username: ${user.username}, Email: ${user.email}, ID: ${user._id}`);
    });
    
    const admins = await Admin.find({}).select('username email role isActive _id');
    console.log(`\nFound ${admins.length} admins:`);
    
    admins.forEach((admin, index) => {
      console.log(`${index + 1}. Username: ${admin.username}, Email: ${admin.email}, Role: ${admin.role}, Active: ${admin.isActive}, ID: ${admin._id}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

listUsersAndAdmins();
