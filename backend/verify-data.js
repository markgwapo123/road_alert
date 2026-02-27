const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://markstephen:your_password@cluster0.mx6qk3q.mongodb.net/roadalertsystem?retryWrites=true&w=majority&appName=Cluster0')
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

const User = require('./models/User');
const Report = require('./models/Report');

async function verifyData() {
  try {
    console.log('\n=== Database Verification ===\n');

    // Check users
    const users = await User.find({});
    console.log(`Found ${users.length} users:`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. Name: "${user.name}" | Email: ${user.email} | ID: ${user._id}`);
    });

    // Check reports
    const reports = await Report.find({});
    console.log(`\nFound ${reports.length} reports:`);
    reports.forEach((report, index) => {
      console.log(`${index + 1}. Type: ${report.type} | Reporter ID: ${report.reportedBy?.id} | Reporter Name: "${report.reportedBy?.name}" | Status: ${report.status}`);
    });

    // Cross-check reports with users
    console.log('\n=== Cross-checking Reports with Users ===');
    for (const user of users) {
      const userReports = await Report.find({ 'reportedBy.id': user._id });
      console.log(`User "${user.name}" (${user._id}): ${userReports.length} reports`);
      userReports.forEach((report, index) => {
        console.log(`  ${index + 1}. ${report.type}: ${report.description.substring(0, 40)}...`);
      });
    }

    console.log('\n✅ Verification completed!');

  } catch (error) {
    console.error('❌ Error verifying data:', error);
  } finally {
    mongoose.connection.close();
  }
}

verifyData();