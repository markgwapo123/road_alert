const mongoose = require('mongoose');
const Report = require('./models/Report');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/roadreport')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

async function addKabankalanReports() {
  try {
    // Clear existing reports first
    await Report.deleteMany({});
    console.log('Cleared existing reports');

    // Sample reports with Kabankalan City coordinates
    const reports = [
      {
        type: 'pothole',
        description: 'Large pothole on main road near Kabankalan City Hall',
        location: {
          address: 'City Hall Road, Kabankalan City, Negros Occidental',
          coordinates: {
            latitude: 10.2400,
            longitude: 122.8200
          }
        },
        severity: 'high',
        status: 'verified',
        reportedBy: {
          name: 'John Doe',
          email: 'john@example.com'
        },
        priority: 'high',
        verifiedAt: new Date()
      },
      {
        type: 'debris',
        description: 'Fallen tree blocking road in Barangay 1',
        location: {
          address: 'Barangay 1, Kabankalan City, Negros Occidental',
          coordinates: {
            latitude: 10.2390,
            longitude: 122.8210
          }
        },
        severity: 'medium',
        status: 'verified',
        reportedBy: {
          name: 'Maria Santos',
          email: 'maria@example.com'
        },
        priority: 'medium',
        verifiedAt: new Date()
      },
      {
        type: 'flooding',
        description: 'Road flooding after heavy rain near public market',
        location: {
          address: 'Public Market Area, Kabankalan City, Negros Occidental',
          coordinates: {
            latitude: 10.2380,
            longitude: 122.8190
          }
        },
        severity: 'high',
        status: 'verified',
        reportedBy: {
          name: 'Pedro Cruz',
          email: 'pedro@example.com'
        },
        priority: 'high',
        verifiedAt: new Date()
      },
      {
        type: 'construction',
        description: 'Road construction causing traffic delays',
        location: {
          address: 'Barangay 2, Kabankalan City, Negros Occidental',
          coordinates: {
            latitude: 10.2420,
            longitude: 122.8220
          }
        },
        severity: 'low',
        status: 'pending',
        reportedBy: {
          name: 'Ana Garcia',
          email: 'ana@example.com'
        },
        priority: 'low'
      },
      {
        type: 'accident',
        description: 'Minor traffic accident reported, road partially blocked',
        location: {
          address: 'Barangay 3, Kabankalan City, Negros Occidental',
          coordinates: {
            latitude: 10.2410,
            longitude: 122.8180
          }
        },
        severity: 'medium',
        status: 'verified',
        reportedBy: {
          name: 'Carlos Reyes',
          email: 'carlos@example.com'
        },
        priority: 'medium',
        verifiedAt: new Date()
      },
      {
        type: 'other',
        description: 'Broken street light causing visibility issues',
        location: {
          address: 'Barangay 5, Kabankalan City, Negros Occidental',
          coordinates: {
            latitude: 10.2370,
            longitude: 122.8230
          }
        },
        severity: 'low',
        status: 'verified',
        reportedBy: {
          name: 'Lisa Mendoza',
          email: 'lisa@example.com'
        },
        priority: 'low',
        verifiedAt: new Date()
      }
    ];

    // Insert all reports
    const savedReports = await Report.insertMany(reports);
    console.log(`✅ Added ${savedReports.length} test reports with Kabankalan City coordinates:`);
    
    savedReports.forEach((report, index) => {
      console.log(`${index + 1}. ${report.type} - ${report.location.address}`);
      console.log(`   Coordinates: ${report.location.coordinates.latitude}, ${report.location.coordinates.longitude}`);
      console.log(`   Status: ${report.status} | Severity: ${report.severity}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error adding reports:', error);
  } finally {
    mongoose.disconnect();
  }
}

addKabankalanReports();
