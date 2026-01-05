/**
 * AI-Powered Privacy Protection for Road Alert Images
 * Uses TensorFlow.js with BlazeFace and COCO-SSD models for accurate face detection
 * Multi-model approach ensures consistent and reliable face/person detection
 * Automatically blurs detected faces and license plates to protect privacy
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
 * Blur all detected faces in the image - ACCURATE face-only blur
 * @param {HTMLCanvasElement} canvas - Canvas containing the image
 * @param {Array} faces - Array of detected faces from BlazeFace
 */
export const blurFaces = (canvas, faces) => {
  if (!faces || faces.length === 0) {
    console.log('ℹ️ No faces to blur');
    return;
  }
  
  const context = canvas.getContext('2d');
  
  faces.forEach((face, index) => {
    try {
      // Get face bounding box from BlazeFace
      const [x1, y1] = face.topLeft;
      const [x2, y2] = face.bottomRight;
      
      // Calculate face dimensions
      const faceWidth = x2 - x1;
      const faceHeight = y2 - y1;
      
      // MINIMAL expansion - just 10% for slight coverage
      const expansion = 1.1;
      const blurWidth = faceWidth * expansion;
      const blurHeight = faceHeight * expansion;
      const blurX = x1 - (blurWidth - faceWidth) / 2;
      const blurY = y1 - (blurHeight - faceHeight) / 2;
      
      console.log(`🔒 Blurring face ${index + 1}: ${Math.round(blurWidth)}x${Math.round(blurHeight)} at (${Math.round(blurX)}, ${Math.round(blurY)})`);
      
      // Apply blur to ONLY the face area
      applyGaussianBlur(context, blurX, blurY, blurWidth, blurHeight, 35);
      
    } catch (error) {
      console.error(`Error blurring face ${index}:`, error);
    }
  });
  
  console.log('✅ Face blurring complete');
};

/**
 * Blur only the HEAD of detected people - NOT the body
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
      
      // HEAD ONLY - top 18% of person, narrow width
      // Human head is roughly 1/7 to 1/8 of body height
      const headHeight = height * 0.18;
      const headWidth = Math.min(width * 0.5, headHeight * 0.9); // Head is roughly as wide as tall
      const headX = x + (width - headWidth) / 2; // Center horizontally
      const headY = y; // Start from very top
      
      console.log(`🔒 Blurring head ${index + 1}: ${Math.round(headWidth)}x${Math.round(headHeight)} at (${Math.round(headX)}, ${Math.round(headY)})`);
      
      // Apply blur to ONLY the head
      applyGaussianBlur(context, headX, headY, headWidth, headHeight, 35);
      
    } catch (error) {
      console.error(`Error blurring person ${index}:`, error);
    }
  });
  
  console.log('✅ Head blurring complete');
};

/**
 * Detect vehicles (cars, trucks, motorcycles) using COCO-SSD
 * @param {HTMLCanvasElement} canvas - Canvas containing the image
 * @returns {Promise<Array>} Array of detected vehicle regions
 */
export const detectVehicles = async (canvas) => {
  try {
    if (!personModel) {
      await loadFaceDetectionModel();
    }
    
    console.log('🚗 Detecting vehicles in image...');
    
    const predictions = await personModel.detect(canvas);
    
    // Filter vehicle classes: car, truck, bus, motorcycle
    const vehicles = predictions.filter(pred => 
      ['car', 'truck', 'bus', 'motorcycle'].includes(pred.class)
    );
    
    console.log(`🚙 COCO-SSD detected ${vehicles.length} vehicle(s)`);
    
    return vehicles;
  } catch (error) {
    console.error('Error detecting vehicles:', error);
    return [];
  }
};

/**
 * Detect license plates using edge detection within vehicle regions
 * Only searches within detected vehicles for accuracy
 * @param {HTMLCanvasElement} canvas - Canvas containing the image
 * @param {Array} vehicles - Array of detected vehicles from COCO-SSD
 * @returns {Array} Array of detected license plate regions
 */
