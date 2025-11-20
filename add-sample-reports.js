// Test script to add a sample report with correct Kabankalan City coordinates
const mongoose = require('mongoose');
const Report = require('./models/Report');

mongoose.connect('mongodb://localhost:27017/roadreport');

async function addSampleReport() {
  try {
    const sampleReport = new Report({
      type: 'pothole',
      description: 'Sample pothole report for Kabankalan City testing',
      severity: 'high',
      status: 'verified',      location: {
        coordinates: {
          latitude: 10.2359,
          longitude: 122.8203
        },
        address: 'Main Street, Kabankalan City, Negros Occidental'
      },      reportedBy: {
        name: 'Test User',
        email: 'test@example.com'
      },
      images: [], // Empty array for images
      priority: 'high',
      verifiedAt: new Date()
    });

    await sampleReport.save();    console.log('Sample report added with correct Kabankalan coordinates:', {
      latitude: 10.2359,
      longitude: 122.8203,
      address: 'Main Street, Kabankalan City, Negros Occidental'
    });

    // Also add another sample report nearby
    const sampleReport2 = new Report({
      type: 'road_damage',
      description: 'Road damage near Kabankalan City Hall',
      severity: 'medium',
      status: 'verified',      location: {
        coordinates: {
          latitude: 10.2365,
          longitude: 122.8210
        },
        address: 'Near City Hall, Kabankalan City, Negros Occidental'
      },      reportedBy: {
        name: 'Test User 2',
        email: 'test2@example.com'
      },
      images: [], // Empty array for images
      priority: 'medium',
      verifiedAt: new Date()
    });

    await sampleReport2.save();    console.log('Second sample report added:', {
      latitude: 10.2365,
      longitude: 122.8210,
      address: 'Near City Hall, Kabankalan City, Negros Occidental'
    });

    process.exit(0);
  } catch (error) {
    console.error('Error adding sample reports:', error);
    process.exit(1);
  }
}

addSampleReport();
