const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

const pruneOversizedImages = async () => {
  try {
    console.log('🚀 Starting Optimized Database Cleanup for Oversized Base64 Images...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // First, just get the IDs to avoid fetching bloated data all at once
    const userIds = await User.find({}, { _id: 1 }).lean();
    console.log(`📊 Scanning ${userIds.length} user records...`);

    let totalPruned = 0;
    let totalSizeSaved = 0;

    for (const { _id } of userIds) {
      // Fetch each user individually with a timeout
      let user;
      try {
        user = await User.findById(_id).lean().maxTimeMS(10000);
      } catch (err) {
        console.error(`⚠️ Could not fetch user ${_id} (likely too bloated to fetch even individually):`, err.message);
        // If we can't even fetch it, we might need to use a more surgical update
        console.log(`🔧 Attempting surgical prune for user ${_id}...`);
        await User.findByIdAndUpdate(_id, { 
            $set: { 'profile.profileImage': null, 'profile.profilePictureGallery': [] } 
        });
        totalPruned++;
        continue;
      }

      if (!user) continue;

      let needsUpdate = false;
      const updateData = {};

      // Check profile image
      if (user.profile?.profileImage && user.profile.profileImage.startsWith('data:image')) {
        const size = Buffer.byteLength(user.profile.profileImage);
        if (size > 50 * 1024) { // > 50KB
          console.log(`⚠️ Pruning large Base64 profile image for user: ${user.username} (${(size / 1024 / 1024).toFixed(2)} MB)`);
          updateData['profile.profileImage'] = null;
          totalSizeSaved += size;
          needsUpdate = true;
        }
      }

      // Check profile gallery
      if (user.profile?.profilePictureGallery?.length > 0) {
        const initialGallerySize = user.profile.profilePictureGallery.length;
        const newGallery = user.profile.profilePictureGallery.filter(item => {
          if (item.imageUrl && item.imageUrl.startsWith('data:image')) {
            const size = Buffer.byteLength(item.imageUrl);
            if (size > 50 * 1024) {
              console.log(`⚠️ Pruning large Base64 gallery image for user: ${user.username} (${(size / 1024 / 1024).toFixed(2)} MB)`);
              totalSizeSaved += size;
              needsUpdate = true;
              return false; // Remove from gallery
            }
          }
          return true;
        });

        if (newGallery.length !== initialGallerySize) {
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
