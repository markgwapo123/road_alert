require('dotenv').config();
const mongoose = require('mongoose');
const Report = require('./models/Report');
const User = require('./models/User');

async function updateReporterNames() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');
    
    // Find all reports that need reporter information updated
    const reports = await Report.find({
      $or: [
        { 'reportedBy.name': { $exists: false } },
        { 'reportedBy.name': { $in: [null, ''] } }
      ]
    });
    
    console.log(`Found ${reports.length} reports to update`);
    
    for (const report of reports) {
      try {
        // Find the user who reported this
        const user = await User.findById(report.reportedBy.id);
        
        if (user) {
          const displayName = user.profile?.firstName && user.profile?.lastName 
            ? `${user.profile.firstName} ${user.profile.lastName}`
            : user.username;
          
          // Update the report with proper name
          await Report.findByIdAndUpdate(report._id, {
            'reportedBy.name': displayName,
            'reportedBy.username': user.username,
            'reportedBy.email': user.email
          });
          
          console.log(`Updated report ${report._id} with reporter name: ${displayName}`);
        } else {
          console.log(`User not found for report ${report._id}, setting to username`);
          await Report.findByIdAndUpdate(report._id, {
            'reportedBy.name': report.reportedBy.username || 'Unknown User'
          });
        }
      } catch (error) {
        console.error(`Error updating report ${report._id}:`, error.message);
      }
    }
    
    console.log('Reporter name update complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateReporterNames();