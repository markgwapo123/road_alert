const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Remove deprecated options
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Create initial admin user if it doesn't exist
    const Admin = require('../models/Admin');
    const bcrypt = require('bcryptjs');
    
    const existingAdmin = await Admin.findOne({ username: process.env.ADMIN_USERNAME });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
      await Admin.create({
        username: process.env.ADMIN_USERNAME,
        password: hashedPassword,
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
