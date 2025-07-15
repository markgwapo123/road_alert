const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function createTestUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Sample users data
    const testUsers = [
      {
        username: 'john_doe',
        email: 'john@example.com',
        password: 'password123',
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          phone: '+639123456789'
        },
        lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago (active)
      },
      {
        username: 'jane_smith',
        email: 'jane@example.com',
        password: 'password123',
        profile: {
          firstName: 'Jane',
          lastName: 'Smith',
          phone: '+639987654321'
        },
        lastLogin: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago (active)
      },
      {
        username: 'mike_johnson',
        email: 'mike@example.com',
        password: 'password123',
        profile: {
          firstName: 'Mike',
          lastName: 'Johnson',
          phone: '+639555123456'
        },
        lastLogin: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago (active)
      },
      {
        username: 'sarah_wilson',
        email: 'sarah@example.com',
        password: 'password123',
        profile: {
          firstName: 'Sarah',
          lastName: 'Wilson',
          phone: '+639444789123'
        },
        lastLogin: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago (inactive)
      },
      {
        username: 'david_brown',
        email: 'david@example.com',
        password: 'password123',
        profile: {
          firstName: 'David',
          lastName: 'Brown',
          phone: '+639333456789'
        },
        lastLogin: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 1 week ago (inactive)
      }
    ];

    console.log('🗑️  Clearing existing users...');
    await User.deleteMany({});

    console.log('👥 Creating test users...');
    for (const userData of testUsers) {
      const user = new User(userData);
      await user.save();
      console.log(`✅ Created user: ${user.username} (${user.email})`);
    }

    // Display statistics
    const totalUsers = await User.countDocuments();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeUsers = await User.countDocuments({ 
      lastLogin: { $gte: oneDayAgo } 
    });

    console.log('\n📊 User Statistics:');
    console.log(`Total Users: ${totalUsers}`);
    console.log(`Active Users (last 24h): ${activeUsers}`);
    console.log(`Inactive Users: ${totalUsers - activeUsers}`);

    console.log('\n✅ Test users created successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error creating test users:', error);
    process.exit(1);
  }
}

createTestUsers();
