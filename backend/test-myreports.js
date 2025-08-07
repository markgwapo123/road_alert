const axios = require('axios');

async function testMyReports() {
    try {
        // First, login to get a token
        console.log('🔑 Logging in...');
        const loginResponse = await axios.post('http://192.168.1.150:3001/api/auth/login', {
            email: 'test@example.com',
            password: 'password123'
        });
        
        if (!loginResponse.data.success || !loginResponse.data.token) {
            console.error('❌ Login failed:', loginResponse.data);
            return;
        }
        
        const token = loginResponse.data.token;
        console.log('✅ Login successful');
        console.log('👤 User:', loginResponse.data.user.username);
        console.log('🆔 User ID:', loginResponse.data.user.id);
        
        // Now test the my-reports endpoint
        console.log('\n📋 Fetching my reports...');
        const reportsResponse = await axios.get('http://192.168.1.150:3001/api/reports/my-reports', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ My reports response:');
        console.log('Status:', reportsResponse.status);
        console.log('Success:', reportsResponse.data.success);
        console.log('Reports count:', reportsResponse.data.reports ? reportsResponse.data.reports.length : 0);
        
        if (reportsResponse.data.reports && reportsResponse.data.reports.length > 0) {
            console.log('\n📋 Your reports:');
            reportsResponse.data.reports.forEach((report, index) => {
                console.log(`${index + 1}. ${report.type} - ${report.status} (${new Date(report.createdAt).toLocaleDateString()})`);
                console.log(`   Description: ${report.description}`);
                console.log(`   Location: ${report.location.address || 'Unknown'}`);
            });
        } else {
            console.log('📭 No reports found for your account');
        }
        
    } catch (error) {
        console.error('❌ Error testing my reports:');
        console.error('Status:', error.response?.status);
        console.error('Error:', error.response?.data?.error || error.message);
        console.error('Details:', error.response?.data);
    }
}

testMyReports();
