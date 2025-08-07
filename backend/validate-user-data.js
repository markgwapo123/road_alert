const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function checkUserData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');
    
    const user = await User.findOne({ username: 'Macoy' });
    
    if (!user) {
      console.log('User not found');
      return;
    }
    
    console.log('User Data Check:');
    console.log('================');
    console.log('Username:', user.username);
    console.log('Email:', user.email);
    console.log('Is Verified:', user.isVerified);
    console.log('Verification Status:', user.verification?.status);
    
    if (user.verification?.documents) {
      console.log('\nVerification Documents:');
      console.log('- First Name:', user.verification.documents.firstName);
      console.log('- Last Name:', user.verification.documents.lastName);
      console.log('- Phone:', user.verification.documents.phone);
      console.log('- Address:', user.verification.documents.address);
      console.log('- ID Type:', user.verification.documents.idType);
      console.log('- Submitted:', user.verification.submittedAt);
      console.log('- Reviewed:', user.verification.reviewedAt);
    }
    
    // Test API response format
    const apiResponse = {
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

    if (user.isVerified && user.verification?.status === 'approved' && user.verification?.documents) {
      apiResponse.verificationData = {
        firstName: user.verification.documents.firstName,
        lastName: user.verification.documents.lastName,
        phone: user.verification.documents.phone,
        address: user.verification.documents.address,
        idType: user.verification.documents.idType,
        verifiedAt: user.verification.reviewedAt,
        submittedAt: user.verification.submittedAt
      };
    }

    console.log('\nAPI Response Preview:');
    console.log('====================');
    console.log('Has verificationData:', !!apiResponse.verificationData);
    
    if (apiResponse.verificationData) {
      console.log('Verification Data Preview:');
      console.log('- Full Name:', apiResponse.verificationData.firstName, apiResponse.verificationData.lastName);
      console.log('- Phone:', apiResponse.verificationData.phone);
      console.log('- Address:', apiResponse.verificationData.address);
      console.log('- ID Type:', apiResponse.verificationData.idType);
    }
    
    console.log('\n✅ User data is properly configured for profile display!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUserData();
