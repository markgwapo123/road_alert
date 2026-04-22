const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const BASE_URL = 'http://localhost:3011/api';
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// Test targets
const ENDPOINTS = [
  { name: 'Dashboard', url: '/dashboard' },
  { name: 'My Reports', url: '/reports/my-reports' },
  { name: 'Notifications', url: '/notifications' },
  { name: 'Unread Count', url: '/notifications/unread-count' },
  { name: 'Profile (Me)', url: '/users/me' },
  { name: 'User Stats', url: '/users/me/stats' }
];

async function generateTestToken() {
  const mongoose = require('mongoose');
  const User = require('./models/User');
  
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await User.findOne({ email: 'mark@gmail.com' });
  
  if (!user) {
    console.error('❌ Test user mark@gmail.com not found');
    process.exit(1);
  }
  
  const token = jwt.sign(
    { id: user._id, username: user.username, email: user.email },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
  
  await mongoose.disconnect();
  return token;
}

async function testEndpoint(name, url, token) {
  const start = Date.now();
  try {
    const response = await axios.get(BASE_URL + url, {
      headers: { 'Authorization': `Bearer ${token}` },
      timeout: 30000 // 30s timeout
    });
    const duration = Date.now() - start;
    console.log(`✅ ${name.padEnd(20)} | ${duration.toString().padStart(5)}ms | Cache: ${response.data.fromCache ? 'HIT' : 'MISS'}`);
    return duration;
  } catch (error) {
    const duration = Date.now() - start;
    console.log(`❌ ${name.padEnd(20)} | ${duration.toString().padStart(5)}ms | Error: ${error.response?.status || error.message}`);
    if (error.response) {
      console.log(`   Detail: ${JSON.stringify(error.response.data)}`);
    }
    return duration;
  }
}

async function runFullDiagnostics() {
  console.log('🚀 Starting "Anti-Gravity" Performance Diagnostics...\n');
  console.log('------------------------------------------------------------');
  console.log(' Endpoint             | Response | Details');
  console.log('------------------------------------------------------------');

  try {
    const token = await generateTestToken();
    
    for (const ep of ENDPOINTS) {
      // Test 1: Cold Load (Database)
      await testEndpoint(`${ep.name} (Cold)`, ep.url, token);
      
      // Test 2: Hot Load (Cache)
      await testEndpoint(`${ep.name} (Hot)`, ep.url, token);
      console.log('------------------------------------------------------------');
    }

    // Test Login speed separately
    const loginStart = Date.now();
    await axios.post(`${BASE_URL}/auth/login`, {
      email: 'mark@gmail.com',
      password: 'password' // We don't care if it fails, we just want to measure the processing time until 401/200
    }).catch(() => {});
    console.log(`🔑 Login Processing Time: ${Date.now() - loginStart}ms`);

  } catch (error) {
    console.error('❌ Diagnostics failed:', error.message);
  }

  console.log('\n✨ Diagnostics Complete.');
  process.exit(0);
}

runFullDiagnostics();
