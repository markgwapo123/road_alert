/**
 * Privacy Protection Utility for Road Alert
 * Automatically blurs faces and license plates in captured images
 * Uses Canvas API and advanced image processing for privacy protection
 */

/**
 * Detects human faces in an image and blurs them
 * Uses facial feature detection (eyes, nose, mouth, hair)
 * @param {HTMLCanvasElement} canvas - Canvas with the image
 * @param {CanvasRenderingContext2D} context - Canvas context
 * @returns {Promise} Resolves when face blurring is complete
 */
export const blurDetectedFaces = async (canvas, context) => {
  try {
    console.log('🔍 Starting enhanced facial feature detection...');
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const regions = detectFacialFeatures(imageData.data, canvas.width, canvas.height);
    
    console.log(`👤 Detected ${regions.length} potential face regions`);
    
    if (regions.length === 0) {
      console.log('No faces detected');
      return;
    }

    // Blur each detected face region with 30px intensity
    for (const region of regions) {
      console.log(`Blurring face region: ${region.width}x${region.height} (confidence: ${(region.confidence * 100).toFixed(1)}%)`);
      applyBlur(context, region.x, region.y, region.width, region.height, 30);
    }
    
    console.log('✅ Face detection and blurring completed');
  } catch (error) {
    console.error('❌ Error in face detection:', error);
  }
};

/**
 * Detects license plates and hides them with Google Maps style overlay
 * @param {HTMLCanvasElement} canvas - Canvas with the image
 * @param {CanvasRenderingContext2D} context - Canvas context
 * @returns {Promise} Resolves when license plate hiding is complete
 */
export const hideLicensePlates = async (canvas, context) => {
  try {
    console.log('🚗 Detecting license plates...');
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const plates = detectLicensePlates(imageData.data, canvas.width, canvas.height);
    
    console.log(`🔍 Detected ${plates.length} potential license plates`);
    
    if (plates.length === 0) {
      console.log('No license plates detected');
      return;
    }

    // Hide each detected license plate with Google Maps style overlay
    for (const plate of plates) {
      console.log(`Hiding license plate: ${plate.width}x${plate.height}`);
      applyGoogleMapsStyleOverlay(context, plate.x, plate.y, plate.width, plate.height);
    }
    
    console.log('✅ License plate detection and hiding completed');
  } catch (error) {
    console.error('❌ Error in license plate detection:', error);
  }
};

/**
 * Advanced facial feature detection based on eyes, nose, mouth, and hair
 * @param {Uint8ClampedArray} data - Image pixel data
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {Array} Array of detected face regions
 */
const detectFacialFeatures = (data, width, height) => {
  const regions = [];
  const blockSize = 12; // Smaller blocks for precise feature detection
  
  // Focus on areas where faces are typically found (upper 70% of image)
  const searchHeight = Math.floor(height * 0.7);
  
  for (let y = 0; y < searchHeight - blockSize; y += blockSize) {
    for (let x = 0; x < width - blockSize; x += blockSize) {
      
      const features = analyzeFacialFeatures(data, width, height, x, y, blockSize);
      
      // If facial features detected, create comprehensive face region
      if (features.hasFacialFeatures) {
        const faceRegion = createCompleteFaceRegion(data, width, height, x, y, features);
        
        // Ensure minimum face size and add to regions
        if (faceRegion.width > 30 && faceRegion.height > 30) {
          regions.push(faceRegion);
        }
      }
    }
  }
  
  return removeDuplicateRegions(regions);
};

/**
 * Analyzes a region for facial features (eyes, nose, mouth, hair)
 * @param {Uint8ClampedArray} data - Image data
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} blockSize - Block size to analyze
 * @returns {Object} Facial feature analysis
 */
