const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

async function debugAuth() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to database');
        
        const user = await User.findOne({ email: 'test@example.com' });
        if (!user) {
            console.log('User not found');
            return;
        }
        
        console.log('User found:');
        console.log('Username:', user.username);
        console.log('Email:', user.email);
        console.log('Password hash (first 20 chars):', user.password.substring(0, 20) + '...');
        
        // Test password comparison
        const plainPassword = 'password123';
        console.log('\nTesting password comparison...');
        
        // Method 1: Using bcrypt directly
        const isMatch1 = await bcrypt.compare(plainPassword, user.password);
        console.log('bcrypt.compare result:', isMatch1);
        
        // Method 2: Using user's comparePassword method
        if (user.comparePassword) {
            const isMatch2 = await user.comparePassword(plainPassword);
            console.log('user.comparePassword result:', isMatch2);
        } else {
            console.log('user.comparePassword method not available');
        }
        
        // Test with wrong password
        const isMatch3 = await bcrypt.compare('wrongpassword', user.password);
        console.log('Wrong password test:', isMatch3);
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        mongoose.disconnect();
    }
}

debugAuth();
