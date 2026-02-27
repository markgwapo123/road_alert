const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://markstephen:your_password@cluster0.mx6qk3q.mongodb.net/roadalertsystem?retryWrites=true&w=majority&appName=Cluster0')
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

const User = require('./models/User');
const Report = require('./models/Report');

async function setupUserReports() {
  try {
    console.log('\n=== Setting up User Reports for Testing ===\n');

    // Update existing users with proper names
    const users = await User.find();
    console.log(`Found ${users.length} users`);

    if (users.length > 0) {
      // Update first user
      await User.findByIdAndUpdate(users[0]._id, {
        name: 'Mark Stephen Magbato',
        phoneNumber: '09123456789'
      });
      console.log(`Updated user: ${users[0].email} -> Mark Stephen Magbato`);

      // Update second user if exists
      if (users[1]) {
        await User.findByIdAndUpdate(users[1]._id, {
          name: 'Tibor Rodriguez',
          phoneNumber: '09987654321'
        });
        console.log(`Updated user: ${users[1].email} -> Tibor Rodriguez`);
      }
    }

    // Create test reports for the users
    const updatedUsers = await User.find();

    if (updatedUsers.length > 0) {
      const user1 = updatedUsers[0];
      const user2 = updatedUsers[1] || updatedUsers[0]; // Use first user if only one exists

      const testReports = [
        {
          type: 'pothole',
          description: 'Large pothole on Mabini Street causing damage to vehicles',
          location: {
            address: 'Mabini Street, Kabankalan City, Negros Occidental',
            coordinates: {
              latitude: 10.1753,
              longitude: 122.9575
            }
          },
          severity: 'high',
          status: 'pending',
          reportedBy: {
            id: user1._id,
            name: user1.name,
            email: user1.email
          }
        },
        {
          type: 'flooding',
          description: 'Heavy flooding on the main highway during typhoon season',
          location: {
            address: 'National Highway, Kabankalan City, Negros Occidental',
            coordinates: {
              latitude: 10.1850,
              longitude: 122.9650
            }
          },
          severity: 'high',
          status: 'verified',
          reportedBy: {
            id: user1._id,
            name: user1.name,
            email: user1.email
          }
        },
        {
          type: 'construction',
          description: 'Multiple broken streetlights near the public market area',
          location: {
            address: 'Public Market Area, Kabankalan City, Negros Occidental',
            coordinates: {
              latitude: 10.1800,
              longitude: 122.9600
            }
          },
          severity: 'medium',
          status: 'pending',
          reportedBy: {
            id: user2._id,
            name: user2.name,
            email: user2.email
          }
        },
        {
          type: 'construction',
          description: 'Ongoing road construction without proper signage causing accidents',
          location: {
            address: 'Rizal Avenue, Kabankalan City, Negros Occidental',
            coordinates: {
              latitude: 10.1780,
              longitude: 122.9580
            }
          },
          severity: 'medium',
          status: 'rejected',
          reportedBy: {
            id: user2._id,
            name: user2.name,
            email: user2.email
          }
        },
        {
          type: 'debris',
          description: 'Fallen tree branches blocking the road after storm',
          location: {
            address: 'Barangay Camingawan, Kabankalan City, Negros Occidental',
            coordinates: {
              latitude: 10.1720,
              longitude: 122.9620
            }
          },
          severity: 'high',
          status: 'verified',
          reportedBy: {
            id: user1._id,
            name: user1.name,
            email: user1.email
          }
        }
      ];

      // Delete existing reports to avoid duplicates
      await Report.deleteMany({});
      console.log('Cleared existing reports');

      // Create new test reports
      for (const reportData of testReports) {
        const report = new Report(reportData);
        await report.save();
        console.log(`Created report: "${report.description.substring(0, 40)}..." by ${report.reportedBy.name} - Status: ${report.status}`);
      }

      // Display summary
      console.log('\n=== Summary ===');
      const finalUsers = await User.find();
      for (const user of finalUsers) {
        const userReports = await Report.find({ userId: user._id });
        console.log(`${user.name} (${user.email}): ${userReports.length} reports`);
      }
    }

    console.log('\n✅ User reports setup completed successfully!');
    console.log('🎯 You can now test the admin user management functionality');

  } catch (error) {
    console.error('❌ Error setting up user reports:', error);
  } finally {
    mongoose.connection.close();
  }
}

setupUserReports();