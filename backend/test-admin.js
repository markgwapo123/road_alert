const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const db = require('./config/database');

async function testAdmin() {
  try {
    await mongoose.connect(db.mongoURI);
    console.log('Connected to database');
    
    // Find admin
    const admin = await Admin.findOne({ username: 'admin' });
    if (!admin) {
      console.log('Admin user not found');
      
      // Create admin
      console.log('Creating new admin...');
      const newAdmin = new Admin({
        username: 'admin',
        password: 'Gwapoko@123',
        email: 'admin@example.com'
      });
      await newAdmin.save();
      console.log('Admin created successfully');
      
      // Test login immediately
      const testAdmin = await Admin.findOne({ username: 'admin' });
      const isMatch = await testAdmin.comparePassword('Gwapoko@123');
      console.log('Password test result:', isMatch);
    } else {
      console.log('Admin found:', admin.username);
      console.log('Testing password...');
      const isMatch = await admin.comparePassword('Gwapoko@123');
      console.log('Password test result:', isMatch);
      
      if (!isMatch) {
        console.log('Password does not match. Updating password...');
        admin.password = 'Gwapoko@123';
        await admin.save();
        console.log('Password updated');
        
        // Test again
        const updatedAdmin = await Admin.findOne({ username: 'admin' });
        const newMatch = await updatedAdmin.comparePassword('Gwapoko@123');
        console.log('New password test result:', newMatch);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testAdmin();
