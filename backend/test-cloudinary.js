// Quick test to verify Cloudinary configuration
require('dotenv').config();

console.log('🧪 Testing Cloudinary Configuration...\n');

console.log('Environment Variables:');
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? '✅ Set' : '❌ Missing');
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Missing');
console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '✅ Set' : '❌ Missing');

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('\n❌ Cloudinary environment variables are missing!');
  console.log('\nAdd these to your .env file:');
  console.log('CLOUDINARY_CLOUD_NAME=dypojnfqs');
  console.log('CLOUDINARY_API_KEY=683753727435452');
  console.log('CLOUDINARY_API_SECRET=wa9QFBfpopbbvaNtNQcRdjCfdyk');
  process.exit(1);
}

console.log('\n✅ All Cloudinary environment variables are set!');

// Try to load Cloudinary
try {
  const { cloudinary } = require('./config/cloudinary');
  console.log('\n✅ Cloudinary config loaded successfully!');
  console.log('📦 Cloud Name:', cloudinary.config().cloud_name);
} catch (error) {
  console.error('\n❌ Error loading Cloudinary config:', error.message);
  process.exit(1);
}

console.log('\n🎉 Cloudinary is configured correctly!');
