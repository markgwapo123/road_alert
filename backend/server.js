const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Add global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware with proper CSP for images and CORS
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
  crossOriginEmbedderPolicy: false, // Disable COEP which can block images
  crossOriginResourcePolicy: { policy: "cross-origin" } // Allow cross-origin resource requests
}));
app.use(cors({
  origin: [
    'http://localhost:5173', 
    'http://localhost:5174', 
    'http://localhost:5175', 
    'http://localhost:5176', 
    'http://localhost:3000',
    // Production URLs
    'https://road-alert-git-main-markstephens-projects.vercel.app',
    'https://*.vercel.app',
    'https://road-alert-users.vercel.app',
    'https://users-ten-woad.vercel.app',
    /\.vercel\.app$/ // Allow all vercel.app subdomains
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
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

// Root route
app.get('/', (req, res) => {
  res.json({
    message: '🚀 BantayDalan Backend API',
    status: 'Running',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      reports: '/api/reports',
      admin: '/api/admin',
      users: '/api/users',
      notifications: '/api/notifications',
      health: '/api/health',
      status: '/api/system/status'
    }
  });
});

// Debug endpoint for uploads directory
app.get('/api/debug/uploads', (req, res) => {
  const fs = require('fs');
  const uploadsPath = path.join(__dirname, 'uploads');
  
  try {
    // Check if uploads directory exists
    if (!fs.existsSync(uploadsPath)) {
      return res.json({
        success: false,
        message: 'Uploads directory does not exist',
        path: uploadsPath,
        exists: false
      });
    }
    
    // List files in uploads directory
    const files = fs.readdirSync(uploadsPath);
    const fileDetails = files.map(file => {
      const filePath = path.join(uploadsPath, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        size: stats.size,
        modified: stats.mtime,
        url: `/uploads/${file}`
      };
    });
    
    res.json({
      success: true,
      path: uploadsPath,
      exists: true,
      fileCount: files.length,
      files: fileDetails.slice(0, 20), // Limit to first 20 files
      totalFiles: files.length
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      path: uploadsPath
    });
  }
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/users', require('./routes/users'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/news', require('./routes/news'));
app.use('/api/settings', require('./routes/settings'));

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
const SystemSettings = require('./models/SystemSettings');
const { clearSettingsCache } = require('./middleware/settingsEnforcement');

// Initialize database and settings
const initializeDatabase = async () => {
  try {
    await connectDB();
    console.log('🎉 Database connected successfully!');
    
    // Initialize system settings
    try {
      await SystemSettings.initializeDefaults();
      console.log('⚙️ System settings initialized');
    } catch (settingsError) {
      console.log('⚠️ Settings initialization warning:', settingsError.message);
    }
    
    // Start scheduled tasks
    startScheduledTasks();
    
  } catch (error) {
    console.log('⚠️  MongoDB connection failed, but server will continue running');
    console.log('Error:', error.message);
  }
};

// Scheduled tasks for settings enforcement
const startScheduledTasks = () => {
  // Clear settings cache every 5 minutes to pick up changes
  setInterval(() => {
    clearSettingsCache();
  }, 5 * 60 * 1000); // Every 5 minutes
  
  console.log('⏰ Scheduled tasks started');
};

initializeDatabase();

// Start server with error handling
try {
  const server = app.listen(PORT, () => {
    console.log(`🚀 BantayDalan Backend Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV}`);
    console.log(`🗄️  Database: ${process.env.MONGODB_URI}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use. Kill the process or use a different port.`);
      process.exit(1);
    } else {
      console.error('❌ Server error:', err);
      throw err;
    }
  });
} catch (error) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}
