/**
 * Privacy Protection Utility for Road Alert
 * Automatically blurs faces and license plates in captured images
 * Uses Canvas API and basic image processing for privacy protection
 */

/**
 * Detects human faces in an image and blurs them
 * Uses facial feature detection (eyes, nose, mouth, hair)
 * @param {HTMLCanvasElement} canvas - Canvas with the image
 * @param {CanvasRenderingContext2D} context - Canvas context
 */
export const blurDetectedFaces = async (canvas, context) => {
  try {
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Advanced facial feature detection
    const faceRegions = detectFacialFeatures(data, canvas.width, canvas.height);
    
    // Secondary detection for human shapes in upper areas
    const upperBodyRegions = detectUpperBodyRegions(data, canvas.width, canvas.height);
    
    // Combine all detected regions
    const allRegions = [...faceRegions, ...upperBodyRegions];
    
    // Blur detected regions
    for (const region of allRegions) {
      blurRegion(context, region.x, region.y, region.width, region.height, 30); // Increased blur
    }
    
    // Additional safety blur for potential missed faces
    await applySafetyBlur(canvas, context, data);
    
    console.log(`🔒 Privacy: Blurred ${allRegions.length} potential face/body region(s) using facial feature detection`);
  } catch (error) {
    console.warn('⚠️ Face detection failed:', error);
  }
};

/**
 * Detects and hides license plates in an image
 * Uses Google Maps style solid overlay instead of blur
 * @param {HTMLCanvasElement} canvas - Canvas with the image
 * @param {CanvasRenderingContext2D} context - Canvas context
 */
