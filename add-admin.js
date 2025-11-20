// Script to create an admin user in the database
// Usage: node backend/add-admin.js <username> <password> <email>

const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const db = require('./config/database');

const [,, username, password, email] = process.argv;

if (!username || !password) {
  console.error('Usage: node add-admin.js <username> <password> <email (optional)>');
  process.exit(1);
}

async function createAdmin() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://markstephenmagbatos:P0tLG6YhSS0WBMyl@cluster0.mx6qk3q.mongodb.net/roadalert?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(mongoURI);
    console.log('Connected to database');
    
    // Delete existing admin to avoid conflicts
    await Admin.deleteMany({ username });
    console.log('Removed existing admin users with username:', username);
    
    const admin = new Admin({ username, password, email, isActive: true });
    await admin.save();
    console.log('Admin user created successfully!');
    
    // Test password immediately
    const testAdmin = await Admin.findOne({ username });
    const isMatch = await testAdmin.comparePassword(password);
    console.log('Password verification test:', isMatch);
    
    process.exit(0);
  } catch (err) {
    console.error('Error creating admin:', err);
    process.exit(1);
  }
}

createAdmin();
