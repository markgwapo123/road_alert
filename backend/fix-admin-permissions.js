const mongoose = require('mongoose');
const Admin = require('./models/Admin');
require('dotenv').config();

const fixAdminPermissions = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all admins
    const admins = await Admin.find({});
    console.log(`📊 Found ${admins.length} admin(s)`);

    for (const admin of admins) {
      console.log(`\n👤 Admin: ${admin.username} (${admin.role})`);
      console.log(`📋 Current permissions:`, admin.permissions);

      // Define required permissions based on role
      let requiredPermissions = [];
      
      if (admin.role === 'super_admin') {
        requiredPermissions = [
          'manage_admins',
          'review_reports',
          'accept_reports',
          'reject_reports',
          'create_news_posts',
          'manage_users',
          'view_analytics',
          'system_settings'
        ];
      } else if (admin.role === 'admin_user') {
        requiredPermissions = [
          'review_reports',
          'accept_reports',
          'reject_reports',
          'create_news_posts'
        ];
      }

      // Update permissions
      admin.permissions = requiredPermissions;
      await admin.save();

      console.log(`✅ Updated permissions for ${admin.username}:`, requiredPermissions);
    }

    console.log('\n🎉 All admin permissions have been updated successfully!');

  } catch (error) {
    console.error('❌ Error fixing admin permissions:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the script
fixAdminPermissions();