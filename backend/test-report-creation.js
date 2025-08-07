const mongoose = require('mongoose');
const Report = require('./models/Report');
require('dotenv').config();

async function testReportCreation() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');
    
    // Test creating a simple report
    const testReport = new Report({
      type: 'pothole',
      description: 'Test pothole report for debugging purposes with more than 10 characters',
      location: {
        address: '10.1869, 122.8081',
        coordinates: {
          latitude: 10.1869,
          longitude: 122.8081
        }
      },
      severity: 'medium',
      status: 'pending',
      images: [],
      submittedBy: new mongoose.Types.ObjectId() // Generate a fake ObjectId for testing
    });
    
    console.log('📝 Test report data:', {
      type: testReport.type,
      description: testReport.description.substring(0, 50),
      location: testReport.location,
      severity: testReport.severity,
      status: testReport.status
    });
    
    const savedReport = await testReport.save();
    console.log('✅ Test report saved successfully:', savedReport._id);
    
    // Clean up - delete the test report
    await Report.findByIdAndDelete(savedReport._id);
    console.log('🗑️ Test report cleaned up');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testReportCreation();
