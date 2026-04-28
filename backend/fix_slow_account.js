const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

async function cleanUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const user = await User.findOne({ email: 'mark@gmail.com' });
        
        if (!user) {
            console.log('User not found');
            return;
        }

        console.log('Found user:', user.username);
        
        // Check if there's a Base64 image
        if (user.profile.profileImage && user.profile.profileImage.startsWith('data:')) {
            console.log('Purging giant Base64 profile image...');
            user.profile.profileImage = null; // Remove it to fix speed
        }

        // Also clean gallery if it has Base64
        if (user.profile.profilePictureGallery) {
            const originalLength = user.profile.profilePictureGallery.length;
            user.profile.profilePictureGallery = user.profile.profilePictureGallery.filter(
                item => !item.imageUrl.startsWith('data:')
            );
            console.log(`Cleaned gallery: Removed ${originalLength - user.profile.profilePictureGallery.length} Base64 items.`);
        }

        await user.save();
        console.log('✅ User account cleaned! Login should be fast now.');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

cleanUser();
