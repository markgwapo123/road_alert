const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Remove deprecated options
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Create initial admin user if it doesn't exist
    const Admin = require('../models/Admin');
    
    const existingAdmin = await Admin.findOne({ username: process.env.ADMIN_USERNAME });
    if (!existingAdmin) {
      // Let the Admin model pre-save hook handle password hashing
      await Admin.create({
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD, // Don't hash here, let the model do it
        role: 'admin'
      });
      console.log('🔐 Initial admin user created');
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    // Don't exit the process, let the server continue running
    throw error;
  }
};

module.exports = connectDB;
