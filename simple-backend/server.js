const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const port = process.env.PORT || 3002;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('combined'));

// Simple in-memory storage
let users = [
  {
    _id: '1',
    email: 'test@example.com',
    username: 'testuser',
    password: 'hashedpassword123'
  }
];

let reports = [];
let notifications = [];

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Road Alert API is running!',
    timestamp: new Date().toISOString(),
    status: 'healthy',
    version: '1.0.0'
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Simple authentication - for testing only
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  console.log('Login attempt:', { email });
  
  // Simple mock authentication
  const user = users.find(u => u.email === email);
  if (user) {
    // In real app, verify password hash
    res.json({
      message: 'Login successful',
      token: 'mock-jwt-token-' + Date.now(),
      user: {
        id: user._id,
        email: user.email,
        username: user.username
      }
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/api/auth/register', (req, res) => {
  const { email, username, password } = req.body;
  
  // Check if user exists
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'User already exists' });
  }
  
  const newUser = {
    _id: Date.now().toString(),
    email,
    username,
    password: 'hashed-' + password // In real app, use bcrypt
  };
  
  users.push(newUser);
  
  res.json({
    message: 'Registration successful',
    token: 'mock-jwt-token-' + Date.now(),
    user: {
      id: newUser._id,
      email: newUser.email,
      username: newUser.username
    }
  });
});

// Get user profile
app.get('/api/users/me', (req, res) => {
  // Mock user data
  res.json({
    data: {
      _id: '1',
      email: 'test@example.com',
      username: 'testuser',
      profileImage: null
    }
  });
});

// Reports endpoints
app.get('/api/reports', (req, res) => {
  res.json(reports);
});

app.post('/api/reports/user', (req, res) => {
  const newReport = {
    _id: Date.now().toString(),
    ...req.body,
    createdAt: new Date().toISOString(),
    status: 'pending'
  };
  
  reports.push(newReport);
  
  res.json({
    message: 'Report submitted successfully',
    report: newReport
  });
});

// Notifications endpoints
app.get('/api/notifications', (req, res) => {
  res.json({
    notifications: notifications,
    unreadCount: notifications.filter(n => !n.read).length
  });
});

app.put('/api/notifications/:id/read', (req, res) => {
  const notification = notifications.find(n => n._id === req.params.id);
  if (notification) {
    notification.read = true;
  }
  res.json({ message: 'Notification marked as read' });
});

app.post('/api/notifications/mark-all-read', (req, res) => {
  notifications.forEach(n => n.read = true);
  res.json({ message: 'All notifications marked as read' });
});

// Add some sample notifications for testing
notifications = [
  {
    _id: '1',
    title: 'Welcome to Road Alert',
    message: 'Thank you for joining our road safety community!',
    type: 'welcome',
    read: false,
    createdAt: new Date().toISOString()
  },
  {
    _id: '2',
    title: 'New Report Verified',
    message: 'Your recent road hazard report has been verified by our team.',
    type: 'verification_status',
    read: false,
    createdAt: new Date(Date.now() - 3600000).toISOString()
  }
];

// Catch all 404
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl 
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(port, () => {
  console.log(`Road Alert API running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
});