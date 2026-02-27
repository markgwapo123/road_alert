// Test script to submit a report to the backend
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'https://roadalert-backend-xze4.onrender.com/api';
const TOKEN = 'your_token_here'; // You'll need to replace this with a real token

async function testSubmitReport() {
  console.log('🧪 Testing Report Submission...\n');
  
  try {
    // First, let's test if the backend is awake
    console.log('1️⃣ Testing backend connectivity...');
    const healthCheck = await axios.get(`${API_BASE_URL}/reports`, {
      timeout: 5000
    });
    console.log('✅ Backend is responding!\n');
    
    // Create form data for the report
    console.log('2️⃣ Preparing test report data...');
    const data = new FormData();
    data.append('type', 'pothole');
    data.append('province', 'negros-occidental');
    data.append('city', 'kabankalan');
    data.append('barangay', 'tabugon');
    data.append('description', 'Test report from automated script - checking if image upload works with Cloudinary');
    data.append('location[address]', 'Tabugon, Kabankalan City, Negros Occidental');
    data.append('location[coordinates][latitude]', '10.289152');
    data.append('location[coordinates][longitude]', '123.882701');
    
    // Create a simple test image (1x1 pixel PNG)
    const testImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    
    data.append('images', testImageBuffer, {
      filename: 'test-image.png',
      contentType: 'image/png'
    });
    
    console.log('3️⃣ Submitting report to backend...');
    console.log(`   URL: ${API_BASE_URL}/reports/user`);
    console.log('   Timeout: 5 seconds\n');
    
    const startTime = Date.now();
    
    const response = await axios.post(`${API_BASE_URL}/reports/user`, data, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        ...data.getHeaders()
      },
      timeout: 5000,
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        console.log(`   📤 Upload progress: ${percentCompleted}%`);
      }
    });
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`\n✅ Report submitted successfully in ${duration} seconds!`);
    console.log('\n📊 Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.data?.images && response.data.data.images.length > 0) {
      const imageUrl = response.data.data.images[0].filename;
      console.log('\n🖼️ Image URL:', imageUrl);
      
      if (imageUrl.startsWith('https://res.cloudinary.com/')) {
        console.log('✅ Image is stored on Cloudinary! (Persistent storage)');
      } else {
        console.log('⚠️ Image is stored locally (Will be deleted on server restart)');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.code === 'ECONNABORTED') {
      console.error('⏱️ Request timed out after 5 seconds');
      console.error('💡 The server might be sleeping. Try increasing timeout or waiting a minute.');
    } else if (error.response) {
      console.error('📋 Response status:', error.response.status);
      console.error('📋 Response data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('📡 No response received from server');
      console.error('💡 The server might be down or unreachable');
    }
  }
}

// Run the test
testSubmitReport();
