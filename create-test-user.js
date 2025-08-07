const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Create test user data
async function createTestUser() {
    console.log('Creating test user...');
    
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const testUser = {
        id: uuidv4(),
        username: 'testuser',
        email: 'test@example.com',
        password: hashedPassword,
        createdAt: new Date().toISOString(),
        isVerified: true,
        profile: {
            firstName: 'Test',
            lastName: 'User',
            phone: '+1234567890'
        }
    };
    
    // Ensure data directory exists
    const dataDir = path.join(__dirname, 'backend', 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Read existing users or create new array
    const usersFile = path.join(dataDir, 'users.json');
    let users = [];
    
    if (fs.existsSync(usersFile)) {
        try {
            const data = fs.readFileSync(usersFile, 'utf8');
            users = JSON.parse(data);
        } catch (error) {
            console.log('Creating new users file...');
            users = [];
        }
    }
    
    // Check if test user already exists
    const existingUser = users.find(u => u.email === 'test@example.com');
    if (existingUser) {
        console.log('✅ Test user already exists');
        return;
    }
    
    // Add test user
    users.push(testUser);
    
    // Save updated users
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
    
    console.log('✅ Test user created successfully');
    console.log('📧 Email: test@example.com');
    console.log('🔑 Password: password123');
}

createTestUser().catch(console.error);
