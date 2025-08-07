// MongoDB-compatible script to create a test user
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

async function createTestUser() {
    console.log('🔧 Creating test user in MongoDB...');
    
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        // Check if test user already exists
        const existingUser = await User.findOne({ email: 'test@example.com' });
        
        if (existingUser) {
            console.log('✅ Test user already exists');
            console.log('   📧 Email: test@example.com');
            console.log('   � Password: password123');
            return;
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash('password123', 10);
        
        // Create test user
        const testUser = new User({
            username: 'testuser',
            email: 'test@example.com',
            password: hashedPassword,
            isVerified: true,
            isActive: true,
            profile: {
                firstName: 'Test',
                lastName: 'User',
                phone: '+1234567890'
            }
        });
        
        await testUser.save();
        
        console.log('✅ Test user created successfully!');
        console.log('   📧 Email: test@example.com');
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