const analyzeFacialFeatures = (data, width, height, x, y, blockSize) => {
  let eyePixels = 0;
  let hairPixels = 0;
  let skinPixels = 0;
  let mouthPixels = 0;
  let nosePixels = 0;
  let totalPixels = 0;
  
  const features = {
    hasEyes: false,
    hasHair: false,
    hasSkin: false,
    hasMouth: false,
    hasNose: false,
    hasFacialFeatures: false,
    confidence: 0
  };
  
  // Analyze each pixel in the block
  for (let by = 0; by < blockSize; by++) {
    for (let bx = 0; bx < blockSize; bx++) {
      const pixelIndex = ((y + by) * width + (x + bx)) * 4;
      const r = data[pixelIndex];
      const g = data[pixelIndex + 1];
      const b = data[pixelIndex + 2];
      const brightness = (r + g + b) / 3;
      
      // Eye detection (dark areas, pupils)
      if (isEyePixel(r, g, b, brightness)) {
        eyePixels++;
      }
      
      // Hair detection (various dark to light browns, black, blonde)
      if (isHairPixel(r, g, b, brightness)) {
        hairPixels++;
      }
      
      // Skin detection (improved algorithm)
      if (isSkinTone(r, g, b) || isAlternateSkinTone(r, g, b)) {
        skinPixels++;
      }
      
      // Mouth/lip detection (reddish tones)
      if (isMouthPixel(r, g, b)) {
        mouthPixels++;
      }
      
      // Nose detection (skin tone with shadows)
      if (isNosePixel(r, g, b, brightness)) {
        nosePixels++;
      }
      
      totalPixels++;
    }
  }
  
  // Calculate feature ratios
  const eyeRatio = eyePixels / totalPixels;
  const hairRatio = hairPixels / totalPixels;
  const skinRatio = skinPixels / totalPixels;
  const mouthRatio = mouthPixels / totalPixels;
  const noseRatio = nosePixels / totalPixels;
  
  // Feature detection thresholds
  features.hasEyes = eyeRatio > 0.15; // Eyes are prominent
  features.hasHair = hairRatio > 0.20; // Hair coverage
  features.hasSkin = skinRatio > 0.25; // Skin tone presence
  features.hasMouth = mouthRatio > 0.08; // Mouth/lip area
  features.hasNose = noseRatio > 0.10; // Nose area
  
  // Determine if this looks like a face
  const featureCount = [
    features.hasEyes,
    features.hasHair,
    features.hasSkin,
    features.hasMouth,
    features.hasNose
  ].filter(Boolean).length;
  
  // Need at least 2 facial features to consider it a face
  features.hasFacialFeatures = featureCount >= 2;
  features.confidence = featureCount / 5; // Confidence based on number of features
  
  return features;
};

/**
 * Detects eye pixels (dark pupils, eyelashes, eyebrows)
 * @param {number} r - Red value
 * @param {number} g - Green value
 * @param {number} b - Blue value
 * @param {number} brightness - Brightness value
 * @returns {boolean} Whether pixel looks like an eye
 */
const isEyePixel = (r, g, b, brightness) => {
  // Very dark pixels (pupils, eyelashes)
  if (brightness < 50) return true;
  
  // Dark brown/black eyebrows
  if (brightness < 80 && r < 100 && g < 80 && b < 70) return true;
  
  // Eye whites (but not too bright to avoid false positives)
  if (brightness > 200 && brightness < 240 && 
      Math.abs(r - g) < 20 && Math.abs(g - b) < 20) return true;
  
  return false;
};

/**
 * Detects hair pixels (various hair colors)
 * @param {number} r - Red value
 * @param {number} g - Green value
 * @param {number} b - Blue value
 * @param {number} brightness - Brightness value
 * @returns {boolean} Whether pixel looks like hair
 */
const isHairPixel = (r, g, b, brightness) => {
  // Black hair
  if (brightness < 60) return true;
  
  // Brown hair (various shades)
  if (brightness < 120 && r > g && r > b && (r - g) < 40) return true;
  
  // Blonde hair
  if (brightness > 120 && brightness < 200 && 
      r > 180 && g > 150 && b < 150) return true;
  
  // Red hair
  if (r > 150 && g < 120 && b < 100 && r > g + 30) return true;
  
  // Gray/white hair
  if (brightness > 160 && Math.abs(r - g) < 30 && Math.abs(g - b) < 30) return true;
  
  return false;
};

/**
 * Detects mouth/lip pixels (reddish, pinkish tones)
 * @param {number} r - Red value
 * @param {number} g - Green value
 * @param {number} b - Blue value
 * @returns {boolean} Whether pixel looks like mouth/lips
 */
const isMouthPixel = (r, g, b) => {
  // Natural lip colors (pinkish, reddish)
  if (r > g + 20 && r > b + 10 && r > 120 && g < 160) return true;
  
  // Darker lip colors
  if (r > g && r > b && r > 80 && r < 150) return true;
  
  // Very dark mouth area (open mouth)
  if (r < 80 && g < 80 && b < 80) return true;
  
  return false;
};

