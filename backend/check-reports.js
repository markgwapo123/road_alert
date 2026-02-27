const mongoose = require('mongoose');
const Report = require('./models/Report');

// Simple script to check existing reports and add sample data if needed
async function checkReports() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/roadAlert', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('📊 Connected to MongoDB');
    
    // Check existing reports
    const reports = await Report.find().limit(5);
    console.log(`📋 Found ${reports.length} existing reports`);
    
    reports.forEach((report, index) => {
      console.log(`\n📄 Report ${index + 1}:`);
      console.log(`- Type: ${report.type}`);
      console.log(`- Province: ${report.province || 'Not set'}`);
      console.log(`- City: ${report.city || 'Not set'}`);
      console.log(`- Barangay: ${report.barangay || 'Not set'}`);
      console.log(`- Location: ${report.location?.address || 'Not set'}`);
    });
    
    // Check if we need to create a sample report
    const reportsWithNewFormat = await Report.find({ 
      province: { $exists: true },
      city: { $exists: true },
      barangay: { $exists: true }
    });
    
    if (reportsWithNewFormat.length === 0) {
      console.log('\n🔄 No reports found with new format. Consider creating a new report through the UI to test.');
    } else {
      console.log(`\n✅ Found ${reportsWithNewFormat.length} reports with new location format`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n📊 Disconnected from MongoDB');
  }
}

checkReports();