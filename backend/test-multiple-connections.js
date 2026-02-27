const mongoose = require('mongoose');
require('dotenv').config();

// Alternative connection strings to test
const connectionStrings = [
  // Original SRV string  
  process.env.MONGODB_URI,

  // Try without SRV (using explicit host)
  'mongodb://cluster0-shard-00-00.mx6qk3q.mongodb.net:27017,cluster0-shard-00-01.mx6qk3q.mongodb.net:27017,cluster0-shard-00-02.mx6qk3q.mongodb.net:27017/roadalert?ssl=true&replicaSet=atlas-105vvw-shard-0&authSource=admin&retryWrites=true&w=majority',

  // Alternative format
  'mongodb+srv://cluster0.mx6qk3q.mongodb.net/roadalert?retryWrites=true&w=majority&appName=Cluster0'
];

async function testMultipleConnections() {
  console.log('🔍 Testing multiple MongoDB connection methods...\n');

  for (let i = 0; i < connectionStrings.length; i++) {
    const connectionString = connectionStrings[i];
    console.log(`\n📍 Test ${i + 1}/3:`);

    // Hide password in logs
    const sanitizedString = connectionString?.replace(/:[^:@]+@/, ':****@') || 'undefined';
    console.log(`Connection: ${sanitizedString.substring(0, 80)}...`);

    if (!connectionString) {
      console.log('❌ Connection string is undefined, skipping...');
      continue;
    }

    try {
      const options = {
        family: 4, // Force IPv4
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 8000,
        maxPoolSize: 5,
        retryWrites: true
      };

      // For non-SRV connections, add auth credentials
      if (i === 1) {
        options.auth = {
          username: 'markstephenmagbatos',
          password: 'your_password'
        };
      } else if (i === 2) {
        connectionStrings[2] = 'mongodb+srv://markstephenmagbatos:your_password@cluster0.mx6qk3q.mongodb.net/roadalert?retryWrites=true&w=majority&appName=Cluster0';
      }

      console.log('⏳ Attempting connection...');
      const conn = await mongoose.connect(connectionString, options);

      console.log('✅ CONNECTION SUCCESSFUL!');
      console.log(`🏆 Host: ${conn.connection.host}`);
      console.log(`📊 Database: ${conn.connection.name}`);

      // Test a query
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log(`📁 Collections found: ${collections.length}`);

      await mongoose.disconnect();
      console.log('🔌 Disconnected\n');

      console.log('🎉 SUCCESS! Use this connection string in your .env file:');
      console.log(`MONGODB_URI=${connectionString}\n`);
      return; // Exit on first success

    } catch (error) {
      console.log('❌ Failed:', error.message);

      // Disconnect any lingering connections
      try {
        await mongoose.disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
    }
  }

  console.log('\n💡 All connection methods failed. Possible solutions:');
  console.log('1. Check your MongoDB Atlas cluster status');
  console.log('2. Verify your IP is whitelisted (0.0.0.0/0 for all IPs)');
  console.log('3. Check if cluster is paused/inactive');
  console.log('4. Try a different network connection');
  console.log('5. Contact MongoDB Atlas support');
}

testMultipleConnections();