/**
 * AI-Powered Privacy Protection for Road Alert Images
 * Uses TensorFlow.js with BlazeFace and COCO-SSD models for accurate face detection
 * Multi-model approach ensures consistent and reliable face/person detection
 * Automatically blurs detected faces to protect user privacy
 */

import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

let faceModel = null;
let personModel = null;

/**
 * Load both AI models for comprehensive detection
 * @returns {Promise<void>}
 */
export const loadFaceDetectionModel = async () => {
  if (faceModel && personModel) return { faceModel, personModel };
  
  try {
    console.log('🤖 Loading AI models for face and person detection...');
    
    // Load both models in parallel for faster startup
    const [loadedFaceModel, loadedPersonModel] = await Promise.all([
      blazeface.load(),
      cocoSsd.load()
    ]);
    
    faceModel = loadedFaceModel;
    personModel = loadedPersonModel;
    
    console.log('✅ All AI models loaded successfully');
    return { faceModel, personModel };
  } catch (error) {
    console.error('❌ Failed to load detection models:', error);
    throw error;
  }
};

/**
 * Apply Gaussian blur to a specific region of the canvas
 * Enhanced with stronger blur and edge blending
 * @param {CanvasRenderingContext2D} context - Canvas context
 * @param {number} x - X coordinate of the region
 * @param {number} y - Y coordinate of the region
 * @param {number} width - Width of the region
 * @param {number} height - Height of the region
 * @param {number} blurRadius - Blur intensity (default: 40)
 */
const applyGaussianBlur = (context, x, y, width, height, blurRadius = 40) => {
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
    // More passes = stronger blur = better privacy
    const passes = 5; // Increased from 3 to 5 for stronger blur
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
    if (!faceModel) {
      await loadFaceDetectionModel();
    }
    
    console.log('🔍 Detecting faces in image...');
    
    // Convert canvas to tensor for the model
    const image = tf.browser.fromPixels(canvas);
    
    // Run face detection with returnTensors=false for better performance
    const predictions = await faceModel.estimateFaces(image, false);
    
    // Clean up tensor to prevent memory leak
    image.dispose();
    
    console.log(`👤 BlazeFace detected ${predictions.length} face(s)`);
    
    return predictions;
  } catch (error) {
    console.error('Error detecting faces:', error);
    return [];
  }
};

/**
 * Detect people in the image using COCO-SSD model
 * This catches full bodies that might be missed by face detection
 * @param {HTMLCanvasElement} canvas - Canvas containing the image
 * @returns {Promise<Array>} Array of detected person regions
 */
export const detectPeople = async (canvas) => {
  try {
    // Ensure model is loaded
    if (!personModel) {
      await loadFaceDetectionModel();
    }
    
    console.log('🔍 Detecting people in image...');
    
    // Run object detection
    const predictions = await personModel.detect(canvas);
    
    // Filter only person detections
    const people = predictions.filter(pred => pred.class === 'person');
    
    console.log(`👥 COCO-SSD detected ${people.length} person(s)`);
    
    return people;
  } catch (error) {
    console.error('Error detecting people:', error);
    return [];
  }
};

/**
 * Blur all detected faces in the image
 * @param {HTMLCanvasElement} canvas - Canvas containing the image
 * @param {Array} faces - Array of detected faces from BlazeFace
 * @param {number} expansionFactor - How much to expand the blur region (default: 2.0)
 */
export const blurFaces = (canvas, faces, expansionFactor = 2.0) => {
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
      
      // Expand the region significantly to include full head (hair, neck, ears)
      // Increased expansion for better coverage
      const expandedWidth = faceWidth * expansionFactor;
      const expandedHeight = faceHeight * expansionFactor * 1.4; // Even taller for head coverage
      
      // Calculate expanded coordinates (centered on face)
      const expandedX = x1 - (expandedWidth - faceWidth) / 2;
      const expandedY = y1 - (expandedHeight - faceHeight) / 2.2; // More space above for hair
      
      console.log(`🔒 Blurring face ${index + 1}:`, {
        original: { x: Math.round(x1), y: Math.round(y1), width: Math.round(faceWidth), height: Math.round(faceHeight) },
        expanded: { x: Math.round(expandedX), y: Math.round(expandedY), width: Math.round(expandedWidth), height: Math.round(expandedHeight) }
      });
      
      // Apply strong blur to the expanded region
      applyGaussianBlur(context, expandedX, expandedY, expandedWidth, expandedHeight, 45);
      
    } catch (error) {
      console.error(`Error blurring face ${index}:`, error);
    }
  });
  
  console.log('✅ Face blurring complete');
};

