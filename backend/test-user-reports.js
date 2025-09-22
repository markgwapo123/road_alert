const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://markstephen:i9bU0kJdMXADODWz@cluster0.mx6qk3q.mongodb.net/roadalertsystem?retryWrites=true&w=majority&appName=Cluster0')
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

const User = require('./models/User');
const Report = require('./models/Report');

async function testUserReports() {
  try {
    console.log('\n=== Testing User Reports Functionality ===\n');

    // Get all users
    const users = await User.find().limit(5);
    console.log(`Found ${users.length} users:`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email}) - ID: ${user._id}`);
    });

    if (users.length === 0) {
      console.log('No users found. Creating test users...');
      
      const testUsers = [
        {
          name: 'Test User 1',
          email: 'test1@example.com',
          password: 'password123',
          phoneNumber: '09123456789',
          isActive: true
        },
        {
          name: 'Test User 2', 
          email: 'test2@example.com',
          password: 'password123',
          phoneNumber: '09987654321',
          isActive: true
        }
      ];

      for (const userData of testUsers) {
        const user = new User(userData);
        await user.save();
        console.log(`Created user: ${user.name} - ID: ${user._id}`);
      }
    }

    // Get all reports
    const reports = await Report.find().limit(10);
    console.log(`\nFound ${reports.length} reports:`);
    
    if (reports.length === 0) {
      console.log('No reports found. Creating test reports...');
      
      const testUser = await User.findOne();
      if (testUser) {
        const testReports = [
          {
            type: 'pothole',
            reportType: 'road_damage',
            description: 'Large pothole on main street causing traffic delays',
            location: {
              lat: 10.1753,
              lng: 122.9575,
              address: 'Main Street, Kabankalan City'
            },
            severity: 'high',
            status: 'pending',
            userId: testUser._id,
            reportedBy: {
              name: testUser.name,
              email: testUser.email
            }
          },
          {
            type: 'flooding',
            reportType: 'weather_hazard',
            description: 'Street flooding during heavy rain',
            location: {
              lat: 10.1850,
              lng: 122.9650,
              address: 'City Plaza, Kabankalan City'
            },
            severity: 'medium',
            status: 'verified',
            userId: testUser._id,
            reportedBy: {
              name: testUser.name,
              email: testUser.email
            }
          }
        ];

        for (const reportData of testReports) {
          const report = new Report(reportData);
          await report.save();
          console.log(`Created report: ${report.description.substring(0, 50)}... - ID: ${report._id}`);
        }
      }
    }

    // Test getting reports for a specific user
    const firstUser = await User.findOne();
    if (firstUser) {
      const userReports = await Report.find({ userId: firstUser._id });
      console.log(`\nReports for user ${firstUser.name} (${firstUser._id}):`);
      userReports.forEach((report, index) => {
        console.log(`${index + 1}. ${report.description} - Status: ${report.status}`);
      });
    }

    console.log('\n✅ User reports test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing user reports:', error);
  } finally {
    mongoose.connection.close();
  }
}

testUserReports();