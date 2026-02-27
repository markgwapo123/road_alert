const mongoose = require('mongoose');
const NewsPost = require('./models/NewsPost');
require('dotenv').config();

async function connectAndFixViewCounts() {
  try {
    console.log('Connecting to database...');
    
    // Database connection with better error handling
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Database connected successfully');
    
    console.log('Starting view count recalculation...');
    
    const newsPosts = await NewsPost.find({});
    console.log(`Found ${newsPosts.length} news posts`);
    
    if (newsPosts.length === 0) {
      console.log('No news posts found in the database');
      await mongoose.connection.close();
      process.exit(0);
    }
    
    for (let post of newsPosts) {
      const uniqueViewCount = post.viewedBy.length;
      
      if (post.views !== uniqueViewCount) {
        console.log(`Updating post "${post.title}": ${post.views} -> ${uniqueViewCount} views`);
        post.views = uniqueViewCount;
        await post.save();
      } else {
        console.log(`Post "${post.title}" already has correct view count: ${post.views}`);
      }
    }
    
    console.log('✅ View count recalculation completed successfully!');
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

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\nProcess interrupted, closing database connection...');
  await mongoose.connection.close();
  process.exit(0);
});

connectAndFixViewCounts();