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
 * DIRECT LICENSE PLATE DETECTION
 * Scans image for rectangular regions that look like license plates
 * Looks for: white/light rectangles with dark text, proper aspect ratio
 * @param {HTMLCanvasElement} canvas - Canvas containing the image
 * @returns {Array} Array of detected plate regions
 */
const detectPlatesDirect = (canvas) => {
  try {
    const context = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const imageData = context.getImageData(0, 0, width, height);
    const pixels = imageData.data;
    
    console.log(`🔍 Scanning image ${width}x${height} for license plates...`);
    
    const candidates = [];
    
    // Typical license plate characteristics:
    // - Aspect ratio: 2:1 to 5:1 (width:height)
    // - Location: usually middle-lower part of image (40-90% from top)
    // - Background: white, silver, yellow, or blue
    // - Contains dark text/numbers
    // - Size: roughly 100-300px wide in typical photos
    
    const minPlateW = Math.max(80, width * 0.1);
    const maxPlateW = Math.min(350, width * 0.4);
    const minPlateH = Math.max(20, height * 0.03);
    const maxPlateH = Math.min(100, height * 0.15);
    
    // Search in lower 70% of image
    const searchStartY = Math.floor(height * 0.3);
    const searchEndY = height - minPlateH;
    
    // Step sizes for scanning
    const stepX = Math.max(5, Math.floor(width / 150));
    const stepY = Math.max(5, Math.floor(height / 100));
    
    // Test multiple plate sizes
    const plateSizes = [
      { w: minPlateW, h: minPlateH },
      { w: minPlateW * 1.5, h: minPlateH * 1.3 },
      { w: minPlateW * 2, h: minPlateH * 1.5 },
      { w: minPlateW * 2.5, h: minPlateH * 1.8 }
    ];
    
    for (const size of plateSizes) {
      const testW = Math.min(size.w, maxPlateW);
      const testH = Math.min(size.h, maxPlateH);
      const aspectRatio = testW / testH;
      
      // Skip if aspect ratio is not plate-like
      if (aspectRatio < 2 || aspectRatio > 5.5) continue;
      
      for (let y = searchStartY; y < searchEndY; y += stepY) {
        for (let x = 0; x < width - testW; x += stepX) {
          // Sample the region
          let whitePixels = 0;
          let yellowPixels = 0;
          let bluePixels = 0;
          let darkPixels = 0;
          let sampleCount = 0;
          
          // Sample every 3rd pixel for speed
          for (let py = y; py < y + testH && py < height; py += 3) {
            for (let px = x; px < x + testW && px < width; px += 3) {
              const idx = (py * width + px) * 4;
              const r = pixels[idx];
              const g = pixels[idx + 1];
              const b = pixels[idx + 2];
              const brightness = (r + g + b) / 3;
              
              // White/silver plate background
              if (brightness > 200 && Math.abs(r - g) < 30 && Math.abs(g - b) < 30) {
                whitePixels++;
              }
              // Yellow plate
              else if (r > 180 && g > 150 && b < 100) {
                yellowPixels++;
              }
              // Blue (EU plates, some Asian plates)
              else if (b > 150 && r < 120 && g < 150) {
                bluePixels++;
              }
              // Dark (text/numbers)
              else if (brightness < 80) {
                darkPixels++;
              }
              sampleCount++;
            }
          }
          
          if (sampleCount === 0) continue;
          
          const whiteRatio = whitePixels / sampleCount;
          const yellowRatio = yellowPixels / sampleCount;
          const blueRatio = bluePixels / sampleCount;
          const darkRatio = darkPixels / sampleCount;
          const plateColorRatio = whiteRatio + yellowRatio + blueRatio;
          
          // A plate should have:
          // - Significant plate-colored background (40-85%)
          // - Some dark pixels for text (5-40%)
          // - Not be entirely one color
          const isPlateCandidate = 
            plateColorRatio > 0.35 && 
            plateColorRatio < 0.9 &&
            darkRatio > 0.05 && 
            darkRatio < 0.45;
          
          if (isPlateCandidate) {
            // Calculate confidence score
            const confidence = (plateColorRatio * 0.5 + darkRatio * 0.3 + (aspectRatio > 2.5 ? 0.2 : 0.1));
            
            // Check for overlap with existing candidates
            const overlaps = candidates.some(c => {
              const overlapX = Math.max(0, Math.min(c.x + c.width, x + testW) - Math.max(c.x, x));
              const overlapY = Math.max(0, Math.min(c.y + c.height, y + testH) - Math.max(c.y, y));
              return overlapX > testW * 0.3 && overlapY > testH * 0.3;
            });
            
            if (!overlaps) {
              candidates.push({
                x: x,
                y: y,
                width: testW,
                height: testH,
                confidence: confidence,
                whiteRatio,
                darkRatio
              });
            }
          }
        }
      }
    }
    
    // Sort by confidence and get top results
    candidates.sort((a, b) => b.confidence - a.confidence);
    
    // Filter to best candidates (max 4)
    const plates = candidates.slice(0, 4);
    
    console.log(`📋 Direct detection found ${plates.length} plate candidate(s)`);
    plates.forEach((p, i) => {
      console.log(`  Plate ${i + 1}: ${Math.round(p.width)}x${Math.round(p.height)} at (${Math.round(p.x)}, ${Math.round(p.y)}), conf=${p.confidence.toFixed(2)}`);
    });
    
    return plates;
  } catch (error) {
    console.error('Error in direct plate detection:', error);
    return [];
  }
};

/**
 * Blur detected plate regions
 */
const blurDetectedPlates = (canvas, plates) => {
  if (!plates || plates.length === 0) return;
  
  const context = canvas.getContext('2d');
  
  plates.forEach((plate, index) => {
    // Add small padding around the detected plate
    const padX = plate.width * 0.1;
    const padY = plate.height * 0.15;
    
    const blurX = Math.max(0, plate.x - padX);
    const blurY = Math.max(0, plate.y - padY);
    const blurW = plate.width + padX * 2;
    const blurH = plate.height + padY * 2;
    
    console.log(`🔒 Blurring plate ${index + 1}: ${Math.round(blurW)}x${Math.round(blurH)} at (${Math.round(blurX)}, ${Math.round(blurY)})`);
    applyGaussianBlur(context, blurX, blurY, blurW, blurH, 40);
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
    
    // 3. LICENSE PLATE DETECTION - Direct scanning method (most reliable)
    // This works regardless of whether COCO-SSD detects vehicles
    console.log('🔍 Running direct license plate detection...');
    const directPlates = detectPlatesDirect(canvas);
    
    if (directPlates.length > 0) {
      blurDetectedPlates(canvas, directPlates);
      platesDetected = directPlates.length;
      totalDetections += directPlates.length;
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
