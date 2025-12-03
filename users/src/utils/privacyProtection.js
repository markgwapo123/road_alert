/**
 * Privacy Protection Utility for Road Alert
 * Automatically blurs faces and license plates in captured images
 * Uses Canvas API and basic image processing for privacy protection
 */

/**
 * Detects human faces in an image and blurs them
 * Uses a simple detection algorithm based on skin tone and facial features
 * @param {HTMLCanvasElement} canvas - Canvas with the image
 * @param {CanvasRenderingContext2D} context - Canvas context
 */
export const blurDetectedFaces = async (canvas, context) => {
  try {
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Simple face detection based on skin tone regions
    const faceRegions = detectFaceRegions(data, canvas.width, canvas.height);
    
    // Blur detected face regions
    for (const region of faceRegions) {
      blurRegion(context, region.x, region.y, region.width, region.height, 15);
    }
    
    console.log(`🔒 Privacy: Blurred ${faceRegions.length} potential face(s)`);
  } catch (error) {
    console.warn('⚠️ Face detection failed:', error);
  }
};

/**
 * Detects and hides license plates in an image
 * Looks for rectangular regions with specific color patterns
 * @param {HTMLCanvasElement} canvas - Canvas with the image
 * @param {CanvasRenderingContext2D} context - Canvas context
 */
export const hideLicensePlates = async (canvas, context) => {
  try {
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Detect potential license plate regions
    const plateRegions = detectLicensePlates(data, canvas.width, canvas.height);
    
    // Blur detected license plate regions
    for (const region of plateRegions) {
      blurRegion(context, region.x, region.y, region.width, region.height, 20);
    }
    
    console.log(`🔒 Privacy: Hid ${plateRegions.length} potential license plate(s)`);
  } catch (error) {
    console.warn('⚠️ License plate detection failed:', error);
  }
};

/**
 * Simple face detection based on skin tone analysis
 * @param {Uint8ClampedArray} data - Image pixel data
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {Array} Array of detected face regions
 */
const detectFaceRegions = (data, width, height) => {
  const regions = [];
  const blockSize = 20; // Size of blocks to analyze
  const skinThreshold = 0.3; // Percentage of skin pixels needed
  
  for (let y = 0; y < height - blockSize; y += blockSize) {
    for (let x = 0; x < width - blockSize; x += blockSize) {
      let skinPixels = 0;
      let totalPixels = 0;
      
      // Analyze block for skin tone
      for (let by = 0; by < blockSize; by++) {
        for (let bx = 0; bx < blockSize; bx++) {
          const pixelIndex = ((y + by) * width + (x + bx)) * 4;
          const r = data[pixelIndex];
          const g = data[pixelIndex + 1];
          const b = data[pixelIndex + 2];
          
          if (isSkinTone(r, g, b)) {
            skinPixels++;
          }
          totalPixels++;
        }
      }
      
      // If block has significant skin tone, consider it a potential face
      if (skinPixels / totalPixels > skinThreshold) {
        // Check for nearby skin regions to form larger face area
        const faceRegion = expandFaceRegion(data, width, height, x, y, blockSize);
        if (faceRegion.width > 30 && faceRegion.height > 30) { // Minimum face size
          regions.push(faceRegion);
        }
      }
    }
  }
  
  return removeDuplicateRegions(regions);
};

/**
 * Detects potential license plate regions
 * @param {Uint8ClampedArray} data - Image pixel data
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {Array} Array of detected plate regions
 */
const detectLicensePlates = (data, width, height) => {
  const regions = [];
  const blockSize = 30;
  
  for (let y = 0; y < height - blockSize; y += blockSize) {
    for (let x = 0; x < width - blockSize; x += blockSize) {
      let lightPixels = 0;
      let darkPixels = 0;
      let totalPixels = 0;
      
      // Analyze block for license plate characteristics (high contrast)
      for (let by = 0; by < blockSize; by++) {
        for (let bx = 0; bx < blockSize; bx++) {
          const pixelIndex = ((y + by) * width + (x + bx)) * 4;
          const r = data[pixelIndex];
          const g = data[pixelIndex + 1];
          const b = data[pixelIndex + 2];
          const brightness = (r + g + b) / 3;
          
          if (brightness > 180) lightPixels++;
          else if (brightness < 80) darkPixels++;
          totalPixels++;
        }
      }
      
      // License plates typically have high contrast (light background, dark text)
      const contrastRatio = (lightPixels + darkPixels) / totalPixels;
      if (contrastRatio > 0.6 && lightPixels > darkPixels) {
        regions.push({
          x: x,
          y: y,
          width: blockSize * 2, // Make blur area larger
          height: blockSize,
          confidence: contrastRatio
        });
      }
    }
  }
  
  return removeDuplicateRegions(regions);
};

/**
 * Checks if RGB values match typical skin tone
 * @param {number} r - Red value
 * @param {number} g - Green value  
 * @param {number} b - Blue value
 * @returns {boolean} Whether the color is likely skin tone
 */
const isSkinTone = (r, g, b) => {
  // Simple skin tone detection algorithm
  return (
    r > 95 && g > 40 && b > 20 &&
    r > g && r > b &&
    Math.abs(r - g) > 15 &&
    r - b > 15
  ) || (
    // Alternative skin tone range
    r > 220 && g > 210 && b > 170 &&
    Math.abs(r - g) <= 15 &&
    r > b && g > b
  );
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
 * Applies blur effect to a specific region
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

/**
 * Removes overlapping regions to avoid duplicate blurs
 * @param {Array} regions - Array of detected regions
 * @returns {Array} Filtered regions without duplicates
 */
const removeDuplicateRegions = (regions) => {
  const filtered = [];
  
  for (const region of regions) {
    let isDuplicate = false;
    
    for (const existing of filtered) {
      if (regionsOverlap(region, existing)) {
        isDuplicate = true;
        break;
      }
    }
    
    if (!isDuplicate) {
      filtered.push(region);
    }
  }
  
  return filtered;
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