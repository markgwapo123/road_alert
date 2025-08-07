const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function addVerificationData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');
    
    // Find the user "Macoy"
    const user = await User.findOne({ username: 'Macoy' });
    if (!user) {
      console.log('User "Macoy" not found');
      process.exit(1);
    }
    
    console.log(`Found user: ${user.username} (ID: ${user._id})`);
    
    // Update user with verification data
    user.isVerified = true;
    user.verification = {
      status: 'approved',
      submittedAt: new Date('2025-08-01T10:00:00Z'),
      reviewedAt: new Date('2025-08-02T14:30:00Z'),
      documents: {
        firstName: 'Mark Stephen',
        lastName: 'Magbato',
        phone: '+63 912 345 6789',
        address: '123 Main Street, Kabankalan City, Negros Occidental, Philippines',
        idNumber: 'ID123456789',
        idType: 'drivers_license'
      },
      notes: 'Verification approved - all documents valid'
    };
    
    await user.save();
    console.log('User verification data updated successfully');
    
    // Display the updated user data
    console.log('\nUpdated user verification data:');
    console.log('- Status:', user.verification.status);
    console.log('- Full Name:', user.verification.documents.firstName, user.verification.documents.lastName);
    console.log('- Phone:', user.verification.documents.phone);
    console.log('- Address:', user.verification.documents.address);
    console.log('- ID Type:', user.verification.documents.idType);
    console.log('- Submitted At:', user.verification.submittedAt);
    console.log('- Reviewed At:', user.verification.reviewedAt);
    console.log('- Is Verified:', user.isVerified);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addVerificationData();
