const cloudinary = require('cloudinary').v2;
const cloudinaryRoot = require('cloudinary');
const CloudinaryStorage = require('multer-storage-cloudinary').CloudinaryStorage || require('multer-storage-cloudinary');
const dotenv = require('dotenv');

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const reportStorage = new CloudinaryStorage({
  cloudinary: cloudinaryRoot,
  params: {
    folder: 'road_alert/reports',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    transformation: [{ width: 1000, crop: 'limit', quality: 'auto' }]
  }
});

const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinaryRoot,
  params: {
    folder: 'road_alert/profiles',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    transformation: [{ width: 500, height: 500, crop: 'fill', gravity: 'face', quality: 'auto' }]
  }
});

module.exports = {
  cloudinary,
  reportStorage,
  profileStorage
};