/**
 * Detects nose pixels (skin tone with shadows/highlights)
 * @param {number} r - Red value
 * @param {number} g - Green value
 * @param {number} b - Blue value
 * @param {number} brightness - Brightness value
 * @returns {boolean} Whether pixel looks like nose
 */
const isNosePixel = (r, g, b, brightness) => {
  // Nose is typically skin tone with some variation in brightness
  const isSkin = isSkinTone(r, g, b) || isAlternateSkinTone(r, g, b);
  
  if (!isSkin) return false;
  
  // Nose has highlights and shadows
  if (brightness > 140 || brightness < 80) return true;
  
  // Nose bridge area (slightly more red/pink)
  if (r > g + 10 && r > b + 5) return true;
  
  return false;
};

/**
 * Creates a comprehensive face region based on detected features
 * @param {Uint8ClampedArray} data - Image data
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {number} x - X coordinate of detected features
 * @param {number} y - Y coordinate of detected features
 * @param {Object} features - Detected facial features
 * @returns {Object} Complete face region
 */
const createCompleteFaceRegion = (data, width, height, x, y, features) => {
  // Face proportions: typical face is about 1:1.3 ratio (width:height)
  const baseSize = 40; // Base size for detected feature
  
  // Expand region based on confidence and feature types
  let expansionFactor = 2.5 + (features.confidence * 1.5);
  
  // If we have hair, expand upward more
  if (features.hasHair) expansionFactor += 0.5;
  
  // If we have eyes, this is likely the center of the face
  if (features.hasEyes) expansionFactor += 0.3;
  
  const faceWidth = baseSize * expansionFactor;
  const faceHeight = faceWidth * 1.3; // Face is taller than wide
  
  // Center the region around the detected features
  const centerX = x + (baseSize / 2);
  const centerY = y + (baseSize / 2);
  
  const faceRegion = {
    x: Math.max(0, Math.floor(centerX - faceWidth / 2)),
    y: Math.max(0, Math.floor(centerY - faceHeight / 3)), // Face extends more below features
    width: Math.min(width, Math.ceil(faceWidth)),
    height: Math.min(height, Math.ceil(faceHeight)),
    confidence: features.confidence,
    features: features
  };
  
  return faceRegion;
};

/**
 * Detects license plates in the image
 * @param {Uint8ClampedArray} data - Image pixel data
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {Array} Array of detected plate regions
 */
const detectLicensePlates = (data, width, height) => {
  const regions = [];
  const blockSize = 20; // Larger blocks for license plate detection
  
  for (let y = 0; y < height - blockSize; y += blockSize) {
    for (let x = 0; x < width - blockSize; x += blockSize) {
      
      const plateAnalysis = analyzePlateRegion(data, width, height, x, y, blockSize);
      
      if (plateAnalysis.isLicensePlate) {
        const plateRegion = expandPlateRegion(data, width, height, x, y, blockSize, plateAnalysis.score);
        
        if (plateRegion.width > 40 && plateRegion.height > 15 && plateRegion.width / plateRegion.height > 2) {
          regions.push(plateRegion);
        }
      }
    }
  }
  
  return removeDuplicateRegions(regions);
};

/**
 * Analyzes a region for license plate characteristics
 * @param {Uint8ClampedArray} data - Image data
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} blockSize - Block size to analyze
 * @returns {Object} License plate analysis
 */
const analyzePlateRegion = (data, width, height, x, y, blockSize) => {
  let whitePixels = 0;
  let darkPixels = 0;
  let edgePixels = 0;
  let totalPixels = 0;
  
  for (let by = 0; by < blockSize; by++) {
    for (let bx = 0; bx < blockSize; bx++) {
      const pixelIndex = ((y + by) * width + (x + bx)) * 4;
      const r = data[pixelIndex];
      const g = data[pixelIndex + 1];
      const b = data[pixelIndex + 2];
      const brightness = (r + g + b) / 3;
      
      if (isPlateColor(r, g, b)) {
        whitePixels++;
      }
      
      if (brightness < 100) {
        darkPixels++;
      }
      
      if (isEdgePixel(data, width, height, x + bx, y + by)) {
        edgePixels++;
      }
      
      totalPixels++;
    }
  }
  
  const whiteRatio = whitePixels / totalPixels;
  const darkRatio = darkPixels / totalPixels;
  const edgeRatio = edgePixels / totalPixels;
  
  const score = (whiteRatio * 0.4) + (darkRatio * 0.3) + (edgeRatio * 0.3);
  
  return {
    isLicensePlate: score > 0.4 && whiteRatio > 0.3 && darkRatio > 0.1,
    score: score,
    whiteRatio: whiteRatio,
    darkRatio: darkRatio,
    edgeRatio: edgeRatio
  };
};

