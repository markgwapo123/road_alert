const mongoose = require('mongoose');
const NewsPost = require('./models/NewsPost');
const User = require('./models/User');
require('dotenv').config();

async function addTestViewers() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Database connected successfully');
    
    // Find the sample post
    const post = await NewsPost.findOne({ title: 'sample' });
    if (!post) {
      console.log('❌ Sample post not found');
      process.exit(1);
    }
    
    console.log('Found post:', post.title);
    
    // Find some users to add as viewers
    const users = await User.find().limit(3);
    console.log(`Found ${users.length} users in database`);
    
    if (users.length === 0) {
      console.log('No users found. Creating test viewers...');
      
      // Add some fake viewers for testing
      post.viewedBy = [
        {
          user: new mongoose.Types.ObjectId(),
          viewedAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
        },
        {
          user: new mongoose.Types.ObjectId(),
          viewedAt: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 hours ago
        }
      ];
      
      // Update view count to match unique viewers
      post.views = post.viewedBy.length;
      
    } else {
      // Add real users as viewers
      post.viewedBy = users.map((user, index) => ({
        user: user._id,
        viewedAt: new Date(Date.now() - (index + 1) * 6 * 60 * 60 * 1000) // 6 hours apart
      }));
      
      // Update view count to match unique viewers
      post.views = post.viewedBy.length;
    }
    
    await post.save();
    console.log(`✅ Added ${post.viewedBy.length} viewers to the post`);
    console.log('Updated view count:', post.views);
    
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

addTestViewers();