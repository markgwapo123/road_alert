const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

const pruneOversizedImages = async () => {
  try {
    console.log('🚀 Starting Database Cleanup for Oversized Base64 Images...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const users = await User.find({}).lean();
    console.log(`📊 Scanning ${users.length} user records...`);

    let totalPruned = 0;
    let totalSizeSaved = 0;

    for (const user of users) {
      let needsUpdate = false;
      const updateData = {};

      // Check profile image
      if (user.profile?.profileImage && user.profile.profileImage.startsWith('data:image')) {
        const size = Buffer.byteLength(user.profile.profileImage);
        if (size > 100 * 1024) { // > 100KB
          console.log(`⚠️ Pruning large Base64 profile image for user: ${user.username} (${(size / 1024 / 1024).toFixed(2)} MB)`);
          updateData['profile.profileImage'] = null;
          totalSizeSaved += size;
          needsUpdate = true;
        }
      }

      // Check profile gallery
      if (user.profile?.profilePictureGallery?.length > 0) {
        const newGallery = user.profile.profilePictureGallery.filter(item => {
          if (item.imageUrl && item.imageUrl.startsWith('data:image')) {
            const size = Buffer.byteLength(item.imageUrl);
            if (size > 100 * 1024) {
              console.log(`⚠️ Pruning large Base64 gallery image for user: ${user.username} (${(size / 1024 / 1024).toFixed(2)} MB)`);
              totalSizeSaved += size;
              needsUpdate = true;
              return false; // Remove from gallery
            }
          }
          return true;
        });

        if (needsUpdate && updateData['profile.profileImage'] === undefined) {
           // If we only updated gallery
           updateData['profile.profilePictureGallery'] = newGallery;
        } else if (needsUpdate) {
           updateData['profile.profilePictureGallery'] = newGallery;
        }
      }

      if (needsUpdate) {
        await User.findByIdAndUpdate(user._id, { $set: updateData });
        totalPruned++;
      }
    }

    console.log('\n✨ Cleanup Complete!');
    console.log(`✅ Records updated: ${totalPruned}`);
    console.log(`📉 Estimated space saved: ${(totalSizeSaved / 1024 / 1024).toFixed(2)} MB`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
};

pruneOversizedImages();
