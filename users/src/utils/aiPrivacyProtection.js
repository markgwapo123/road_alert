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
 * ACCURATE LICENSE PLATE DETECTION
 * Specifically designed for Philippine license plates (GREEN background)
 * Also supports white, yellow, and blue plates
 * Uses strict validation to avoid false positives
 * @param {HTMLCanvasElement} canvas - Canvas containing the image
 * @returns {Array} Array of detected plate regions
 */
const detectLicensePlates = (canvas) => {
  try {
    const context = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const imageData = context.getImageData(0, 0, width, height);
    const pixels = imageData.data;
    
    console.log(`🔍 Scanning ${width}x${height} image for license plates (including GREEN Philippine plates)...`);
    
    const candidates = [];
    
    // License plate size constraints (be strict to avoid false positives)
    // Plates are typically 10-25% of image width
    const minPlateW = Math.max(50, width * 0.08);
    const maxPlateW = Math.min(280, width * 0.30);
    const minPlateH = Math.max(15, height * 0.025);
    const maxPlateH = Math.min(80, height * 0.12);
    
    // Search in lower 65% of image (plates are on vehicles, not in sky)
    const searchStartY = Math.floor(height * 0.35);
    const searchEndY = Math.floor(height * 0.95);
    
    // Step sizes - larger steps to reduce false positives
    const stepX = Math.max(8, Math.floor(width / 80));
    const stepY = Math.max(6, Math.floor(height / 60));
    
    // Test specific plate sizes
    const testWidths = [minPlateW, minPlateW * 1.5, minPlateW * 2, minPlateW * 2.5];
    
    for (const testW of testWidths) {
      if (testW > maxPlateW) continue;
      
      // Plate aspect ratio is typically 3:1 to 4:1
      const testH = testW / 3.5;
      if (testH < minPlateH || testH > maxPlateH) continue;
      
      for (let y = searchStartY; y < searchEndY - testH; y += stepY) {
        for (let x = 0; x < width - testW; x += stepX) {
          // Count color categories
          let greenPixels = 0;   // Philippine plates
          let whitePixels = 0;   // Standard plates
          let yellowPixels = 0;  // Taxi/commercial plates
          let bluePixels = 0;    // EU style plates
          let darkPixels = 0;    // Text/numbers
          let sampleCount = 0;
          
          // Sample the region (every 4th pixel for speed)
          for (let py = y; py < y + testH && py < height; py += 4) {
            for (let px = x; px < x + testW && px < width; px += 4) {
              const idx = (py * width + px) * 4;
              const r = pixels[idx];
              const g = pixels[idx + 1];
              const b = pixels[idx + 2];
              const brightness = (r + g + b) / 3;
              
              // GREEN plate (Philippine style) - g is dominant
              if (g > 100 && g > r * 1.2 && g > b * 1.1 && brightness > 60 && brightness < 200) {
                greenPixels++;
              }
              // WHITE/SILVER plate
              else if (brightness > 190 && Math.abs(r - g) < 25 && Math.abs(g - b) < 25) {
                whitePixels++;
              }
              // YELLOW plate
              else if (r > 170 && g > 140 && b < 100 && r > b * 1.5) {
                yellowPixels++;
              }
              // BLUE plate
              else if (b > 140 && b > r * 1.2 && b > g) {
                bluePixels++;
              }
              // DARK pixels (potential text)
              else if (brightness < 60) {
                darkPixels++;
              }
              
              sampleCount++;
            }
          }
          
          if (sampleCount < 20) continue;
          
          const greenRatio = greenPixels / sampleCount;
          const whiteRatio = whitePixels / sampleCount;
          const yellowRatio = yellowPixels / sampleCount;
          const blueRatio = bluePixels / sampleCount;
          const darkRatio = darkPixels / sampleCount;
          
          // Determine if this is likely a plate
          // Must have ONE dominant plate color (not mixed)
          let plateType = null;
          let plateColorRatio = 0;
          
          if (greenRatio > 0.25 && greenRatio > whiteRatio && greenRatio > yellowRatio) {
            plateType = 'green';
            plateColorRatio = greenRatio;
          } else if (whiteRatio > 0.35 && whiteRatio > greenRatio && whiteRatio > yellowRatio) {
            plateType = 'white';
            plateColorRatio = whiteRatio;
          } else if (yellowRatio > 0.30 && yellowRatio > greenRatio && yellowRatio > whiteRatio) {
            plateType = 'yellow';
            plateColorRatio = yellowRatio;
          } else if (blueRatio > 0.25) {
            plateType = 'blue';
            plateColorRatio = blueRatio;
          }
          
          if (!plateType) continue;
          
          // STRICT validation:
          // 1. Must have some dark pixels (text) - between 8% and 45%
          // 2. Plate color must be dominant
          // 3. Total colored area must make sense
          const hasValidText = darkRatio > 0.08 && darkRatio < 0.45;
          const hasValidColor = plateColorRatio > 0.20 && plateColorRatio < 0.85;
          
          if (!hasValidText || !hasValidColor) continue;
          
          // Calculate confidence
          const confidence = plateColorRatio * 0.4 + (darkRatio > 0.15 ? 0.3 : 0.15) + 0.2;
          
          // Check overlap with existing candidates
          const overlaps = candidates.some(c => {
            const ox = Math.max(0, Math.min(c.x + c.width, x + testW) - Math.max(c.x, x));
            const oy = Math.max(0, Math.min(c.y + c.height, y + testH) - Math.max(c.y, y));
            return ox > testW * 0.4 && oy > testH * 0.4;
          });
          
          if (!overlaps) {
            candidates.push({
              x, y,
              width: testW,
              height: testH,
              confidence,
              plateType,
              plateColorRatio,
              darkRatio
            });
          }
        }
      }
    }
    
    // Sort by confidence
    candidates.sort((a, b) => b.confidence - a.confidence);
    
    // Return only the BEST 2 candidates (most likely actual plates)
    const plates = candidates.slice(0, 2);
    
    if (plates.length > 0) {
      console.log(`📋 Found ${plates.length} license plate(s):`);
      plates.forEach((p, i) => {
        console.log(`  Plate ${i + 1}: ${p.plateType.toUpperCase()} plate, ${Math.round(p.width)}x${Math.round(p.height)} at (${Math.round(p.x)}, ${Math.round(p.y)})`);
      });
    } else {
      console.log('📋 No license plates detected');
    }
    
    return plates;
  } catch (error) {
    console.error('Error detecting license plates:', error);
    return [];
  }
};

