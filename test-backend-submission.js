const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

const API_BASE = 'http://192.168.1.150:3001';

async function testReportSubmission() {
    console.log('🧪 Testing Report Submission...\n');
    
    try {
        // Step 1: Test login
        console.log('1️⃣ Testing login...');
        const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
            email: 'test@example.com',
            password: 'password123'
        });
        
        if (loginResponse.status === 200) {
            console.log('✅ Login successful');
            const token = loginResponse.data.token;
            
            // Step 2: Test report submission
            console.log('\n2️⃣ Testing report submission...');
            
            const formData = new FormData();
            formData.append('type', 'pothole');
            formData.append('severity', 'medium');
            formData.append('description', 'Large pothole causing traffic issues on main street near the intersection');
            formData.append('location[address]', '10.1869, 122.8081');
            formData.append('location[coordinates][latitude]', '10.1869');
            formData.append('location[coordinates][longitude]', '122.8081');
            
            // Create a test image file if it doesn't exist
            const testImagePath = path.join(__dirname, 'test-image.jpg');
            if (!fs.existsSync(testImagePath)) {
                // Create a simple test file
                fs.writeFileSync(testImagePath, Buffer.from('fake-image-data', 'utf8'));
            }
            
            formData.append('images', fs.createReadStream(testImagePath));
            
            const reportResponse = await axios.post(`${API_BASE}/api/reports/user`, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    ...formData.getHeaders()
                }
            });
            
            if (reportResponse.status === 201) {
                console.log('✅ Report submission successful!');
                console.log('📊 Report Data:', {
                    id: reportResponse.data.data._id,
                    status: reportResponse.data.data.status,
                    type: reportResponse.data.data.type,
                    images: reportResponse.data.data.images?.length || 0
                });
                
                // Step 3: Test image access
                if (reportResponse.data.data.images && reportResponse.data.data.images[0]) {
                    console.log('\n3️⃣ Testing image access...');
                    const imageFilename = reportResponse.data.data.images[0].filename;
                    const imageUrl = `${API_BASE}/uploads/${imageFilename}`;
                    
                    const imageResponse = await axios.get(imageUrl);
                    if (imageResponse.status === 200) {
                        console.log('✅ Image accessible at:', imageUrl);
                    } else {
                        console.log('❌ Image not accessible');
                    }
                }
                
            } else {
                console.log('❌ Report submission failed:', reportResponse.status);
            }
            
        } else {
            console.log('❌ Login failed:', loginResponse.status);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        if (error.code === 'ECONNREFUSED') {
            console.error('💡 Backend server is not running. Please start it first.');
        }
    }
}

// Run the test
testReportSubmission();
