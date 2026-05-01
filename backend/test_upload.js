const express = require('express');
const multer = require('multer');
const { reportStorage } = require('./services/cloudinaryConfig');
const app = express();

const upload = multer({ 
  storage: reportStorage,
  limits: { fileSize: 10 * 1024 * 1024 } 
});

app.post('/test', upload.array('images', 5), (req, res) => {
  res.json({ success: true, files: req.files });
});

app.use((err, req, res, next) => {
  console.error('Express Error Handler caught:', err);
  res.status(500).json({ error: err.message });
});

app.listen(3012, () => console.log('Test server running on 3012'));
