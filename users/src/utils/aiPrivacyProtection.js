/**
 * AI-Powered Privacy Protection for Road Alert Images
 * Uses TensorFlow.js with BlazeFace model for accurate face detection
 * Automatically blurs detected faces to protect user privacy
 */

import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';

let model = null;

/**
 * Load the BlazeFace model
 * @returns {Promise<void>}
 */
export const loadFaceDetectionModel = async () => {
  if (model) return model;
  
  try {
    console.log('🤖 Loading BlazeFace AI model for face detection...');
    // Load the BlazeFace model
    model = await blazeface.load();
    console.log('✅ BlazeFace model loaded successfully');
    return model;
  } catch (error) {
    console.error('❌ Failed to load face detection model:', error);
    throw error;
  }
};

/**
 * Apply Gaussian blur to a specific region of the canvas
 * @param {CanvasRenderingContext2D} context - Canvas context
 * @param {number} x - X coordinate of the region
 * @param {number} y - Y coordinate of the region
 * @param {number} width - Width of the region
 * @param {number} height - Height of the region
 * @param {number} blurRadius - Blur intensity (default: 30)
 */
const applyGaussianBlur = (context, x, y, width, height, blurRadius = 30) => {
  try {
    // Ensure coordinates are within canvas bounds
    const canvas = context.canvas;
    x = Math.max(0, Math.floor(x));
    y = Math.max(0, Math.floor(y));
    width = Math.min(canvas.width - x, Math.ceil(width));
    height = Math.min(canvas.height - y, Math.ceil(height));
    
    if (width <= 0 || height <= 0) return;
    
    // Get the image data for the region
    const imageData = context.getImageData(x, y, width, height);
    const pixels = imageData.data;
    
    // Apply a box blur approximation (faster than true Gaussian)
    // Multiple passes create a Gaussian-like effect
    const passes = 3;
    const radius = Math.min(blurRadius, Math.min(width, height) / 4);
    
    for (let pass = 0; pass < passes; pass++) {
      // Horizontal pass
      for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
          const pixelIndex = (row * width + col) * 4;
          
          let r = 0, g = 0, b = 0, count = 0;
          
          // Average pixels in horizontal direction
          for (let i = -radius; i <= radius; i++) {
            const sampleCol = col + i;
            if (sampleCol >= 0 && sampleCol < width) {
              const sampleIndex = (row * width + sampleCol) * 4;
              r += pixels[sampleIndex];
              g += pixels[sampleIndex + 1];
              b += pixels[sampleIndex + 2];
              count++;
            }
          }
          
          if (count > 0) {
            pixels[pixelIndex] = r / count;
            pixels[pixelIndex + 1] = g / count;
            pixels[pixelIndex + 2] = b / count;
          }
        }
      }
      
      // Vertical pass
      for (let col = 0; col < width; col++) {
        for (let row = 0; row < height; row++) {
          const pixelIndex = (row * width + col) * 4;
          
          let r = 0, g = 0, b = 0, count = 0;
          
          // Average pixels in vertical direction
          for (let i = -radius; i <= radius; i++) {
            const sampleRow = row + i;
            if (sampleRow >= 0 && sampleRow < height) {
              const sampleIndex = (sampleRow * width + col) * 4;
              r += pixels[sampleIndex];
              g += pixels[sampleIndex + 1];
              b += pixels[sampleIndex + 2];
              count++;
            }
          }
          
          if (count > 0) {
            pixels[pixelIndex] = r / count;
            pixels[pixelIndex + 1] = g / count;
            pixels[pixelIndex + 2] = b / count;
          }
        }
      }
    }
    
    // Put the blurred image data back
    context.putImageData(imageData, x, y);
  } catch (error) {
    console.error('Error applying blur:', error);
  }
};

/**
 * Detect faces in the image using BlazeFace AI model
 * @param {HTMLCanvasElement} canvas - Canvas containing the image
 * @returns {Promise<Array>} Array of detected face regions
 */