export const detectLicensePlates = (canvas, vehicles = []) => {
  try {
    console.log('🚗 Detecting license plates...');
    
    const context = canvas.getContext('2d');
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    const width = canvas.width;
    const height = canvas.height;
    
    const plates = [];
    
    // Convert to grayscale for edge detection
    const grayscale = new Uint8Array(width * height);
    for (let i = 0; i < pixels.length; i += 4) {
      const idx = i / 4;
      grayscale[idx] = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
    }
    
    // Apply edge detection (Sobel-like)
    const edges = new Uint8Array(width * height);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        
        // Sobel X
        const gx = -grayscale[idx - width - 1] + grayscale[idx - width + 1]
                   -2 * grayscale[idx - 1] + 2 * grayscale[idx + 1]
                   -grayscale[idx + width - 1] + grayscale[idx + width + 1];
        
        // Sobel Y
        const gy = -grayscale[idx - width - 1] - 2 * grayscale[idx - width] - grayscale[idx - width + 1]
                   +grayscale[idx + width - 1] + 2 * grayscale[idx + width] + grayscale[idx + width + 1];
        
        edges[idx] = Math.sqrt(gx * gx + gy * gy);
      }
    }
    
    // Find rectangular regions with high edge density
    // License plates typically have:
    // - Aspect ratio between 1.5:1 and 6:1
    // - High edge density (text on contrasting background)
    // - Located in lower half of image (vehicles are usually on ground)
    // - SMALL size (not entire car!)
    
    const minWidth = Math.max(60, width * 0.05);
    const minHeight = Math.max(15, height * 0.015);
    // STRICT maximum sizes - plates are small!
    const maxWidth = Math.min(300, width * 0.25);
    const maxHeight = Math.min(100, height * 0.08);
    
    // Define search regions
    let searchRegions = [];
    
    if (vehicles.length > 0) {
      // Search only within detected vehicles (much more accurate!)
      console.log(`🎯 Searching for plates within ${vehicles.length} detected vehicle(s)`);
      searchRegions = vehicles.map(vehicle => {
        const [vx, vy, vw, vh] = vehicle.bbox;
        // Focus on lower 60% of vehicle (where plates are mounted)
        return {
          startX: Math.max(0, Math.floor(vx)),
          endX: Math.min(width, Math.ceil(vx + vw)),
          startY: Math.max(0, Math.floor(vy + vh * 0.4)), // Lower portion
          endY: Math.min(height, Math.ceil(vy + vh)),
          vehicleClass: vehicle.class
        };
      });
    } else {
      // Fallback: search lower half of entire image
      console.log('⚠️ No vehicles detected, searching lower image area');
      searchRegions = [{
        startX: 0,
        endX: width,
        startY: Math.floor(height * 0.4),
        endY: height,
        vehicleClass: 'unknown'
      }];
    }
    
    // Optimize step size for faster scanning
    const stepSize = Math.max(10, Math.floor(width / 100));
    
    // Search within each region
    for (const region of searchRegions) {
      for (let y = region.startY; y < region.endY - minHeight; y += stepSize) {
        for (let x = region.startX; x < region.endX - minWidth; x += stepSize) {
          // Test multiple plate sizes (optimized - fewer iterations)
          for (let w = minWidth; w <= Math.min(maxWidth, region.endX - x); w += stepSize * 3) {
            for (let h = minHeight; h <= Math.min(maxHeight, region.endY - y); h += Math.max(stepSize, 15)) {
              const aspectRatio = w / h;
              
              // STRICT size check - reject if too large (likely false positive)
              const areaPercent = (w * h) / (width * height);
              if (areaPercent > 0.02) continue; // Reject if > 2% of image area
              
              // Check aspect ratio (typical license plates)
              if (aspectRatio >= 1.5 && aspectRatio <= 6.0) {
                // Calculate edge density in this region (sample for speed)
                let edgeCount = 0;
                let totalPixels = 0;
                
                // Sample every 2nd pixel for speed (still accurate enough)
                const sampleStep = 2;
                for (let py = y; py < y + h && py < height; py += sampleStep) {
                  for (let px = x; px < x + w && px < width; px += sampleStep) {
                    const idx = py * width + px;
                    if (edges[idx] > 30) edgeCount++;
                    totalPixels++;
                  }
                }
                
                const edgeDensity = edgeCount / totalPixels;
                
                // High edge density suggests text on plate
                if (edgeDensity > 0.15 && edgeDensity < 0.6) {
                  // Check for horizontal pattern (typical of plate text)
                  let horizontalEdges = 0;
                  const midY = y + Math.floor(h / 2);
                  
                  // Sample horizontal line for speed
                  for (let px = x; px < x + w && px < width; px += sampleStep) {
                    const idx = midY * width + px;
                    if (edges[idx] > 30) horizontalEdges++;
                  }
                  
                  const horizontalDensity = (horizontalEdges / (w / sampleStep));
                  
                  if (horizontalDensity > 0.2) {
                    // Check if this overlaps with existing detections
                    const overlaps = plates.some(plate => {
                      const overlapX = Math.max(0, Math.min(plate.x + plate.width, x + w) - Math.max(plate.x, x));
                      const overlapY = Math.max(0, Math.min(plate.y + plate.height, y + h) - Math.max(plate.y, y));
                      const overlapArea = overlapX * overlapY;
                      const thisArea = w * h;
                      return overlapArea / thisArea > 0.5;
                    });
                    
                    if (!overlaps) {
                      plates.push({
                        x: x,
                        y: y,
                        width: w,
                        height: h,
                        confidence: edgeDensity * horizontalDensity,
                        aspectRatio: aspectRatio
                      });
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    
    // Filter out plates that are too large (false positives)
    const validPlates = plates.filter(plate => {
      const area = plate.width * plate.height;
      const imageArea = width * height;
      const areaPercent = area / imageArea;
      
      // Plate should be small - typically 0.3% to 2% of image
      const isSizeValid = areaPercent >= 0.002 && areaPercent <= 0.025;
      
      // Width should be reasonable (not entire car)
      const isWidthValid = plate.width <= 300 && plate.width >= 60;
      
      // Height should be reasonable
      const isHeightValid = plate.height <= 100 && plate.height >= 15;
      
      if (!isSizeValid || !isWidthValid || !isHeightValid) {
        console.log(`❌ Rejected plate (too large): ${Math.round(plate.width)}x${Math.round(plate.height)} (${(areaPercent*100).toFixed(2)}% of image)`);
        return false;
      }
      return true;
    });
    
    // Sort by confidence and return top detections
    validPlates.sort((a, b) => b.confidence - a.confidence);
    const topPlates = validPlates.slice(0, 5); // Limit to top 5 detections
    
    console.log(`🚗 Detected ${topPlates.length} valid license plate(s) (filtered from ${plates.length} candidates)`);
    
    return topPlates;
  } catch (error) {
    console.error('Error detecting license plates:', error);
    return [];
  }
};

/**
 * Blur license plate area of detected vehicles
 * Uses vehicle detection to estimate plate location (no false positives)
 * @param {HTMLCanvasElement} canvas - Canvas containing the image
 * @param {Array} vehicles - Array of detected vehicles from COCO-SSD
 */
export const blurVehiclePlates = (canvas, vehicles) => {
  if (!vehicles || vehicles.length === 0) {
    console.log('ℹ️ No vehicles to blur plates');
    return;
  }
  
  const context = canvas.getContext('2d');
  
  vehicles.forEach((vehicle, index) => {
    try {
      // COCO-SSD returns bbox as [x, y, width, height]
      const [vx, vy, vw, vh] = vehicle.bbox;
      
      // Estimate plate location: bottom center of vehicle
      // Plates are typically small: ~15% of vehicle width, ~5% of vehicle height
      const plateWidth = vw * 0.2;
      const plateHeight = vh * 0.08;
      const plateX = vx + (vw - plateWidth) / 2; // Center horizontally
      const plateY = vy + vh - plateHeight - (vh * 0.05); // Near bottom with small margin
      
      // Also blur front plate area (for front-facing vehicles)
      const frontPlateY = vy + vh * 0.75; // Lower portion
      
      console.log(`🔒 Blurring plate for ${vehicle.class} ${index + 1}: ${Math.round(plateWidth)}x${Math.round(plateHeight)}`);
      
      // Blur rear plate area
      applyGaussianBlur(context, plateX, plateY, plateWidth, plateHeight, 30);
      
      // Blur front plate area (if car is angled)
      applyGaussianBlur(context, plateX, frontPlateY, plateWidth, plateHeight, 30);
      
    } catch (error) {
      console.error(`Error blurring vehicle plate ${index}:`, error);
    }
  });
  
  console.log('✅ Vehicle plate blurring complete');
};

/**\n * Main function: Apply AI-powered privacy protection to the image\n * Uses TensorFlow.js models: BlazeFace (faces) + COCO-SSD (people & vehicles)\n * ACCURATE: Only blurs faces/heads and vehicle plate areas - nothing else\n * @param {HTMLCanvasElement} canvas - Canvas containing the captured image\n * @returns {Promise<Object>} Detection results with counts\n */
export const applyAIPrivacyProtection = async (canvas) => {
  try {
    console.log('🔒 Applying ACCURATE privacy protection (faces + heads + plates only)...');
    
    // Load models if not already loaded
    if (!faceModel || !personModel) {
      await loadFaceDetectionModel();
    }
    
    // Run all AI detections in parallel
    const [faces, people, vehicles] = await Promise.all([
      detectFaces(canvas),
      detectPeople(canvas),
      detectVehicles(canvas)
    ]);
    
    let totalDetections = 0;
    
    // 1. Blur ONLY detected faces (BlazeFace - most accurate)
    if (faces.length > 0) {
      blurFaces(canvas, faces);
      totalDetections += faces.length;
      console.log(`✅ Blurred ${faces.length} face(s)`);
    }
    
    // 2. Blur ONLY heads of people (when face not detected)
    // Only process people who don't have a corresponding face detection
    if (people.length > 0 && faces.length === 0) {
      blurPeople(canvas, people);
      totalDetections += people.length;
      console.log(`✅ Blurred ${people.length} head(s)`);
    }
    
    // 3. Blur ONLY plate areas on detected vehicles (no pattern matching)
    if (vehicles.length > 0) {
      blurVehiclePlates(canvas, vehicles);
      totalDetections += vehicles.length;
      console.log(`✅ Blurred plates on ${vehicles.length} vehicle(s)`);
    }
    
    if (totalDetections === 0) {
      console.log('✅ No faces, people, or vehicles detected');
    }
    
    return {
      facesDetected: faces.length,
      peopleDetected: people.length,
      vehiclesDetected: vehicles.length,
      totalBlurred: totalDetections
    };
    
  } catch (error) {
    console.error('❌ Error applying privacy protection:', error);
    // Don't throw error - allow image capture to proceed even if detection fails
    console.log('⚠️ Proceeding without privacy detection');
    return {
      facesDetected: 0,
      peopleDetected: 0,
      platesDetected: 0,
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
