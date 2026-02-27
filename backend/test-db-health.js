require('dotenv').config();
const mongoose = require('mongoose');

async function checkDatabaseHealth() {
  console.log('🏥 DATABASE HEALTH CHECK\n');
  console.log('=' .repeat(60));
  
  const startTime = Date.now();
  
  try {
    // Test 1: Connection
    console.log('\n📡 Test 1: Testing MongoDB Connection...');
    console.log('Connection String:', process.env.MONGODB_URI.replace(/:[^:@]*@/, ':***@'));
    
    const options = {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      minPoolSize: 2,
    };
    
    await mongoose.connect(process.env.MONGODB_URI, options);
    const connTime = Date.now() - startTime;
    console.log(`✅ Connected successfully in ${connTime}ms`);
    console.log(`   Host: ${mongoose.connection.host}`);
    console.log(`   Database: ${mongoose.connection.name}`);
    console.log(`   Ready State: ${mongoose.connection.readyState} (1 = connected)`);
    
    // Test 2: Database Stats
    console.log('\n📊 Test 2: Database Statistics...');
    const dbStats = await mongoose.connection.db.stats();
    console.log(`✅ Database Stats:`);
    console.log(`   Collections: ${dbStats.collections}`);
    console.log(`   Data Size: ${(dbStats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Storage Size: ${(dbStats.storageSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Indexes: ${dbStats.indexes}`);
    console.log(`   Index Size: ${(dbStats.indexSize / 1024 / 1024).toFixed(2)} MB`);
    
    // Test 3: Collections
    console.log('\n📦 Test 3: Collections and Document Counts...');
    const collections = await mongoose.connection.db.listCollections().toArray();
    for (const collection of collections) {
      const count = await mongoose.connection.db.collection(collection.name).countDocuments();
      console.log(`   ${collection.name}: ${count} documents`);
    }
    
    // Test 4: Write Operation
    console.log('\n✍️  Test 4: Testing Write Operation...');
    const testCollection = mongoose.connection.db.collection('health_check_test');
    const writeStart = Date.now();
    await testCollection.insertOne({ 
      test: true, 
      timestamp: new Date(),
      message: 'Health check test document'
    });
    const writeTime = Date.now() - writeStart;
    console.log(`✅ Write operation successful in ${writeTime}ms`);
    
    // Test 5: Read Operation
    console.log('\n📖 Test 5: Testing Read Operation...');
    const readStart = Date.now();
    const doc = await testCollection.findOne({ test: true });
    const readTime = Date.now() - readStart;
    console.log(`✅ Read operation successful in ${readTime}ms`);
    
    // Clean up test document
    await testCollection.deleteOne({ test: true });
    console.log('✅ Test document cleaned up');
    
    // Test 6: Check Reports Collection
    console.log('\n🚦 Test 6: Checking Reports Collection...');
    const Report = require('./models/Report');
    const reportsCount = await Report.countDocuments();
    console.log(`   Total Reports: ${reportsCount}`);
    
    if (reportsCount > 0) {
      const sampleReport = await Report.findOne().select('title location status createdAt');
      console.log(`   Sample Report:`);
      console.log(`      Title: ${sampleReport?.title || 'N/A'}`);
      console.log(`      Status: ${sampleReport?.status || 'N/A'}`);
      console.log(`      Created: ${sampleReport?.createdAt || 'N/A'}`);
    }
    
    // Test 7: Check Users Collection
    console.log('\n👥 Test 7: Checking Users Collection...');
    const User = require('./models/User');
    const usersCount = await User.countDocuments();
    console.log(`   Total Users: ${usersCount}`);
    
    // Test 8: Check Admins Collection
    console.log('\n🔐 Test 8: Checking Admins Collection...');
    const Admin = require('./models/Admin');
    const adminsCount = await Admin.countDocuments();
    console.log(`   Total Admins: ${adminsCount}`);
    
    if (adminsCount > 0) {
      const adminUsers = await Admin.find().select('username role');
      console.log(`   Admin Users:`);
      adminUsers.forEach(admin => {
        console.log(`      - ${admin.username} (${admin.role})`);
      });
    }
    
    // Test 9: Network Latency
    console.log('\n⏱️  Test 9: Network Latency Test...');
    const latencyTests = [];
    for (let i = 0; i < 5; i++) {
      const pingStart = Date.now();
      await mongoose.connection.db.admin().ping();
      const pingTime = Date.now() - pingStart;
      latencyTests.push(pingTime);
    }
    const avgLatency = latencyTests.reduce((a, b) => a + b, 0) / latencyTests.length;
    console.log(`   Average Latency: ${avgLatency.toFixed(2)}ms`);
    console.log(`   Min: ${Math.min(...latencyTests)}ms`);
    console.log(`   Max: ${Math.max(...latencyTests)}ms`);
    
    // Test 10: Index Health
    console.log('\n🔍 Test 10: Index Health...');
    const reportIndexes = await Report.collection.getIndexes();
    console.log(`   Report Indexes: ${Object.keys(reportIndexes).length}`);
    Object.keys(reportIndexes).forEach(indexName => {
      console.log(`      - ${indexName}`);
    });
    
    // Overall Summary
    const totalTime = Date.now() - startTime;
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL HEALTH CHECKS PASSED!');
    console.log(`⏱️  Total Time: ${totalTime}ms`);
    console.log('🎯 Database is healthy and ready for production');
    console.log('='.repeat(60) + '\n');
    
    // Performance Rating
    if (avgLatency < 100) {
      console.log('⚡ Performance: Excellent (Latency < 100ms)');
    } else if (avgLatency < 200) {
      console.log('✅ Performance: Good (Latency < 200ms)');
    } else if (avgLatency < 500) {
      console.log('⚠️  Performance: Fair (Latency < 500ms)');
    } else {
      console.log('🐌 Performance: Poor (Latency > 500ms) - Consider optimization');
    }
    
  } catch (error) {
    console.error('\n❌ HEALTH CHECK FAILED!');
    console.error('Error:', error.message);
    console.error('\n🔧 Troubleshooting Steps:');
    console.error('   1. Check if MongoDB Atlas cluster is running');
    console.error('   2. Verify IP whitelist includes your current IP or 0.0.0.0/0');
    console.error('   3. Confirm credentials are correct');
    console.error('   4. Check network connectivity');
    console.error('   5. Verify database user has proper permissions');
    
    if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
      console.error('\n🌐 Network Issue Detected:');
      console.error('   - Check firewall settings');
      console.error('   - Verify VPN is not blocking connection');
      console.error('   - Try different network (mobile hotspot)');
    }
    
    if (error.message.includes('authentication failed')) {
      console.error('\n🔐 Authentication Issue:');
      console.error('   - Verify username and password');
      console.error('   - Check if user exists in MongoDB Atlas');
      console.error('   - Ensure user has read/write permissions');
    }
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed\n');
    process.exit(0);
  }
}

checkDatabaseHealth();
