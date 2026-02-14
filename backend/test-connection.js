const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
  console.log('🔍 Testing MongoDB connection...');
  console.log('📍 Connection string:', process.env.MONGODB_URI.replace(/:[^:@]+@/, ':****@'));

  try {
    // Test with different connection options
    const options = {
      // Add specific connection options that might help with DNS issues
      family: 4, // Use IPv4, skip trying IPv6
      serverSelectionTimeoutMS: 10000, // Wait up to 10 seconds
      connectTimeoutMS: 10000, // Wait up to 10 seconds  
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    };

    console.log('⏳ Attempting connection with DNS resolution helpers...');
    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    
    console.log('✅ MongoDB Connected Successfully!');
    console.log(`🏆 Connected to: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    
    // Test a simple query
    const adminCount = await mongoose.connection.db.collection('admins').countDocuments();
    console.log(`👥 Admin count: ${adminCount}`);
    
    await mongoose.disconnect();
    console.log('🔌 Disconnected successfully');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('\n💡 Possible solutions:');
    console.error('1. Check your internet connection');
    console.error('2. Verify MongoDB Atlas cluster is active');
    console.error('3. Check if your IP is whitelisted in MongoDB Atlas');
    console.error('4. Try using a different network (maybe try mobile hotspot)');
    console.error('5. Check if your firewall is blocking the connection');
    
    if (error.message.includes('ECONNREFUSED') || error.message.includes('querySrv')) {
      console.error('6. DNS resolution issue - try flushing DNS cache:');
      console.error('   Run: ipconfig /flushdns');
    }
  }
}

testConnection();