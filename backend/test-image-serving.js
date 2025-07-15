// Test script to validate image serving and fix any issues
const fs = require('fs');
const path = require('path');

async function testImageServing() {
  console.log('🔧 Testing Image Serving Setup\n');

  // Check uploads directory
  const uploadsPath = path.join(__dirname, 'uploads');
  console.log('📁 Uploads directory:', uploadsPath);
  
  if (!fs.existsSync(uploadsPath)) {
    console.log('❌ Uploads directory does not exist! Creating...');
    fs.mkdirSync(uploadsPath, { recursive: true });
    console.log('✅ Uploads directory created');
  } else {
    console.log('✅ Uploads directory exists');
  }

  // List files in uploads
  const files = fs.readdirSync(uploadsPath);
  console.log('\n📸 Files in uploads directory:');
  files.forEach(file => {
    const filePath = path.join(uploadsPath, file);
    const stats = fs.statSync(filePath);
    console.log(`  ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
  });

  // Test image accessibility
  if (files.length > 0) {
    console.log('\n🌐 Testing image URLs that should work:');
    files.forEach(file => {
      console.log(`  http://localhost:3001/uploads/${file}`);
    });
  } else {
    console.log('\n⚠️  No images found for testing');
  }

  // Check backend server
  console.log('\n🚀 Backend server should be running on:');
  console.log('  Main server: http://localhost:3001');
  console.log('  Health check: http://localhost:3001/api/health');
  console.log('  Reports API: http://localhost:3001/api/reports');

  console.log('\n📋 To test manually:');
  console.log('1. Start backend: cd backend && node server.js');
  console.log('2. Open: http://localhost:3001/api/health');
  console.log('3. Test image: http://localhost:3001/uploads/[filename]');  console.log('4. Open test page: test-image-display.html');
}

testImageServing();
