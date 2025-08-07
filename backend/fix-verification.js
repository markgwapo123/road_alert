const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function fixVerificationFlag() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');
    
    // Find and update the user directly
    const result = await User.updateOne(
      { username: 'Macoy' },
      { 
        $set: { 
          isVerified: true,
          'verification.status': 'approved'
        }
      }
    );
    
    console.log('Update result:', result);
    
    // Verify the update
    const user = await User.findOne({ username: 'Macoy' });
    console.log('Updated user verification status:');
    console.log('- isVerified:', user.isVerified);
    console.log('- verification.status:', user.verification?.status);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixVerificationFlag();
