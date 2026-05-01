const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testSubmit() {
  try {
    const data = new FormData();
    data.append('type', 'pothole');
    data.append('province', 'negros-occidental');
    data.append('city', 'kabankalan');
    data.append('barangay', 'tagoc');
    data.append('location[address]', 'Tagoc, Kabankalan City, Negros Occidental');
    data.append('location[coordinates][latitude]', '9.9912');
    data.append('location[coordinates][longitude]', '122.8131');
    
    // We need a dummy image
    fs.writeFileSync('dummy.jpg', 'dummy image content');
    data.append('images', fs.createReadStream('dummy.jpg'));
    
    // Create a dummy user token or use an existing one if possible
    // For now let's just test without auth to see if it hits a 401,
    // or test the public route /api/reports which has similar logic.
    
    console.log('Testing /api/reports (public route)...');
    try {
      const res1 = await axios.post('http://localhost:3001/api/reports', data, {
        headers: {
          ...data.getHeaders()
        }
      });
      console.log('Public route success:', res1.status);
    } catch (e1) {
      console.log('Public route error:', e1.response?.status, e1.response?.data || e1.message);
    }
    
  } catch (error) {
    console.error('Test script error:', error);
  } finally {
    if (fs.existsSync('dummy.jpg')) fs.unlinkSync('dummy.jpg');
  }
}

testSubmit();
