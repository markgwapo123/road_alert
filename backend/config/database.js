const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Configure mongoose for better network handling
    mongoose.set('bufferCommands', false);
    
    // Connection options for better network handling
    const options = {
      serverSelectionTimeoutMS: 10000, // 10 seconds
      socketTimeoutMS: 45000, // 45 seconds
      connectTimeoutMS: 10000, // 10 seconds
      heartbeatFrequencyMS: 5000, // 5 seconds
      maxPoolSize: 10,
      minPoolSize: 2,
      retryWrites: true,
      retryReads: true,
    };

    console.log('🔗 Attempting MongoDB connection...');
    console.log('📍 Connection string:', process.env.MONGODB_URI.replace(/:[^:@]*@/, ':***@'));
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    console.log('🎉 Database connected successfully!');
    
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
    
    // Provide specific error guidance
    if (error.message.includes('ECONNREFUSED') || error.message.includes('querySrv')) {
      console.error('🌐 Network Error Solutions:');
      console.error('   1. Wait 2-5 minutes for Atlas IP whitelist to propagate');
      console.error('   2. Check if cluster is paused in Atlas dashboard');
      console.error('   3. Temporarily disable Windows Firewall/antivirus');
      console.error('   4. Try mobile hotspot as network test');
    } else if (error.message.includes('IP') || error.message.includes('whitelist')) {
      console.error('🔒 IP Whitelist Error - But you have 0.0.0.0/0 so wait for propagation');
      console.error('   1. Wait 2-5 minutes for changes to take effect');
      console.error('   2. Check cluster status in Atlas dashboard');
    }
    
    console.log('⚠️  Server will continue running without database');
    console.log('🚀 You can still test API endpoints that don\'t require DB');
    
    // Don't exit the process, let the server continue running
    throw error;
  }
};

module.exports = connectDB;
