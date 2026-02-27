require('dotenv').config();
const mongoose = require('mongoose');
const Report = require('./models/Report');

async function testQuery() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('✅ Connected\n');

    console.log('Testing Report.find() with timeout and lean...');
    const reports = await Report.find()
      .limit(5)
      .maxTimeMS(30000)
      .lean()
      .exec();
    
    console.log(`✅ Found ${reports.length} reports`);
    console.log('Sample:', reports[0]);

    console.log('\nTesting with populate...');
    const reportsWithPopulate = await Report.find()
      .limit(5)
      .populate('verifiedBy', 'username')
      .populate('reportedBy', 'username email profile')
      .maxTimeMS(30000)
      .lean()
      .exec();
    
    console.log(`✅ Found ${reportsWithPopulate.length} reports with populate`);
    console.log('Sample:', reportsWithPopulate[0]);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

testQuery();