/**
 * Blur detected plate regions with proper Gaussian blur
 */
const blurDetectedPlates = (canvas, plates) => {
  if (!plates || plates.length === 0) return;
  
  const context = canvas.getContext('2d');
  
  plates.forEach((plate, index) => {
    // Add padding around the detected plate
    const padX = plate.width * 0.15;
    const padY = plate.height * 0.2;
    
    const blurX = Math.max(0, plate.x - padX);
    const blurY = Math.max(0, plate.y - padY);
    const blurW = plate.width + padX * 2;
    const blurH = plate.height + padY * 2;
    
    console.log(`🔒 Blurring ${plate.plateType || 'unknown'} plate ${index + 1}: ${Math.round(blurW)}x${Math.round(blurH)} at (${Math.round(blurX)}, ${Math.round(blurY)})`);
    applyGaussianBlur(context, blurX, blurY, blurW, blurH, 45);
  });
  
  console.log(`✅ Blurred ${plates.length} license plate(s)`);
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
    
    // Detect with lower threshold to catch more vehicles
    const predictions = await personModel.detect(canvas, 20, 0.3); // maxDetections=20, minScore=0.3
    
    // Log ALL detections for debugging
    console.log('📊 All COCO-SSD detections:', predictions.map(p => `${p.class}(${(p.score*100).toFixed(0)}%)`).join(', '));
    
    // Filter vehicle classes: car, truck, bus, motorcycle, bicycle
    const vehicles = predictions.filter(pred => 
      ['car', 'truck', 'bus', 'motorcycle', 'bicycle'].includes(pred.class) && pred.score > 0.25
    );
    
    console.log(`🚙 COCO-SSD detected ${vehicles.length} vehicle(s):`, vehicles.map(v => `${v.class}(${(v.score*100).toFixed(0)}%)`).join(', '));
    
    return vehicles;
  } catch (error) {
    console.error('Error detecting vehicles:', error);
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
      
      console.log(`🚗 Vehicle ${index + 1} (${vehicle.class}): bbox=[${Math.round(vx)}, ${Math.round(vy)}, ${Math.round(vw)}, ${Math.round(vh)}]`);
      
      // License plate location varies by vehicle type and angle
      // Typical plate: 30-40cm wide, 10-15cm tall
      // On image: roughly 25-35% of vehicle width
      
      const plateWidth = Math.max(vw * 0.3, 60); // At least 60px or 30% of vehicle
      const plateHeight = Math.max(vh * 0.1, 20); // At least 20px or 10% of vehicle
      
      // CENTER PLATE (most common - front of car facing camera)
      const centerPlateX = vx + (vw - plateWidth) / 2;
      const centerPlateY = vy + vh * 0.65; // 65% down from top (front grille area)
      
      // BOTTOM PLATE (rear of car, or low-mounted front plates)
      const bottomPlateY = vy + vh - plateHeight - (vh * 0.08); // Near bottom
      
      // For motorcycles, plate is usually at the back, lower position
      const isMotorcycle = vehicle.class === 'motorcycle' || vehicle.class === 'bicycle';
      
      if (isMotorcycle) {
        // Motorcycle plate - rear, centered
        const motoPlateWidth = Math.max(vw * 0.4, 50);
        const motoPlateHeight = Math.max(vh * 0.12, 25);
        const motoPlateX = vx + (vw - motoPlateWidth) / 2;
        const motoPlateY = vy + vh * 0.7; // Lower on motorcycle
        
        console.log(`🔒 Blurring motorcycle plate: ${Math.round(motoPlateWidth)}x${Math.round(motoPlateHeight)} at (${Math.round(motoPlateX)}, ${Math.round(motoPlateY)})`);
        applyGaussianBlur(context, motoPlateX, motoPlateY, motoPlateWidth, motoPlateHeight, 35);
      } else {
        // Car/truck plates - blur both possible locations
        console.log(`🔒 Blurring car plates: ${Math.round(plateWidth)}x${Math.round(plateHeight)}`);
        
        // Front plate area (center-lower of vehicle)
        applyGaussianBlur(context, centerPlateX, centerPlateY, plateWidth, plateHeight, 35);
        
        // Rear/bottom plate area
        applyGaussianBlur(context, centerPlateX, bottomPlateY, plateWidth, plateHeight, 35);
      }
      
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
    
    // Run AI face and people detection
    const [faces, people] = await Promise.all([
      detectFaces(canvas),
      detectPeople(canvas)
    ]);
    
    let totalDetections = 0;
    let platesDetected = 0;
    
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
    
    // 3. LICENSE PLATE DETECTION - Scan for green, white, yellow, blue plates
    // Works regardless of vehicle detection
    console.log('🔍 Running license plate detection...');
    const plates = detectLicensePlates(canvas);
    
    if (plates.length > 0) {
      blurDetectedPlates(canvas, plates);
      platesDetected = plates.length;
      totalDetections += plates.length;
    } else {
      console.log('ℹ️ No license plates detected in image');
    }
    
    if (totalDetections === 0) {
      console.log('✅ No faces, people, or plates detected');
    }
    
    return {
      facesDetected: faces.length,
      peopleDetected: people.length,
      platesDetected: platesDetected,
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
