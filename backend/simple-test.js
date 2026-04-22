const axios = require('axios');

const BASE_URL = 'http://localhost:3011/api';

async function test() {
  console.log('Testing Report Stats speed (Public)...');
  
  const start1 = Date.now();
  await axios.get(BASE_URL + '/reports/stats');
  console.log(`Cold Load: ${Date.now() - start1}ms`);
  
  const start2 = Date.now();
  await axios.get(BASE_URL + '/reports/stats');
  console.log(`Hot Load: ${Date.now() - start2}ms`);
}

test();
