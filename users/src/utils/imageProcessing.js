import * as faceapi from 'face-api.js';

class ImageProcessor {
  constructor() {
    this.isInitialized = false;
  }

  // Initialize face-api.js models
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // For now, we'll use a simpler approach without external models
      // This can be enhanced later with proper model loading
      this.isInitialized = true;
      console.log('Image processor initialized');
    } catch (error) {
      console.warn('Could not initialize image processor:', error);
      // Continue without face detection if initialization fails
    }
  }

  // Apply Gaussian blur to a region of the canvas
  applyBlurToRegion(canvas, x, y, width, height, blurAmount = 15) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(x, y, width, height);
    
    // Apply a simple box blur effect
    const blurredImageData = this.boxBlur(imageData, blurAmount);
    ctx.putImageData(blurredImageData, x, y);
  }

  // Simple box blur implementation
  boxBlur(imageData, blurRadius) {
    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        let count = 0;
        
        // Sample pixels in blur radius
        for (let dy = -blurRadius; dy <= blurRadius; dy++) {
          for (let dx = -blurRadius; dx <= blurRadius; dx++) {
            const nx = Math.max(0, Math.min(width - 1, x + dx));
            const ny = Math.max(0, Math.min(height - 1, y + dy));
            const idx = (ny * width + nx) * 4;
            
            r += imageData.data[idx];
            g += imageData.data[idx + 1];
            b += imageData.data[idx + 2];
            a += imageData.data[idx + 3];
            count++;
          }
        }
        
        const idx = (y * width + x) * 4;
        data[idx] = r / count;
        data[idx + 1] = g / count;
        data[idx + 2] = b / count;
        data[idx + 3] = a / count;
      }
    }
    
    return new ImageData(data, width, height);
  }

  // Detect and blur faces using basic skin color detection
  async blurFaces(canvas) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    try {
      // Use simple skin color detection as fallback
      const faceRegions = this.detectSkinRegions(canvas);
      
      console.log(`Detected ${faceRegions.length} potential face regions`);
      
      // Blur each detected face region
      faceRegions.forEach(region => {
        this.applyBlurToRegion(
          canvas, 
          region.x, 
          region.y, 
          region.width, 
          region.height,
          20
        );
      });
      
      return faceRegions.length;
    } catch (error) {
      console.warn('Face detection failed:', error);
      return 0;
    }
  }

  // Simple skin color detection for face detection fallback
  detectSkinRegions(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const regions = [];
    const visited = new Set();
    
    // Scan for skin-colored pixels
    for (let y = 0; y < canvas.height; y += 10) {
      for (let x = 0; x < canvas.width; x += 10) {
        const index = (y * canvas.width + x) * 4;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        
        if (this.isSkinColor(r, g, b) && !visited.has(`${x},${y}`)) {
          const region = this.growSkinRegion(imageData, x, y, visited);
          if (region && this.isLikeFaceRegion(region)) {
            regions.push(region);
          }
        }
      }
    }
    
    return regions;
  }

  // Check if RGB values represent skin color
  isSkinColor(r, g, b) {
    // Simple skin color detection (can be improved)
    return (r > 95 && g > 40 && b > 20) &&
           (Math.max(r, g, b) - Math.min(r, g, b) > 15) &&
           (Math.abs(r - g) > 15) && (r > g) && (r > b);
  }

  // Grow a region of connected skin-colored pixels
  growSkinRegion(imageData, startX, startY, visited) {
    const { width, height, data } = imageData;
    const stack = [{x: startX, y: startY}];
    let minX = startX, maxX = startX, minY = startY, maxY = startY;
    let pixelCount = 0;
    
    while (stack.length > 0 && pixelCount < 500) { // Limit region size
      const {x, y} = stack.pop();
      const key = `${x},${y}`;
      
      if (visited.has(key) || x < 0 || x >= width || y < 0 || y >= height) continue;
      
      const index = (y * width + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      
      if (!this.isSkinColor(r, g, b)) continue;
      
      visited.add(key);
      pixelCount++;
      
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      
      // Add neighboring pixels
      stack.push({x: x+5, y}, {x: x-5, y}, {x, y: y+5}, {x, y: y-5});
    }
    
    if (pixelCount > 20) { // Minimum region size
      return {
        x: Math.max(0, minX - 10),
        y: Math.max(0, minY - 10),
        width: Math.min(width - minX, maxX - minX + 20),
        height: Math.min(height - minY, maxY - minY + 20)
      };
    }
    
    return null;
  }

  // Check if detected region looks like a face
  isLikeFaceRegion(region) {
    const aspectRatio = region.width / region.height;
    // Faces are usually roughly square to slightly tall
    return aspectRatio >= 0.5 && aspectRatio <= 1.5 && 
           region.width >= 30 && region.width <= 200 &&
           region.height >= 30 && region.height <= 250;
  }

  // Detect and blur license plates using basic pattern recognition
  async blurLicensePlates(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Convert to grayscale for better edge detection
    const grayData = this.convertToGrayscale(imageData);
    
    // Find rectangular regions that might be license plates
    const plateRegions = this.findRectangularRegions(grayData, canvas.width, canvas.height);
    
    let blurredCount = 0;
    plateRegions.forEach(region => {
      // Apply blur to potential license plate regions
      this.applyBlurToRegion(canvas, region.x, region.y, region.width, region.height, 25);
      blurredCount++;
    });
    
    console.log(`Blurred ${blurredCount} potential license plate regions`);
    return blurredCount;
  }

  // Convert image data to grayscale
  convertToGrayscale(imageData) {
    const grayData = new Uint8ClampedArray(imageData.width * imageData.height);
    
    for (let i = 0; i < imageData.data.length; i += 4) {
      const gray = Math.round(
        imageData.data[i] * 0.299 +
        imageData.data[i + 1] * 0.587 +
        imageData.data[i + 2] * 0.114
      );
      grayData[i / 4] = gray;
    }
    
    return grayData;
  }

  // Simple edge detection to find rectangular regions (potential license plates)
  findRectangularRegions(grayData, width, height) {
    const regions = [];
    const visited = new Set();
    
    // Look for high contrast rectangular regions
    for (let y = 10; y < height - 50; y += 5) {
      for (let x = 10; x < width - 80; x += 5) {
        if (visited.has(`${x},${y}`)) continue;
        
        const region = this.detectRectangularRegion(grayData, width, height, x, y);
        
        if (region && this.isLikeLicensePlate(region)) {
          regions.push(region);
          
          // Mark this region as visited
          for (let ry = region.y; ry < region.y + region.height; ry += 5) {
            for (let rx = region.x; rx < region.x + region.width; rx += 5) {
              visited.add(`${rx},${ry}`);
            }
          }
        }
      }
    }
    
    return regions;
  }

  // Detect rectangular regions with high contrast (potential license plates)
  detectRectangularRegion(grayData, width, height, startX, startY) {
    const minWidth = 80;
    const minHeight = 20;
    const maxWidth = 300;
    const maxHeight = 100;
    
    // Check for horizontal and vertical edges
    let maxWidth_found = 0;
    let maxHeight_found = 0;
    
    // Find the width of the potential rectangular region
    for (let w = minWidth; w <= maxWidth && startX + w < width; w += 5) {
      if (this.hasVerticalEdge(grayData, width, startX + w, startY, minHeight)) {
        maxWidth_found = w;
      } else {
        break;
      }
    }
    
    // Find the height of the potential rectangular region
    for (let h = minHeight; h <= maxHeight && startY + h < height; h += 5) {
      if (this.hasHorizontalEdge(grayData, width, startX, startY + h, maxWidth_found)) {
        maxHeight_found = h;
      } else {
        break;
      }
    }
    
    if (maxWidth_found >= minWidth && maxHeight_found >= minHeight) {
      return {
        x: startX,
        y: startY,
        width: maxWidth_found,
        height: maxHeight_found
      };
    }
    
    return null;
  }

  // Check for vertical edge (difference in brightness)
  hasVerticalEdge(grayData, width, x, y, height) {
    if (x <= 0 || x >= width - 1) return false;
    
    let edgeStrength = 0;
    for (let dy = 0; dy < height; dy += 2) {
      const leftPixel = grayData[(y + dy) * width + (x - 1)] || 0;
      const rightPixel = grayData[(y + dy) * width + (x + 1)] || 0;
      edgeStrength += Math.abs(leftPixel - rightPixel);
    }
    
    return edgeStrength > (height * 30); // Threshold for edge detection
  }

  // Check for horizontal edge
  hasHorizontalEdge(grayData, width, x, y, regionWidth) {
    if (y <= 0 || y >= width - 1) return false;
    
    let edgeStrength = 0;
    for (let dx = 0; dx < regionWidth; dx += 2) {
      const topPixel = grayData[(y - 1) * width + (x + dx)] || 0;
      const bottomPixel = grayData[(y + 1) * width + (x + dx)] || 0;
      edgeStrength += Math.abs(topPixel - bottomPixel);
    }
    
    return edgeStrength > (regionWidth * 20); // Threshold for edge detection
  }

  // Check if detected region looks like a license plate
  isLikeLicensePlate(region) {
    // License plates are typically wider than they are tall
    const aspectRatio = region.width / region.height;
    
    // License plate aspect ratios are usually between 2:1 and 5:1
    return aspectRatio >= 2.0 && aspectRatio <= 5.0 && 
           region.width >= 80 && region.width <= 300 &&
           region.height >= 20 && region.height <= 100;
  }

  // Main processing function
  async processImage(canvas, options = { blurFaces: true, blurPlates: true }) {
    const results = {
      facesBlurred: 0,
      platesBlurred: 0,
      processingTime: 0
    };
    
    const startTime = Date.now();
    
    try {
      if (options.blurFaces) {
        results.facesBlurred = await this.blurFaces(canvas);
      }
      
      if (options.blurPlates) {
        results.platesBlurred = await this.blurLicensePlates(canvas);
      }
      
      results.processingTime = Date.now() - startTime;
      console.log('Image processing completed:', results);
      
      return results;
    } catch (error) {
      console.error('Image processing failed:', error);
      throw error;
    }
  }
}

// Create singleton instance
const imageProcessor = new ImageProcessor();

export default imageProcessor;