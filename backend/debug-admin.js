const mongoose = require('mongoose');
const Admin = require('./models/Admin');
require('dotenv').config();

const debugAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all admins
    const admins = await Admin.find({});
    
    console.log('\n👤 All admins:');
    for (const admin of admins) {
      console.log('-----------------------------------');
      console.log('  - ID:', admin._id);
      console.log('  - Username:', admin.username);
      console.log('  - Role:', admin.role);
      console.log('  - Role type:', typeof admin.role);
      console.log('  - Role === "super_admin":', admin.role === 'super_admin');
      console.log('  - Is Active:', admin.isActive);
      console.log('  - Permissions:', admin.permissions);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

debugAdmin();