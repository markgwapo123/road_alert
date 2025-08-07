const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function createTestUser() {
    console.log('🔧 Creating test user in MongoDB...');
    
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        // Delete existing test user if it exists
        await User.deleteOne({ email: 'test@example.com' });
        console.log('🗑️ Removed any existing test user');
        
        // Create test user (password will be hashed by the model's pre-save hook)
        const testUser = new User({
            username: 'testuser',
            email: 'test@example.com',
            password: 'password123', // Raw password - will be hashed by the model
            isVerified: true,
            isActive: true,
            verification: {
                status: 'approved', // Set as approved so user can submit reports
                submittedAt: new Date(),
                reviewedAt: new Date(),
                documents: {
                    firstName: 'Test',
                    lastName: 'User',
                    phone: '+1234567890',
                    address: 'Test Address',
                    idNumber: 'TEST123456',
                    idType: 'Driver License'
                }
            },
            profile: {
                firstName: 'Test',
                lastName: 'User',
                phone: '+1234567890'
            }
        });
        
        await testUser.save();
        
        console.log('✅ Test user created successfully!');
        console.log('   📧 Email: test@example.com');
        console.log('   👤 Username: testuser');
        console.log('   🔑 Password: password123');
        console.log('   🆔 ID:', testUser._id);
        
    } catch (error) {
        console.error('❌ Error creating test user:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

createTestUser();
