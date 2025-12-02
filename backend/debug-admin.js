const mongoose = require('mongoose');
const Admin = require('./models/Admin');
require('dotenv').config();

const debugAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find the dp-admin user
    const admin = await Admin.findOne({ username: 'dp-admin' });
    
    if (admin) {
      console.log('\n👤 Found dp-admin:');
      console.log('  - ID:', admin._id);
      console.log('  - Username:', admin.username);
      console.log('  - Role:', admin.role);
      console.log('  - Permissions:', admin.permissions);
      console.log('  - Permissions type:', typeof admin.permissions);
      console.log('  - Permissions array?', Array.isArray(admin.permissions));
      console.log('  - Is Active:', admin.isActive);
      console.log('  - Raw document:', JSON.stringify(admin.toJSON(), null, 2));
    } else {
      console.log('❌ dp-admin not found');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

debugAdmin();