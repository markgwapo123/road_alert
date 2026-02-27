const mongoose = require('mongoose');

// Local MongoDB connection as fallback
const LOCAL_MONGODB_URI = 'mongodb://localhost:27017/roadalert';

const connectDB = async () => {
  try {
    // First try Atlas
    console.log('🌐 Trying MongoDB Atlas...');
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      family: 4,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });

    console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
    
    // Create initial admin user if it doesn't exist
    const Admin = require('../models/Admin');
    
    const existingAdmin = await Admin.findOne({ username: process.env.ADMIN_USERNAME });
    if (!existingAdmin) {
      await Admin.create({
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
        role: 'admin'
      });
      console.log('🔐 Initial admin user created');
    }
    
  } catch (atlasError) {
    console.log('⚠️  Atlas connection failed:', atlasError.message);
    
    try {
      console.log('🔄 Trying local MongoDB...');
      const conn = await mongoose.connect(LOCAL_MONGODB_URI);
      console.log(`✅ Local MongoDB Connected: ${conn.connection.host}`);
      console.log('📝 Note: Using local MongoDB. Atlas connection will be restored once IP is whitelisted.');
      
      // Create initial admin user for local DB
      const Admin = require('../models/Admin');
      
      const existingAdmin = await Admin.findOne({ username: process.env.ADMIN_USERNAME });
      if (!existingAdmin) {
        await Admin.create({
          username: process.env.ADMIN_USERNAME,
          password: process.env.ADMIN_PASSWORD,
          role: 'admin'
        });
        console.log('🔐 Initial admin user created in local DB');
      }
      
    } catch (localError) {
      console.log('❌ Local MongoDB also failed:', localError.message);
      console.log('💡 To install local MongoDB:');
      console.log('   1. Download from: https://www.mongodb.com/try/download/community');
      console.log('   2. Or use Docker: docker run -d -p 27017:27017 --name mongodb mongo');
      console.log('');
      console.log('🌐 To fix Atlas connection:');
      console.log('   1. Go to MongoDB Atlas → Network Access');
      console.log('   2. Add your IP address or 0.0.0.0/0 for development');
      throw localError;
    }
  }
};

module.exports = connectDB;