const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

const testOneByOne = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const userIds = await User.find({}, { _id: 1 }).lean();
    
    for (const { _id } of userIds) {
      console.log(`Checking user ID: ${_id}...`);
      try {
        const user = await User.findById(_id).lean().maxTimeMS(5000);
        const size = Buffer.byteLength(JSON.stringify(user));
        console.log(`  User: ${user.username}, Total Size: ${size} bytes`);
        
        if (user.profile) {
          const profileSize = Buffer.byteLength(JSON.stringify(user.profile));
          console.log(`  Profile Size: ${profileSize} bytes`);
          if (user.profile.profileImage) {
             console.log(`  Profile Image Length: ${user.profile.profileImage.length}`);
          }
        }
      } catch (err) {
        console.error(`  ❌ Failed to fetch user ${_id}:`, err.message);
      }
    }
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

testOneByOne();
