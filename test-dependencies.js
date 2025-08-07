const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

console.log('🔧 Testing Backend Dependencies...');

// Test Express
try {
    const app = express();
    console.log('✅ Express - OK');
} catch (error) {
    console.log('❌ Express - Error:', error.message);
}

// Test Multer
try {
    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, './uploads')
        },
        filename: function (req, file, cb) {
            cb(null, 'test-' + Date.now() + path.extname(file.originalname))
        }
    });
    console.log('✅ Multer - OK');
} catch (error) {
    console.log('❌ Multer - Error:', error.message);
}

// Test CORS
try {
    const corsOptions = {
        origin: true,
        credentials: true
    };
    console.log('✅ CORS - OK');
} catch (error) {
    console.log('❌ CORS - Error:', error.message);
}

// Check uploads directory
const uploadsDir = path.join(__dirname, 'backend', 'uploads');
if (fs.existsSync(uploadsDir)) {
    console.log('✅ Uploads directory exists:', uploadsDir);
    const files = fs.readdirSync(uploadsDir);
    console.log('📁 Files in uploads:', files.length);
} else {
    console.log('⚠️ Uploads directory does not exist:', uploadsDir);
    try {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('✅ Created uploads directory');
    } catch (error) {
        console.log('❌ Could not create uploads directory:', error.message);
    }
}

// Test JSON file operations
try {
    const testData = { test: 'data', timestamp: Date.now() };
    const testFile = path.join(__dirname, 'backend', 'data', 'test.json');
    
    // Ensure data directory exists
    const dataDir = path.dirname(testFile);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(testFile, JSON.stringify(testData, null, 2));
    const readData = JSON.parse(fs.readFileSync(testFile, 'utf8'));
    
    if (readData.test === 'data') {
        console.log('✅ File operations - OK');
        fs.unlinkSync(testFile); // Clean up
    } else {
        console.log('❌ File operations - Data mismatch');
    }
} catch (error) {
    console.log('❌ File operations - Error:', error.message);
}

// Test if backend server is running
console.log('\n� Testing backend server connection...');
const http = require('http');

const checkServer = () => {
    return new Promise((resolve) => {
        const req = http.request({
            hostname: '192.168.1.150',
            port: 3001,
            path: '/',
            method: 'GET',
            timeout: 5000
        }, (res) => {
            console.log('✅ Backend server is responding on port 3001');
            resolve(true);
        });
        
        req.on('error', (error) => {
            console.log('❌ Backend server not responding:', error.message);
            console.log('💡 Please start the backend server first');
            resolve(false);
        });
        
        req.on('timeout', () => {
            console.log('❌ Backend server timeout');
            resolve(false);
        });
        
        req.end();
    });
};

checkServer().then(() => {
    console.log('\n�🔧 Dependency test complete');
});