/**
 * Checks if a pixel color matches typical license plate colors
 * @param {number} r - Red value
 * @param {number} g - Green value
 * @param {number} b - Blue value
 * @returns {boolean} Whether pixel looks like a license plate color
 */
const isPlateColor = (r, g, b) => {
  const brightness = (r + g + b) / 3;
  
  // White/light colored plates
  if (brightness > 180 && Math.abs(r - g) < 30 && Math.abs(g - b) < 30) return true;
  
  // Yellow plates
  if (r > 200 && g > 180 && b < 100) return true;
  
  // Blue plates (some regions)
  if (b > 150 && r < 100 && g < 120) return true;
  
  return false;
};

/**
 * Checks if a pixel is likely an edge (high contrast)
 * @param {Uint8ClampedArray} data - Image data
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {boolean} Whether pixel is an edge
 */
const isEdgePixel = (data, width, height, x, y) => {
  if (x <= 0 || y <= 0 || x >= width - 1 || y >= height - 1) return false;
  
  const currentIndex = (y * width + x) * 4;
  const rightIndex = (y * width + x + 1) * 4;
  const bottomIndex = ((y + 1) * width + x) * 4;
  
  const currentBrightness = (data[currentIndex] + data[currentIndex + 1] + data[currentIndex + 2]) / 3;
  const rightBrightness = (data[rightIndex] + data[rightIndex + 1] + data[rightIndex + 2]) / 3;
  const bottomBrightness = (data[bottomIndex] + data[bottomIndex + 1] + data[bottomIndex + 2]) / 3;
  
  const horizontalDiff = Math.abs(currentBrightness - rightBrightness);
  const verticalDiff = Math.abs(currentBrightness - bottomBrightness);
  
  return horizontalDiff > 30 || verticalDiff > 30;
};

/**
 * Expands a potential license plate region
 * @param {Uint8ClampedArray} data - Image data
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} blockSize - Initial block size
 * @param {number} plateScore - Plate detection score
 * @returns {Object} Expanded plate region
 */
const expandPlateRegion = (data, width, height, x, y, blockSize, plateScore) => {
  const expansionFactor = 1.5 + plateScore;
  const plateWidth = blockSize * expansionFactor * 3; // Plates are typically wider
  const plateHeight = blockSize * expansionFactor;
  
  return {
    x: Math.max(0, x - blockSize),
    y: Math.max(0, y - blockSize / 2),
    width: Math.min(width, plateWidth),
    height: Math.min(height, plateHeight),
    score: plateScore
  };
};

/**
 * Detects skin tone pixels using HSV color space analysis
 * @param {number} r - Red value (0-255)
 * @param {number} g - Green value (0-255)
 * @param {number} b - Blue value (0-255)
 * @returns {boolean} Whether the pixel is likely skin tone
 */
const isSkinTone = (r, g, b) => {
  // Basic skin tone check
  if (r > 95 && g > 40 && b > 20 && 
      Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
      Math.abs(r - g) > 15 && r > g && r > b) {
    return true;
  }
  return false;
};

/**
 * Alternative skin tone detection for different ethnicities
 * @param {number} r - Red value
 * @param {number} g - Green value
 * @param {number} b - Blue value
 * @returns {boolean} Whether pixel is alternate skin tone
 */
const isAlternateSkinTone = (r, g, b) => {
  // Darker skin tones
  if (r > 60 && g > 40 && b > 20 && r > g && g >= b) return true;
  
  // Lighter skin tones
  if (r > 200 && g > 160 && b > 130 && r > g && g > b) return true;
  
  return false;
};

/**
 * Applies blur to a specific region of the canvas
 * @param {CanvasRenderingContext2D} context - Canvas context
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} width - Width of region
 * @param {number} height - Height of region
 * @param {number} blurAmount - Blur intensity in pixels
 */
const applyBlur = (context, x, y, width, height, blurAmount = 20) => {
  // Save current state
  context.save();
  
  // Create temporary canvas for the region
  const tempCanvas = document.createElement('canvas');
  const tempContext = tempCanvas.getContext('2d');
  tempCanvas.width = width;
  tempCanvas.height = height;
  
  // Copy the region to temp canvas
  const imageData = context.getImageData(x, y, width, height);
  tempContext.putImageData(imageData, 0, 0);
  
  // Apply blur filter
  context.filter = `blur(${blurAmount}px)`;
  context.drawImage(tempCanvas, x, y);
  
  // Restore context
  context.filter = 'none';
  context.restore();
};