export const detectFaces = async (canvas) => {
  try {
    // Ensure model is loaded
    if (!model) {
      await loadFaceDetectionModel();
    }
    
    console.log('🔍 Detecting faces in image...');
    
    // Convert canvas to tensor for the model
    const image = tf.browser.fromPixels(canvas);
    
    // Run face detection
    const predictions = await model.estimateFaces(image, false);
    
    // Clean up tensor to prevent memory leak
    image.dispose();
    
    console.log(`👤 Detected ${predictions.length} face(s)`);
    
    return predictions;
  } catch (error) {
    console.error('Error detecting faces:', error);
    return [];
  }
};

/**
 * Blur all detected faces in the image
 * @param {HTMLCanvasElement} canvas - Canvas containing the image
 * @param {Array} faces - Array of detected faces from BlazeFace
 * @param {number} expansionFactor - How much to expand the blur region (default: 1.5)
 */
export const blurFaces = (canvas, faces, expansionFactor = 1.5) => {
  if (!faces || faces.length === 0) {
    console.log('ℹ️ No faces to blur');
    return;
  }
  
  const context = canvas.getContext('2d');
  
  faces.forEach((face, index) => {
    try {
      // Get face bounding box
      // BlazeFace returns topLeft and bottomRight coordinates
      const [x1, y1] = face.topLeft;
      const [x2, y2] = face.bottomRight;
      
      // Calculate face dimensions
      const faceWidth = x2 - x1;
      const faceHeight = y2 - y1;
      
      // Expand the region to include full head (hair, neck, ears)
      const expandedWidth = faceWidth * expansionFactor;
      const expandedHeight = faceHeight * expansionFactor * 1.3; // Taller for head
      
      // Calculate expanded coordinates (centered on face)
      const expandedX = x1 - (expandedWidth - faceWidth) / 2;
      const expandedY = y1 - (expandedHeight - faceHeight) / 2.5; // More space above for hair
      
      console.log(`🔒 Blurring face ${index + 1}:`, {
        original: { x: x1, y: y1, width: faceWidth, height: faceHeight },
        expanded: { x: expandedX, y: expandedY, width: expandedWidth, height: expandedHeight }
      });
      
      // Apply blur to the expanded region
      applyGaussianBlur(context, expandedX, expandedY, expandedWidth, expandedHeight, 35);
      
    } catch (error) {
      console.error(`Error blurring face ${index}:`, error);
    }
  });
  
  console.log('✅ Face blurring complete');
};

/**
 * Main function: Apply AI-powered privacy protection to the image
 * Detects and blurs all faces in the image
 * @param {HTMLCanvasElement} canvas - Canvas containing the captured image
 * @returns {Promise<number>} Number of faces blurred
 */
export const applyAIPrivacyProtection = async (canvas) => {
  try {
    console.log('🔒 Applying AI-powered privacy protection...');
    
    // Load model if not already loaded
    if (!model) {
      await loadFaceDetectionModel();
    }
    
    // Detect faces
    const faces = await detectFaces(canvas);
    
    if (faces.length === 0) {
      console.log('✅ No faces detected - image is privacy-safe');
      return 0;
    }
    
    // Blur detected faces
    blurFaces(canvas, faces, 1.5);
    
    console.log(`✅ Privacy protection applied - ${faces.length} face(s) blurred`);
    return faces.length;
    
  } catch (error) {
    console.error('❌ Error applying privacy protection:', error);
    // Don't throw error - allow image capture to proceed even if face detection fails
    console.log('⚠️ Proceeding without face detection');
    return 0;
  }
};

/**
 * Preload the face detection model on app startup
 * This improves performance when capturing images
 */
export const preloadModel = async () => {
  try {
    console.log('🚀 Preloading face detection model...');
    await loadFaceDetectionModel();
    console.log('✅ Face detection model ready');
  } catch (error) {
    console.error('⚠️ Failed to preload model:', error);
    // Non-critical error - model will be loaded on first use
  }
};

// Export for backward compatibility with existing code
export const applyPrivacyProtection = applyAIPrivacyProtection;
