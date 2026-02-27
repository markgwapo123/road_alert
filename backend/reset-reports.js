// Clear old reports and add new ones with correct Kabankalan City coordinates
const mongoose = require('mongoose');
const Report = require('./models/Report');

mongoose.connect('mongodb://localhost:27017/roadreport');

async function resetReports() {
  try {
    // Clear all existing reports
    await Report.deleteMany({});
    console.log('Cleared all existing reports');

    // Add new sample reports with correct Kabankalan City coordinates
    const reports = [
      {
        type: 'pothole',
        description: 'Large pothole on Main Street affecting traffic flow',
        severity: 'high',
        status: 'verified',
        location: {
          coordinates: {
            latitude: 10.2359,
            longitude: 122.8203
          },
          address: 'Main Street, Kabankalan City, Negros Occidental'
        },
        reportedBy: {
          name: 'Juan Dela Cruz',
          email: 'juan@example.com'
        },
        priority: 'high',
        verifiedAt: new Date(),
        createdAt: new Date()
      },
      {
        type: 'road_damage',
        description: 'Road damage near Kabankalan City Hall causing vehicle issues',
        severity: 'medium',
        status: 'verified',
        location: {
          coordinates: {
            latitude: 10.2365,
            longitude: 122.8210
          },
          address: 'Near City Hall, Kabankalan City, Negros Occidental'
        },
        reportedBy: {
          name: 'Maria Santos',
          email: 'maria@example.com'
        },
        priority: 'medium',
        verifiedAt: new Date(),
        createdAt: new Date()
      },
      {
        type: 'flooding',
        description: 'Flooding on Rizal Street during heavy rain',
        severity: 'high',
        status: 'pending',
        location: {
          coordinates: {
            latitude: 10.2355,
            longitude: 122.8195
          },
          address: 'Rizal Street, Kabankalan City, Negros Occidental'
        },
        reportedBy: {
          name: 'Pedro Garcia',
          email: 'pedro@example.com'
        },
        priority: 'high',
        createdAt: new Date()
      },
      {
        type: 'debris',
        description: 'Fallen tree blocking half of the road',
        severity: 'medium',
        status: 'verified',
        location: {
          coordinates: {
            latitude: 10.2370,
            longitude: 122.8215
          },
          address: 'Burgos Avenue, Kabankalan City, Negros Occidental'
        },
        reportedBy: {
          name: 'Ana Rodriguez',
          email: 'ana@example.com'
        },
        priority: 'medium',
        verifiedAt: new Date(),
        createdAt: new Date()
      }
    ];

    // Insert new reports
    for (const reportData of reports) {
      const report = new Report(reportData);
      await report.save();
      console.log(`Added report: ${reportData.type} at ${reportData.location.address}`);
    }

    console.log('\nAll reports have been reset with correct Kabankalan City coordinates:');
    console.log('Main area center: 10.2359, 122.8203');
    console.log('All reports are within Kabankalan City limits');

    process.exit(0);
  } catch (error) {
    console.error('Error resetting reports:', error);
    process.exit(1);
  }
}

resetReports();
