const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware with proper CSP for images
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:", "*"], // Allow images from any source
      connectSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false // Disable COEP which can block images
}));
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://road-alert-users.onrender.com',
        'https://road-alert-admin.onrender.com',
        'https://users-7tsrm8kq7-markstephens-projects.vercel.app',
        'https://road-alert-admin.vercel.app',
        'https://your-admin-app.vercel.app',
        '*' // Temporarily allow all origins for testing
      ] 
    : [
        'http://localhost:5173', 
        'http://localhost:5174', 
        'http://localhost:5175', 
        'http://localhost:3000',
        'http://192.168.1.150:5173',
        'http://192.168.1.150:5174',
        'http://192.168.1.150:5175',
        'http://192.168.1.150:3000'
      ],
  credentials: true
}));

// Rate limiting - temporarily disabled for testing
// const limiter = rateLimit({
//   windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000, // 15 minutes
//   max: parseInt(process.env.RATE_LIMIT_MAX), // limit each IP to 100 requests per windowMs
//   message: {
//     error: 'Too many requests from this IP, please try again later.'
//   }
// });
// app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploaded images with enhanced headers and logging
app.use('/uploads', (req, res, next) => {
  const fs = require('fs');
  const filePath = path.join(__dirname, 'uploads', decodeURIComponent(req.path.replace(/^\//, '')));
  console.log(`📸 Image request: ${req.path} from ${req.get('origin') || 'direct'}`);
  if (fs.existsSync(filePath)) {
    console.log(`✅ File exists: ${filePath}`);
  } else {
    console.log(`❌ File NOT found: ${filePath}`);
  }
  // Set CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
}, express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    console.log(`📷 Serving image: ${path.basename(filePath)}`);
    // Set proper content type for images
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.jpg' || ext === '.jpeg') {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (ext === '.png') {
      res.setHeader('Content-Type', 'image/png');
    } else if (ext === '.gif') {
      res.setHeader('Content-Type', 'image/gif');
    } else if (ext === '.webp') {
      res.setHeader('Content-Type', 'image/webp');
    }
    // Set caching headers
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Expires', new Date(Date.now() + 86400000).toUTCString());
  },
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/users', require('./routes/users'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// System status endpoint
app.get('/api/system/status', async (req, res) => {
  try {
    const Report = require('./models/Report');
    const Admin = require('./models/Admin');
    const User = require('./models/User');
    
    // Check database connectivity by trying to count documents
    const totalReports = await Report.countDocuments();
    const totalAdmins = await Admin.countDocuments();
    const totalUsers = await User.countDocuments();
    
    // Count active users (users who logged in within last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeUsers = await User.countDocuments({ 
      lastLogin: { $gte: oneDayAgo } 
    });
    
    res.json({
      success: true,
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: {
          status: 'connected',
          totalReports,
          totalAdmins,
          totalUsers,
          activeUsers
        },
        api: {
          status: 'online',
          version: '1.0.0'
        }
      }
    });
  } catch (error) {
    console.error('System status check error:', error);
    res.status(500).json({
      success: false,
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: {
          status: 'error',
          error: error.message
        },
        api: {
          status: 'online',
          version: '1.0.0'
        }
      }
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'File too large'
    });
  }
  
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong!' 
      : err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found'
  });
});

// Database connection
const connectDB = require('./config/database');

// Initialize database
const initializeDatabase = async () => {
  try {
    await connectDB();
    console.log('🎉 Database connected successfully!');
  } catch (error) {
    console.log('⚠️  MongoDB connection failed, but server will continue running');
    console.log('Error:', error.message);
  }
};

initializeDatabase();

app.listen(PORT, () => {
  console.log(`🚀 RoadAlert Backend Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🗄️  Database: ${process.env.MONGODB_URI}`);
});