/**
 * Blur detected people (focuses on upper body/head area)
 * @param {HTMLCanvasElement} canvas - Canvas containing the image
 * @param {Array} people - Array of detected people from COCO-SSD
 */
export const blurPeople = (canvas, people) => {
  if (!people || people.length === 0) {
    console.log('ℹ️ No people to blur');
    return;
  }
  
  const context = canvas.getContext('2d');
  
  people.forEach((person, index) => {
    try {
      // COCO-SSD returns bbox as [x, y, width, height]
      const [x, y, width, height] = person.bbox;
      
      // Focus on upper 40% of person detection (where head/face typically is)
      const headHeight = height * 0.4;
      const headWidth = width * 0.8; // Slightly narrower for head
      const headX = x + (width - headWidth) / 2; // Center horizontally
      const headY = y; // Start from top
      
      console.log(`🔒 Blurring person ${index + 1} (confidence: ${(person.score * 100).toFixed(1)}%):`, {
        fullBody: { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) },
        headArea: { x: Math.round(headX), y: Math.round(headY), width: Math.round(headWidth), height: Math.round(headHeight) }
      });
      
      // Apply strong blur to head area
      applyGaussianBlur(context, headX, headY, headWidth, headHeight, 45);
      
    } catch (error) {
      console.error(`Error blurring person ${index}:`, error);
    }
  });
  
  console.log('✅ People blurring complete');
};

/**
 * Main function: Apply AI-powered privacy protection to the image
 * Uses multi-model approach: BlazeFace for faces + COCO-SSD for people
 * Ensures maximum detection accuracy and consistency
 * @param {HTMLCanvasElement} canvas - Canvas containing the captured image
 * @returns {Promise<Object>} Detection results with counts
 */
export const applyAIPrivacyProtection = async (canvas) => {
  try {
    console.log('🔒 Applying AI-powered privacy protection (multi-model)...');
    
    // Load models if not already loaded
    if (!faceModel || !personModel) {
      await loadFaceDetectionModel();
    }
    
    // Run both detections in parallel for speed
    const [faces, people] = await Promise.all([
      detectFaces(canvas),
      detectPeople(canvas)
    ]);
    
    let totalDetections = 0;
    
    // Blur detected faces first (most precise)
    if (faces.length > 0) {
      blurFaces(canvas, faces, 2.0); // Larger expansion factor for better coverage
      totalDetections += faces.length;
    }
    
    // Blur detected people as backup (catches missed faces)
    // Only blur people if no faces were detected OR if people detected > faces
    // This handles cases where face detection fails but person detection succeeds
    if (people.length > 0 && (faces.length === 0 || people.length > faces.length)) {
      console.log(`ℹ️ Using person detection as backup (${people.length} people detected)`);
      blurPeople(canvas, people);
      // Count people only if they're additional to faces
      totalDetections = Math.max(totalDetections, people.length);
    }
    
    if (totalDetections === 0) {
      console.log('✅ No faces or people detected - image is privacy-safe');
    } else {
      console.log(`✅ Privacy protection applied - ${totalDetections} detection(s) blurred`);
    }
    
    return {
      facesDetected: faces.length,
      peopleDetected: people.length,
      totalBlurred: totalDetections
    };
    
  } catch (error) {
    console.error('❌ Error applying privacy protection:', error);
    // Don't throw error - allow image capture to proceed even if face detection fails
    console.log('⚠️ Proceeding without face detection');
    return {
      facesDetected: 0,
      peopleDetected: 0,
      totalBlurred: 0,
      error: error.message
    };
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
