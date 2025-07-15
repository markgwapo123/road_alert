const express = require('express');
const cors = require('cors');
const path = require('path');

// Simple test server to verify image serving works
const app = express();
const PORT = 3002; // Use different port to avoid conflicts

// Enable CORS for all origins
app.use(cors({
  origin: '*',
  methods: ['GET', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    console.log(`📷 Serving: ${path.basename(filePath)}`);
    
    // Set CORS headers explicitly
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    
    // Set proper content types
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.jpg' || ext === '.jpeg') {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (ext === '.png') {
      res.setHeader('Content-Type', 'image/png');
    } else if (ext === '.gif') {
      res.setHeader('Content-Type', 'image/gif');
    }
    
    // Cache headers
    res.setHeader('Cache-Control', 'public, max-age=3600');
  }
}));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    port: PORT,
    message: 'Simple image test server running'
  });
});

// List available images
app.get('/list-images', (req, res) => {
  const fs = require('fs');
  const uploadsPath = path.join(__dirname, 'uploads');
  
  try {
    const files = fs.readdirSync(uploadsPath);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif'].includes(ext);
    });
    
    const imageList = imageFiles.map(file => ({
      filename: file,
      url: `http://localhost:${PORT}/uploads/${file}`,
      size: fs.statSync(path.join(uploadsPath, file)).size
    }));
    
    res.json({
      count: imageList.length,
      images: imageList
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Simple Image Test Server running on http://localhost:${PORT}`);
  console.log(`📸 Images served from: http://localhost:${PORT}/uploads/`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 List images: http://localhost:${PORT}/list-images`);
  console.log('\n🎯 Test URLs:');
  console.log(`   http://localhost:${PORT}/uploads/report-1751702494750-370496652.png`);
  console.log(`   http://localhost:${PORT}/uploads/report-1751811725209-783028297.jpg`);
  console.log(`   http://localhost:${PORT}/uploads/report-1751813583156-938423338.jpg`);
});
