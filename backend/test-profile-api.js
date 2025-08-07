const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function testProfileAPI() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');
    
    // Find the user "Macoy" and display what would be returned by the API
    const user = await User.findOne({ username: 'Macoy' }).select('-password');
    if (!user) {
      console.log('User "Macoy" not found');
      process.exit(1);
    }
    
    console.log('User found:', user.username);
    console.log('Is Verified:', user.isVerified);
    console.log('Verification Status:', user.verification?.status);
    
    // Simulate what the API would return
    const response = {
      success: true,
      type: 'user',
      id: user._id,
      username: user.username,
      email: user.email,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      isVerified: user.isVerified || false,
      verification: {
        status: user.verification?.status || 'pending'
      }
    };

    // Include verification details if user is verified
    if (user.isVerified && user.verification?.status === 'approved' && user.verification?.documents) {
      response.verificationData = {
        firstName: user.verification.documents.firstName,
        lastName: user.verification.documents.lastName,
        phone: user.verification.documents.phone,
        address: user.verification.documents.address,
        idType: user.verification.documents.idType,
        verifiedAt: user.verification.reviewedAt,
        submittedAt: user.verification.submittedAt
      };
    }

    console.log('\nAPI Response would be:');
    console.log(JSON.stringify(response, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testProfileAPI();
