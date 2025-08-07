const axios = require('axios');

// Test the my-reports endpoint
async function testMyReportsEndpoint() {
    try {
        console.log('Testing backend server connectivity...');
        
        // Test if server is running
        const healthCheck = await axios.get('http://192.168.1.150:3001/');
        console.log('✅ Backend server is running');
        
        // You'll need to replace this with an actual token from a logged-in user
        const testToken = 'your-test-token-here';
        
        const response = await axios.get('http://192.168.1.150:3001/api/reports/my-reports', {
            headers: {
                'Authorization': `Bearer ${testToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ My Reports endpoint response:', response.data);
        
    } catch (error) {
        console.error('❌ Error testing endpoint:');
        console.error('Status:', error.response?.status);
        console.error('Data:', error.response?.data);
        console.error('Message:', error.message);
    }
}

testMyReportsEndpoint();
