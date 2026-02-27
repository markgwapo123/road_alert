// Cleanup script to remove old/duplicate settings from database
require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/road_alert';

async function cleanupSettings() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected!\n');

    // Settings to remove (duplicates and removed features)
    const settingsToRemove = [
      'report_auto_expire_days',
      'report_expiry_days', 
      'enable_anonymous_reports',
      'allow_anonymous_reports',
      'max_images_per_report',
      'auto_verify_threshold',
      'notifications_enabled',
      'email_notifications',
      'sms_notifications',
      'push_notifications',
      'notification_frequency',
      'notification_radius_km',
      'two_factor_auth',
      'ip_whitelist',
      'data_retention_days',
      'require_image_for_report' // duplicate of require_image
    ];

    const SystemSettings = mongoose.model('SystemSetting', new mongoose.Schema({
      key: String,
      value: mongoose.Schema.Types.Mixed,
      category: String
    }));

    console.log('🧹 Removing old/duplicate settings...\n');
    
    for (const key of settingsToRemove) {
      const result = await SystemSettings.deleteMany({ key });
      if (result.deletedCount > 0) {
        console.log(`  ❌ Removed: ${key} (${result.deletedCount} entries)`);
      }
    }

    // List remaining settings
    console.log('\n📋 Remaining settings in database:\n');
    const remaining = await SystemSettings.find({}).sort({ category: 1, key: 1 });
    
    let currentCategory = '';
    for (const setting of remaining) {
      if (setting.category !== currentCategory) {
        currentCategory = setting.category;
        console.log(`\n  [${currentCategory.toUpperCase()}]`);
      }
      console.log(`    • ${setting.key}: ${setting.value}`);
    }

    console.log('\n✅ Cleanup complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

cleanupSettings();
