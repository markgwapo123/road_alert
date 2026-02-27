require('dotenv').config();
const mongoose = require('mongoose');
const Report = require('./models/Report');
const User = require('./models/User');

async function addTestReports() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');
    
    // Find a user to associate reports with
    const user = await User.findOne();
    if (!user) {
      console.log('No users found. Please create a user first.');
      process.exit(1);
    }
    
    console.log('Found user:', user.username);
    
    const testReports = [
      {
        type: 'pothole',
        description: 'Large pothole on main street causing traffic issues. Drivers are swerving to avoid it.',
        severity: 'high',
        status: 'pending',
        location: {
          address: 'Main Street, Downtown Area',
          coordinates: { latitude: 10.652877, longitude: 122.958643 }
        },
        reportedBy: {
          id: user._id,
          name: user.username,
          username: user.username,
          email: user.email
        }
      },
      {
        type: 'debris',
        description: 'Tree branch blocking one lane after recent storm. Needs immediate removal.',
        severity: 'medium',
        status: 'verified',
        location: {
          address: 'Oak Avenue, Residential District',
          coordinates: { latitude: 10.655877, longitude: 122.955643 }
        },
        reportedBy: {
          id: user._id,
          name: user.username,
          username: user.username,
          email: user.email
        }
      },
      {
        type: 'flooding',
        description: 'Road flooded due to blocked drainage. Water level reaching 6 inches deep.',
        severity: 'high',
        status: 'resolved',
        location: {
          address: 'River Road, Industrial Zone',
          coordinates: { latitude: 10.648877, longitude: 122.962643 }
        },
        reportedBy: {
          id: user._id,
          name: user.username,
          username: user.username,
          email: user.email
        }
      },
      {
        type: 'construction',
        description: 'Unannounced road work causing major delays. No proper signage or detour markers.',
        severity: 'medium',
        status: 'verified',
        location: {
          address: 'Highway 101, Commercial Area',
          coordinates: { latitude: 10.650877, longitude: 122.960643 }
        },
        reportedBy: {
          id: user._id,
          name: user.username,
          username: user.username,
          email: user.email
        }
      },
      {
        type: 'accident',
        description: 'Minor fender bender cleared but debris still on road. Glass and plastic pieces scattered.',
        severity: 'low',
        status: 'rejected',
        location: {
          address: 'Park Lane, Suburban Area',
          coordinates: { latitude: 10.654877, longitude: 122.957643 }
        },
        reportedBy: {
          id: user._id,
          name: user.username,
          username: user.username,
          email: user.email
        },
        adminNotes: 'Duplicate report - already resolved by maintenance team'
      }
    ];
    
    // Insert test reports
    await Report.insertMany(testReports);
    console.log(`✅ Added ${testReports.length} test reports for user: ${user.username}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addTestReports();