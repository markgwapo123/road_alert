const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const userAuth = require('../middleware/userAuth');

const router = express.Router();

// Configure multer for profile image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// @route   GET /api/users/me
// @desc    Get current user profile
// @access  Private
router.get('/me', userAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        profile: user.profile,
        profileImage: user.profile?.profileImage,
        profileGallery: user.profile?.profilePictureGallery || [],
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching profile'
    });
  }
});

// @route   PUT /api/users/me
// @desc    Update current user profile
// @access  Private
router.put('/me', userAuth, async (req, res) => {
  try {
    const { username, email, profile } = req.body;

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if username is already taken by another user
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username, _id: { $ne: req.user.id } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Username already taken'
        });
      }
    }

    // Check if email is already taken by another user
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: req.user.id } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Email already taken'
        });
      }
    }

    // Update fields if provided
    if (username) user.username = username;
    if (email) user.email = email;
    if (profile) {
      user.profile = {
        ...user.profile,
        ...profile
      };
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        profile: user.profile,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while updating profile'
    });
  }
});

// @route   PUT /api/users/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', userAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters long'
      });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while changing password'
    });
  }
});

// @route   POST /api/users/profile-image
// @desc    Upload user profile image
// @access  Private
router.post('/profile-image', userAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Initialize gallery if it doesn't exist
    if (!user.profile.profilePictureGallery) {
      user.profile.profilePictureGallery = [];
    }

    // If there's a current profile image, move it to gallery (mark as not current)
    if (user.profile.profileImage) {
      const existingGalleryItem = user.profile.profilePictureGallery.find(
        item => item.imageUrl === user.profile.profileImage
      );
      
      if (existingGalleryItem) {
        existingGalleryItem.isCurrent = false;
      } else {
        // Add current image to gallery if not already there
        user.profile.profilePictureGallery.push({
          imageUrl: user.profile.profileImage,
          uploadedAt: new Date(),
          isCurrent: false
        });
      }
    }

    // Update user with new profile image path
    const imageUrl = `/uploads/${req.file.filename}`;
    user.profile.profileImage = imageUrl;

    // Add new image to gallery as current
    user.profile.profilePictureGallery.push({
      imageUrl: imageUrl,
      uploadedAt: new Date(),
      isCurrent: true
    });

    await user.save();

    res.json({
      success: true,
      message: 'Profile image uploaded successfully',
      imageUrl: imageUrl
    });

  } catch (error) {
    console.error('Profile image upload error:', error);
    
    // Delete uploaded file if there was an error
    if (req.file) {
      const filePath = path.join(__dirname, '../uploads', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.status(500).json({
      success: false,
      error: 'Server error while uploading profile image'
    });
  }
});

// @route   DELETE /api/users/profile-image
// @desc    Remove user profile image
// @access  Private
router.delete('/profile-image', userAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if user has a profile image
    if (!user.profile.profileImage) {
      return res.status(400).json({
        success: false,
        error: 'No profile image to remove'
      });
    }

    // Mark current image as not current in gallery
    if (user.profile.profilePictureGallery) {
      const currentGalleryItem = user.profile.profilePictureGallery.find(
        item => item.imageUrl === user.profile.profileImage
      );
      if (currentGalleryItem) {
        currentGalleryItem.isCurrent = false;
      }
    }

    // Remove profile image from user record (but keep in gallery)
    user.profile.profileImage = null;
    await user.save();

    res.json({
      success: true,
      message: 'Profile image removed successfully'
    });

  } catch (error) {
    console.error('Remove profile image error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while removing profile image'
    });
  }
});

// @route   GET /api/users/profile-gallery
// @desc    Get user's profile picture gallery
// @access  Private
router.get('/profile-gallery', userAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('profile.profilePictureGallery');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const gallery = user.profile.profilePictureGallery || [];
    
    // Sort by upload date (newest first)
    const sortedGallery = gallery.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    res.json({
      success: true,
      data: sortedGallery
    });

  } catch (error) {
    console.error('Get profile gallery error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching gallery'
    });
  }
});

// @route   POST /api/users/profile-gallery/set-current
// @desc    Set a gallery image as current profile picture
// @access  Private
router.post('/profile-gallery/set-current', userAuth, async (req, res) => {
  try {
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: 'Image URL is required'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if image exists in gallery
    const galleryItem = user.profile.profilePictureGallery?.find(
      item => item.imageUrl === imageUrl
    );

    if (!galleryItem) {
      return res.status(404).json({
        success: false,
        error: 'Image not found in gallery'
      });
    }

    // Mark all gallery items as not current
    if (user.profile.profilePictureGallery) {
      user.profile.profilePictureGallery.forEach(item => {
        item.isCurrent = false;
      });
    }

    // Set the selected image as current
    galleryItem.isCurrent = true;
    user.profile.profileImage = imageUrl;

    await user.save();

    res.json({
      success: true,
      message: 'Profile picture updated successfully'
    });

  } catch (error) {
    console.error('Set current profile picture error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while updating profile picture'
    });
  }
});

// @route   DELETE /api/users/profile-gallery/:imageUrl
// @desc    Delete an image from gallery permanently
// @access  Private
router.delete('/profile-gallery/:imageUrl(*)', userAuth, async (req, res) => {
  try {
    const imageUrl = '/' + req.params.imageUrl;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Find and remove the image from gallery
    const galleryIndex = user.profile.profilePictureGallery?.findIndex(
      item => item.imageUrl === imageUrl
    );

    if (galleryIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Image not found in gallery'
      });
    }

    const galleryItem = user.profile.profilePictureGallery[galleryIndex];
    
    // If this is the current profile image, remove it
    if (galleryItem.isCurrent) {
      user.profile.profileImage = null;
    }

    // Remove from gallery
    user.profile.profilePictureGallery.splice(galleryIndex, 1);

    // Delete the physical file
    const imagePath = path.join(__dirname, '../uploads', path.basename(imageUrl));
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    await user.save();

    res.json({
      success: true,
      message: 'Image deleted from gallery successfully'
    });

  } catch (error) {
    console.error('Delete gallery image error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while deleting image'
    });
  }
});

module.exports = router;
