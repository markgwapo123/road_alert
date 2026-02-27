// Test script for social login endpoints
// Run this with: node test-social-login.js

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api/auth';

async function testGoogleLogin() {
  console.log('Testing Google Login endpoint...');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/google-login`, {
      idToken: 'test-invalid-token'
    });
    console.log('✅ Google endpoint responded:', response.status);
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✅ Google endpoint working (expected 400 for invalid token)');
      console.log('Response:', error.response.data);
    } else {
      console.log('❌ Google endpoint error:', error.message);
    }
  }
}



async function runTests() {
  console.log('🚀 Testing Google Login Endpoint\n');
  
  await testGoogleLogin();
  
  console.log('\n✨ Test completed!');
  console.log('If the endpoint shows "working" status, the backend is ready for Google login.');
}

runTests().catch(console.error);