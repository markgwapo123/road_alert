// Simple script to add one test report with correct Kabankalan coordinates
const mongoose = require('mongoose');
const Report = require('./models/Report');

async function addTestReport() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/roadreport');
    console.log('Connected to MongoDB');

    // Create a test report
    const testReport = new Report({
      type: 'pothole',
      description: 'Test pothole in downtown Kabankalan City',
      severity: 'high',
      status: 'verified',
      location: {
        coordinates: {
          latitude: 10.2359,
          longitude: 122.8203
        },
        address: 'Downtown Kabankalan City, Negros Occidental'
      },
      reportedBy: {
        name: 'Test User',
        email: 'test@kabankalan.com'
      },
      images: [],
      priority: 'high',
      verifiedAt: new Date()
    });

    await testReport.save();
    console.log('✅ Test report added successfully!');
    console.log('Location:', testReport.location.address);
    console.log('Coordinates:', testReport.location.coordinates);
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

addTestReport();
