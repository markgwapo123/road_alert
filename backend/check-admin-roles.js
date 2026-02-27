require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin');

async function checkRoles() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const admins = await Admin.find({});
    console.log('\n=== All Admin Users ===\n');
    
    for (const admin of admins) {
      console.log(`Username: ${admin.username}`);
      console.log(`  Role: "${admin.role}"`);
      console.log(`  Role type: ${typeof admin.role}`);
      console.log(`  role === 'super_admin': ${admin.role === 'super_admin'}`);
      console.log(`  isActive: ${admin.isActive}`);
      console.log('');
    }
    
    await mongoose.disconnect();
    console.log('Disconnected');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkRoles();