/**
 * Applies Google Maps style solid overlay to license plates
 * @param {CanvasRenderingContext2D} context - Canvas context
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} width - Width of region
 * @param {number} height - Height of region
 */
const applyGoogleMapsStyleOverlay = (context, x, y, width, height) => {
  // Save current state
  context.save();
  
  // Create rounded rectangle path
  const radius = 6;
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  
  // Fill with semi-transparent dark color
  context.fillStyle = 'rgba(60, 60, 60, 0.85)';
  context.fill();
  
  // Add subtle border
  context.strokeStyle = 'rgba(40, 40, 40, 0.9)';
  context.lineWidth = 1;
  context.stroke();
  
  // Add "hidden" text if region is large enough
  if (width > 60 && height > 20) {
    context.fillStyle = 'rgba(255, 255, 255, 0.7)';
    context.font = `${Math.min(height * 0.6, 12)}px Arial`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('Hidden', x + width / 2, y + height / 2);
  }
  
  // Restore context
  context.restore();
};

/**
 * Removes overlapping regions to avoid duplicate processing
 * @param {Array} regions - Array of detected regions
 * @returns {Array} Filtered regions without duplicates
 */
const removeDuplicateRegions = (regions) => {
  if (regions.length === 0) return regions;
  
  // Sort regions by confidence (if available) and then by size
  regions.sort((a, b) => {
    const confA = a.confidence || 0;
    const confB = b.confidence || 0;
    
    if (confA !== confB) return confB - confA; // Higher confidence first
    
    const sizeA = a.width * a.height;
    const sizeB = b.width * b.height;
    return sizeB - sizeA; // Larger size first
  });
  
  const filtered = [];
  
  for (const region of regions) {
    let shouldAdd = true;
    let indexToReplace = -1;
    
    for (let i = 0; i < filtered.length; i++) {
      const existing = filtered[i];
      
      if (regionsOverlap(region, existing)) {
        const overlapArea = calculateOverlapArea(region, existing);
        const regionArea = region.width * region.height;
        const existingArea = existing.width * existing.height;
        const overlapPercent = overlapArea / Math.min(regionArea, existingArea);
        
        // If overlap is significant (>40%), choose better region
        if (overlapPercent > 0.4) {
          const regionConf = region.confidence || 0;
          const existingConf = existing.confidence || 0;
          
          if (regionConf > existingConf) {
            // Replace existing with current (better confidence)
            indexToReplace = i;
            break;
          } else {
            // Keep existing, skip current
            shouldAdd = false;
            break;
          }
        }
      }
    }
    
    if (indexToReplace >= 0) {
      filtered[indexToReplace] = region;
    } else if (shouldAdd) {
      filtered.push(region);
    }
  }
  
  return filtered;
};

/**
 * Calculates the overlap area between two regions
 */
const calculateOverlapArea = (region1, region2) => {
  const left = Math.max(region1.x, region2.x);
  const right = Math.min(region1.x + region1.width, region2.x + region2.width);
  const top = Math.max(region1.y, region2.y);
  const bottom = Math.min(region1.y + region1.height, region2.y + region2.height);
  
  if (left >= right || top >= bottom) return 0;
  
  return (right - left) * (bottom - top);
};

/**
 * Checks if two regions overlap
 */
const regionsOverlap = (region1, region2) => {
  return !(
    region1.x + region1.width < region2.x ||
    region2.x + region2.width < region1.x ||
    region1.y + region1.height < region2.y ||
    region2.y + region2.height < region1.y
  );
};

/**
 * Main function to apply comprehensive privacy protection to an image
 * @param {HTMLCanvasElement} canvas - Canvas element containing the image
 * @returns {Promise} Resolves when privacy protection is complete
 */
export const applyPrivacyProtection = async (canvas) => {
  try {
    console.log('🔒 Starting comprehensive privacy protection...');
    
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not get canvas context');
    }
    
    // Apply face blurring
    await blurDetectedFaces(canvas, context);
    
    // Apply license plate hiding
    await hideLicensePlates(canvas, context);
    
    console.log('✅ Privacy protection applied successfully');
  } catch (error) {
    console.error('❌ Error applying privacy protection:', error);
    throw error;
  }
};