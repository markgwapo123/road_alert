const axios = require('axios');

const BASE_URL = 'http://localhost:3011/api';

async function testEndpoint(name, url, method = 'get', data = null) {
  const start = Date.now();
  try {
    const response = await axios({
      method,
      url: BASE_URL + url,
      data
    });
    const duration = Date.now() - start;
    console.log(`✅ ${name}: ${duration}ms (Status: ${response.status})`);
    return duration;
  } catch (error) {
    const duration = Date.now() - start;
    console.log(`❌ ${name}: ${duration}ms (Error: ${error.message})`);
    return duration;
  }
}

async function runTests() {
  console.log('🚀 Starting Backend Speed Test...\n');

  // Test Public Health
  await testEndpoint('Health Check', '/health');
  
  // Test Public Stats
  await testEndpoint('Report Stats', '/reports/stats');

  // Test Login Speed (The most critical one for initial impression)
  console.log('\n🔐 Testing Login Speed (Admin)...');
  const loginStart = Date.now();
  try {
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    const loginDuration = Date.now() - loginStart;
    console.log(`✅ Login: ${loginDuration}ms`);
    
    const token = loginRes.data.token;
    
    // Test Authenticated Endpoints
    console.log('\n🔑 Testing Authenticated Endpoints (Cached vs Fresh)...');
    
    // 1. Dashboard (Consolidated)
    await testEndpoint('Dashboard (First Load)', '/dashboard', 'get', null, token);
    await testEndpoint('Dashboard (Cached Hit)', '/dashboard', 'get', null, token);
    
    // 2. My Reports
    await testEndpoint('My Reports (First Load)', '/reports/my-reports', 'get', null, token);
    await testEndpoint('My Reports (Cached Hit)', '/reports/my-reports', 'get', null, token);

  } catch (error) {
    console.log('❌ Login failed, skipping authenticated tests.');
  }

  console.log('\n✨ Speed Test Complete.');
}

// Wrapper for auth
async function testEndpointAuth(name, url, token) {
  const start = Date.now();
  try {
    const response = await axios.get(BASE_URL + url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const duration = Date.now() - start;
    console.log(`✅ ${name}: ${duration}ms`);
  } catch (error) {
    const duration = Date.now() - start;
    console.log(`❌ ${name}: ${duration}ms (Error: ${error.message})`);
  }
}

// Modified runTests to use the auth wrapper
async function runTestsFinal() {
  console.log('🚀 Starting Backend Speed Test...\n');

  await testEndpoint('Health Check', '/health');
  await testEndpoint('Report Stats', '/reports/stats');

  console.log('\n🔐 Testing Login Speed (Admin)...');
  try {
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    const token = loginRes.data.token;
    console.log('✅ Login Successful.');

    console.log('\n🔑 Testing Authenticated Endpoints...');
    await testEndpointAuth('Dashboard (First Load)', '/dashboard', token);
    await testEndpointAuth('Dashboard (Cached Hit)', '/dashboard', token);
    
    await testEndpointAuth('Notifications (First Load)', '/notifications', token);
    await testEndpointAuth('Notifications (Cached Hit)', '/notifications', token);

  } catch (error) {
    console.log('❌ Login failed. Check if server is running on 3011.');
  }
}

runTestsFinal();
