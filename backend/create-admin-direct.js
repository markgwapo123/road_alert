const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Define Admin schema directly in this file to avoid dependency issues
const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minLength: 3,
    maxLength: 50
  },
  password: {
    type: String,
    required: true,
    minLength: 6
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  role: {
    type: String,
    enum: ['admin', 'moderator'],
    default: 'admin'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  permissions: [{
    type: String,
    enum: ['read_reports', 'verify_reports', 'delete_reports', 'manage_users', 'view_analytics']
  }],
  profile: {
    firstName: String,
    lastName: String,
    department: String,
    phone: String
  }
}, {
  timestamps: true
});

// Hash password before saving
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
adminSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Update last login
adminSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

const Admin = mongoose.model('Admin', adminSchema);

async function createAdminUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing admin users
    await Admin.deleteMany({});
    console.log('🗑️  Cleared existing admin users');

    // Create new admin user
    const adminData = {
      username: 'admin',
      password: 'admin123', // This will be hashed automatically by the pre-save hook
      email: 'admin@roadalert.com',
      role: 'admin',
      isActive: true,
      permissions: ['read_reports', 'verify_reports', 'delete_reports', 'manage_users', 'view_analytics']
    };

    const newAdmin = new Admin(adminData);
    await newAdmin.save();
    
    console.log('✅ Admin user created successfully!');
    console.log('📋 Login credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123');

    // Test the password immediately
    const testAdmin = await Admin.findOne({ username: 'admin' });
    const passwordTest = await testAdmin.comparePassword('admin123');
    console.log('🔐 Password verification test:', passwordTest ? 'PASSED' : 'FAILED');

    if (passwordTest) {
      console.log('✅ Admin user is ready for login!');
    } else {
      console.log('❌ Password verification failed - there may be an issue');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();
