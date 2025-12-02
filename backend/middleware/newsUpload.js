const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../uploads/news');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, 'news-' + uniqueSuffix + fileExtension);
  }
});

// File filter to allow only images and videos
const fileFilter = (req, file, cb) => {
  // Check file type
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const allowedVideoTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm'];
  const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images (JPEG, PNG, GIF, WebP) and videos (MP4, AVI, MOV, WMV, WebM) are allowed.'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: fileFilter
});

// Middleware for handling multiple files
const uploadNewsMedia = upload.array('mediaFiles', 5); // Allow up to 5 files

// Custom middleware with error handling
const handleNewsUpload = (req, res, next) => {
  uploadNewsMedia(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'File size too large. Maximum size is 50MB per file.'
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          error: 'Too many files. Maximum 5 files allowed.'
        });
      }
      return res.status(400).json({
        error: `Upload error: ${err.message}`
      });
    } else if (err) {
      return res.status(400).json({
        error: err.message
      });
    }
    next();
  });
};

// Helper function to get file type
const getFileType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const videoExts = ['.mp4', '.avi', '.mov', '.wmv', '.webm'];
  
  if (imageExts.includes(ext)) return 'image';
  if (videoExts.includes(ext)) return 'video';
  return 'unknown';
};

module.exports = {
  handleNewsUpload,
  getFileType,
  uploadDir
};