export const hideLicensePlates = async (canvas, context) => {
  try {
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Detect potential license plate regions
    const plateRegions = detectLicensePlates(data, canvas.width, canvas.height);
    
    // Apply Google Maps style solid overlay to detected license plates
    for (const region of plateRegions) {
      applyGoogleMapsStyleOverlay(context, region.x, region.y, region.width, region.height);
    }
    
    console.log(`🔒 Privacy: Applied Google Maps style overlay to ${plateRegions.length} potential license plate(s)`);
  } catch (error) {
    console.warn('⚠️ License plate detection failed:', error);
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
 * Detects potential license plate regions with improved accuracy
 * @param {Uint8ClampedArray} data - Image pixel data
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {Array} Array of detected plate regions
 */
const detectLicensePlates = (data, width, height) => {
  const regions = [];
  const blockSize = 25; // Optimal size for license plate detection
  
  // Focus on areas where license plates are typically found
  const searchAreas = [
    { startY: Math.floor(height * 0.3), endY: Math.floor(height * 0.9) }, // Lower 60% for front/rear plates
    { startY: Math.floor(height * 0.1), endY: Math.floor(height * 0.7) }  // Middle area for side plates
  ];
  
  for (const area of searchAreas) {
    for (let y = area.startY; y < area.endY - blockSize; y += blockSize) {
      for (let x = 0; x < width - blockSize; x += blockSize) {
        const plateScore = analyzePlateRegion(data, width, height, x, y, blockSize);
        
        if (plateScore.isLikelyPlate) {
          // Expand region for better coverage
          const expandedRegion = expandPlateRegion(data, width, height, x, y, blockSize, plateScore);
          regions.push(expandedRegion);
        }
      }
    }
  }
  
  return removeDuplicateRegions(regions);
};

/**
 * Analyzes a region to determine if it's likely a license plate
 * @param {Uint8ClampedArray} data - Image data
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} blockSize - Block size to analyze
 * @returns {Object} Analysis result with plate likelihood
 */
const analyzePlateRegion = (data, width, height, x, y, blockSize) => {
  let whitePixels = 0;
  let blackPixels = 0;
  let coloredPixels = 0;
  let totalPixels = 0;
  let edgePixels = 0;
  
  for (let by = 0; by < blockSize; by++) {
    for (let bx = 0; bx < blockSize; bx++) {
      const pixelIndex = ((y + by) * width + (x + bx)) * 4;
      const r = data[pixelIndex];
      const g = data[pixelIndex + 1];
      const b = data[pixelIndex + 2];
      const brightness = (r + g + b) / 3;
      
      // Classify pixels
      if (brightness > 200 && Math.abs(r - g) < 30 && Math.abs(g - b) < 30) {
        whitePixels++; // White/light background
      } else if (brightness < 80) {
        blackPixels++; // Dark text/numbers
      } else if (isPlateColor(r, g, b)) {
        coloredPixels++; // Colored plate (yellow, blue, green)
      }
      
      // Check for edges (typical plate borders)
      if (isEdgePixel(data, width, height, x + bx, y + by)) {
        edgePixels++;
      }
      
      totalPixels++;
    }
  }
  
  // Calculate ratios
  const whiteRatio = whitePixels / totalPixels;
  const blackRatio = blackPixels / totalPixels;
  const colorRatio = coloredPixels / totalPixels;
  const edgeRatio = edgePixels / totalPixels;
  const contrastRatio = (whitePixels + blackPixels) / totalPixels;
  
  // License plate characteristics:
  // - High contrast (white background, black text) OR colored background
  // - Rectangular shape with edges
  // - Specific size ratio
  const isLikelyPlate = (
    (contrastRatio > 0.6 && whiteRatio > 0.3 && blackRatio > 0.1) || // Traditional white plates
    (colorRatio > 0.4 && (whiteRatio > 0.2 || blackRatio > 0.1)) || // Colored plates
    (edgeRatio > 0.2 && contrastRatio > 0.5) // Strong edges with contrast
  );
  
  return {
    isLikelyPlate,
    confidence: Math.max(contrastRatio, colorRatio) + edgeRatio,
    whiteRatio,
    blackRatio,
    colorRatio,
    edgeRatio
  };
};

/**
 * Checks if a color matches typical license plate colors
 * @param {number} r - Red value
 * @param {number} g - Green value
 * @param {number} b - Blue value
 * @returns {boolean} Whether the color is typical for license plates
 */
const isPlateColor = (r, g, b) => {
  // Yellow plates (many countries)
  if (r > 200 && g > 180 && b < 100) return true;
  
  // Blue plates (European)
  if (b > 150 && r < 100 && g < 150) return true;
  
  // Green plates (some regions)
  if (g > 150 && r < 120 && b < 120) return true;
  
  // Light colored plates
  if (r > 180 && g > 180 && b > 180) return true;
  
  return false;
};

/**
 * Checks if a pixel is likely an edge
 * @param {Uint8ClampedArray} data - Image data
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {boolean} Whether pixel is likely an edge
 */
const isEdgePixel = (data, width, height, x, y) => {
  if (x <= 0 || y <= 0 || x >= width - 1 || y >= height - 1) return false;
  
  const getPixelBrightness = (px, py) => {
    const idx = (py * width + px) * 4;
    return (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
  };
  
  const center = getPixelBrightness(x, y);
  const left = getPixelBrightness(x - 1, y);
  const right = getPixelBrightness(x + 1, y);
  const up = getPixelBrightness(x, y - 1);
  const down = getPixelBrightness(x, y + 1);
  
  // Check for significant brightness differences (edges)
  return (
    Math.abs(center - left) > 50 ||
    Math.abs(center - right) > 50 ||
    Math.abs(center - up) > 50 ||
    Math.abs(center - down) > 50
  );
};

/**
 * Expands detected plate region for better coverage
 * @param {Uint8ClampedArray} data - Image data
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} blockSize - Original block size
 * @param {Object} plateScore - Analysis score
 * @returns {Object} Expanded region
 */
const expandPlateRegion = (data, width, height, x, y, blockSize, plateScore) => {
  // License plates are typically 2-4 times wider than they are tall
  const plateRatio = 3; // Typical width:height ratio
  
  let expandedWidth = blockSize;
  let expandedHeight = blockSize;
  
  // Expand horizontally (plates are wider)
  const maxWidth = blockSize * plateRatio;
  for (let w = blockSize; w < maxWidth && (x + w) < width; w += 10) {
    const rightRegion = analyzePlateRegion(data, width, height, x + blockSize, y, 10);
    if (rightRegion.confidence > 0.3) {
      expandedWidth = w;
    } else {
      break;
    }
  }
  
  // Ensure minimum coverage and add padding
  const finalWidth = Math.max(expandedWidth, blockSize * 2);
  const finalHeight = Math.max(expandedHeight, blockSize);
  
  return {
    x: Math.max(0, x - 5), // Add padding
    y: Math.max(0, y - 5),
    width: Math.min(width - x, finalWidth + 10),
    height: Math.min(height - y, finalHeight + 10),
    confidence: plateScore.confidence
  };
};

/**
 * Checks if RGB values match typical skin tone
 * @param {number} r - Red value
 * @param {number} g - Green value  
 * @param {number} b - Blue value
 * @returns {boolean} Whether the color is likely skin tone
 */
const isSkinTone = (r, g, b) => {
  // Primary skin tone detection algorithm - covers light to medium skin tones
  return (
    r > 95 && g > 40 && b > 20 &&
    r > g && r > b &&
    Math.abs(r - g) > 10 &&
    r - b > 10
  );
};

/**
 * Additional skin tone detection for broader range
 * @param {number} r - Red value
 * @param {number} g - Green value  
 * @param {number} b - Blue value
 * @returns {boolean} Whether the color matches alternate skin tones
 */
const isAlternateSkinTone = (r, g, b) => {
  // Covers darker skin tones and different lighting conditions
  const hue = getHue(r, g, b);
  const saturation = getSaturation(r, g, b);
  const brightness = (r + g + b) / 3;
  
  // Skin tone typically has hue between 0-30 degrees (red-orange range)
  // and moderate saturation
  return (
    (hue >= 0 && hue <= 30) || (hue >= 330 && hue <= 360)
  ) && (
    saturation >= 0.15 && saturation <= 0.8
  ) && (
    brightness >= 40 && brightness <= 220
  ) && (
    // Additional checks for skin tone characteristics
    r >= g && (r - b) >= 10
  );
};

/**
 * Calculate hue from RGB
 */
const getHue = (r, g, b) => {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  
  if (diff === 0) return 0;
  
  let hue;
  if (max === r) {
    hue = ((g - b) / diff) % 6;
  } else if (max === g) {
    hue = (b - r) / diff + 2;
  } else {
    hue = (r - g) / diff + 4;
  }
  
  return Math.round(hue * 60);
};

/**
 * Calculate saturation from RGB
 */
const getSaturation = (r, g, b) => {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  
  if (max === 0) return 0;
  return diff / max;
};

/**
 * Detects upper body regions that might contain faces
 * @param {Uint8ClampedArray} data - Image pixel data
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {Array} Array of detected upper body regions
 */
const detectUpperBodyRegions = (data, width, height) => {
  const regions = [];
  const blockSize = 40;
  
  // Focus on upper 60% of image where faces are likely
  const searchHeight = Math.floor(height * 0.6);
  
  for (let y = 0; y < searchHeight - blockSize; y += blockSize) {
    for (let x = 0; x < width - blockSize; x += blockSize) {
      let skinPixels = 0;
      let clothingPixels = 0;
      let totalPixels = 0;
      
      // Analyze block for human characteristics
      for (let by = 0; by < blockSize; by++) {
        for (let bx = 0; bx < blockSize; bx++) {
          const pixelIndex = ((y + by) * width + (x + bx)) * 4;
          const r = data[pixelIndex];
          const g = data[pixelIndex + 1];
          const b = data[pixelIndex + 2];
          
          if (isSkinTone(r, g, b) || isAlternateSkinTone(r, g, b)) {
            skinPixels++;
          } else if (isClothingColor(r, g, b)) {
            clothingPixels++;
          }
          totalPixels++;
        }
      }
      
      // Look for combination of skin and clothing (typical human pattern)
      const skinRatio = skinPixels / totalPixels;
      const clothingRatio = clothingPixels / totalPixels;
      
      if (skinRatio > 0.1 && clothingRatio > 0.2) {
        regions.push({
          x: Math.max(0, x - 20),
          y: Math.max(0, y - 20),
          width: blockSize + 40,
          height: blockSize + 40
        });
      }
    }
  }
  
  return removeDuplicateRegions(regions);
};

/**
 * Detects typical clothing colors
 * @param {number} r - Red value
 * @param {number} g - Green value
 * @param {number} b - Blue value
 * @returns {boolean} Whether the color is likely clothing
 */
const isClothingColor = (r, g, b) => {
  const brightness = (r + g + b) / 3;
  
  // Common clothing colors: dark colors, bright colors, white/light colors
  return (
    // Dark clothing (black, navy, etc.)
    brightness < 80 ||
    // White/light clothing
    (brightness > 200 && Math.abs(r - g) < 30 && Math.abs(g - b) < 30) ||
    // Bright colors (red, blue, green shirts, etc.)
    (Math.max(r, g, b) > 150 && (Math.abs(r - g) > 50 || Math.abs(g - b) > 50 || Math.abs(r - b) > 50))
  );
};

/**
 * Applies additional safety blur to areas that might contain faces
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {CanvasRenderingContext2D} context - Canvas context
 * @param {Uint8ClampedArray} data - Image data
 */
const applySafetyBlur = async (canvas, context, data) => {
  const width = canvas.width;
  const height = canvas.height;
  
  // Additional check for any remaining skin-colored regions in face area
  const faceArea = {
    startY: 0,
    endY: Math.floor(height * 0.4), // Top 40% of image
    startX: Math.floor(width * 0.1), // Exclude extreme edges
    endX: Math.floor(width * 0.9)
  };
  
  for (let y = faceArea.startY; y < faceArea.endY; y += 30) {
    for (let x = faceArea.startX; x < faceArea.endX; x += 30) {
      let skinPixels = 0;
      const checkSize = 25;
      
      // Check small area for skin tone
      for (let cy = 0; cy < checkSize && (y + cy) < height; cy++) {
        for (let cx = 0; cx < checkSize && (x + cx) < width; cx++) {
          const pixelIndex = ((y + cy) * width + (x + cx)) * 4;
          const r = data[pixelIndex];
          const g = data[pixelIndex + 1];
          const b = data[pixelIndex + 2];
          
          if (isSkinTone(r, g, b) || isAlternateSkinTone(r, g, b)) {
            skinPixels++;
          }
        }
      }
      
      // If significant skin detected, apply safety blur
      if (skinPixels > checkSize * checkSize * 0.15) {
        blurRegion(context, x - 15, y - 15, checkSize + 30, checkSize + 30, 20);
      }
    }
  }
};

/**
 * Expands a detected skin region to cover full face area
 * @param {Uint8ClampedArray} data - Image data
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {number} startX - Starting X coordinate
 * @param {number} startY - Starting Y coordinate
 * @param {number} blockSize - Initial block size
 * @returns {Object} Expanded face region
 */
const expandFaceRegion = (data, width, height, startX, startY, blockSize) => {
  let minX = startX;
  let maxX = startX + blockSize;
  let minY = startY;
  let maxY = startY + blockSize;
  
  // Expand region to include nearby skin pixels
  const expansion = 50; // Increased expansion distance
  
  // Expand left
  for (let x = startX - expansion; x >= 0 && x < startX; x += 5) {
    if (hasSkinInColumn(data, width, height, x, minY, maxY)) {
      minX = x;
    } else break;
  }
  
  // Expand right
  for (let x = maxX; x < width && x < maxX + expansion; x += 5) {
    if (hasSkinInColumn(data, width, height, x, minY, maxY)) {
      maxX = x;
    } else break;
  }
  
  // Expand up
  for (let y = startY - expansion; y >= 0 && y < startY; y += 5) {
    if (hasSkinInRow(data, width, height, y, minX, maxX)) {
      minY = y;
    } else break;
  }
  
  // Expand down
  for (let y = maxY; y < height && y < maxY + expansion; y += 5) {
    if (hasSkinInRow(data, width, height, y, minX, maxX)) {
      maxY = y;
    } else break;
  }
  
  return {
    x: Math.max(0, minX - 10), // Add padding
    y: Math.max(0, minY - 10),
    width: Math.min(width, maxX - minX + 20),
    height: Math.min(height, maxY - minY + 20)
  };
};
  let minX = startX;
  let maxX = startX + blockSize;
  let minY = startY;
  let maxY = startY + blockSize;
  
  // Expand region to include nearby skin pixels
  const expansion = 40; // Maximum expansion distance
  
  // Expand left
  for (let x = startX - expansion; x >= 0 && x < startX; x += 5) {
    if (hasSkinInColumn(data, width, height, x, minY, maxY)) {
      minX = x;
    } else break;
  }
  
  // Expand right
  for (let x = maxX; x < width && x < maxX + expansion; x += 5) {
    if (hasSkinInColumn(data, width, height, x, minY, maxY)) {
      maxX = x;
    } else break;
  }
  
  // Expand up
  for (let y = startY - expansion; y >= 0 && y < startY; y += 5) {
    if (hasSkinInRow(data, width, height, y, minX, maxX)) {
      minY = y;
    } else break;
  }
  
  // Expand down
  for (let y = maxY; y < height && y < maxY + expansion; y += 5) {
    if (hasSkinInRow(data, width, height, y, minX, maxX)) {
      maxY = y;
    } else break;
  }
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
};

/**
 * Checks if a column has skin tone pixels
 */
const hasSkinInColumn = (data, width, height, x, minY, maxY) => {
  for (let y = minY; y < maxY; y++) {
    const pixelIndex = (y * width + x) * 4;
    const r = data[pixelIndex];
    const g = data[pixelIndex + 1];
    const b = data[pixelIndex + 2];
    if (isSkinTone(r, g, b)) return true;
  }
  return false;
};

/**
 * Checks if a row has skin tone pixels
 */
const hasSkinInRow = (data, width, height, y, minX, maxX) => {
  for (let x = minX; x < maxX; x++) {
    const pixelIndex = (y * width + x) * 4;
    const r = data[pixelIndex];
    const g = data[pixelIndex + 1];
    const b = data[pixelIndex + 2];
    if (isSkinTone(r, g, b)) return true;
  }
  return false;
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
  
  // Create solid overlay similar to Google Maps
  const gradient = context.createLinearGradient(x, y, x + width, y + height);
  gradient.addColorStop(0, 'rgba(128, 128, 128, 0.95)'); // Dark gray
  gradient.addColorStop(0.5, 'rgba(100, 100, 100, 0.98)'); // Darker center
  gradient.addColorStop(1, 'rgba(128, 128, 128, 0.95)'); // Dark gray
  
  // Apply the overlay
  context.fillStyle = gradient;
  context.fillRect(x, y, width, height);
  
  // Add subtle border effect like Google Maps
  context.strokeStyle = 'rgba(80, 80, 80, 0.8)';
  context.lineWidth = 1;
  context.strokeRect(x, y, width, height);
  
  // Optional: Add subtle pattern for better visual effect
  context.fillStyle = 'rgba(110, 110, 110, 0.3)';
  for (let i = 0; i < width; i += 4) {
    context.fillRect(x + i, y, 2, height);
  }
  
  // Restore context
  context.restore();
};

/**
 * Applies blur effect to a specific region (used for faces)
 * @param {CanvasRenderingContext2D} context - Canvas context
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate  
 * @param {number} width - Width of region
 * @param {number} height - Height of region
 * @param {number} blurAmount - Blur intensity
 */
const blurRegion = (context, x, y, width, height, blurAmount) => {
  // Save current state
  context.save();
  
  // Create a temporary canvas for the blur effect
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
  // Save current state
  context.save();
  
  // Create a temporary canvas for the blur effect
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
 * Removes overlapping regions to avoid duplicate blurs
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
 * Main function to apply all privacy protections
 * @param {HTMLCanvasElement} canvas - Canvas with captured image
 * @returns {Promise<void>}
 */
export const applyPrivacyProtection = async (canvas) => {
  const context = canvas.getContext('2d');
  
  console.log('🔒 Starting privacy protection...');
  
  // Apply face blurring
  await blurDetectedFaces(canvas, context);
  
  // Apply license plate hiding
  await hideLicensePlates(canvas, context);
  
  console.log('✅ Privacy protection applied successfully');
};

export default {
  applyPrivacyProtection,
  blurDetectedFaces,
  hideLicensePlates
};