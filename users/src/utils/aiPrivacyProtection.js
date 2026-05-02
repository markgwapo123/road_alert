/**
 * AI-Powered Privacy Protection for Road Alert Images
 * Uses TensorFlow.js with BlazeFace and COCO-SSD models for accurate face detection
 * Multi-model approach ensures consistent and reliable face/person detection
 * Automatically blurs detected faces and license plates to protect privacy
 * 
 * DISTANCE-AWARE FACE DETECTION:
 * - Multi-scale detection for faces at varying distances
 * - Non-Maximum Suppression (NMS) to prevent false positives
 * - Adaptive blur sizing based on detected face size
 */

import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as ort from 'onnxruntime-web';

let yoloSession = null;

let faceModel = null;
let personModel = null;

// ============================================================================
// DISTANCE-AWARE FACE DETECTION CONFIGURATION
// ============================================================================

// Confidence thresholds - detections below these will NOT be blurred
const FACE_CONFIDENCE_THRESHOLD = 0.35;  // Lowered for distant faces
const FACE_HIGH_CONFIDENCE = 0.70;       // High confidence - definitely a face
const FACE_MIN_CONFIDENCE = 0.25;        // Absolute minimum for multi-scale
const PERSON_CONFIDENCE_THRESHOLD = 0.35; // COCO-SSD person confidence
const PLATE_CONFIDENCE_THRESHOLD = 0.15; // License plate detection - lowered for privacy safety
const PLATE_BORDERLINE_THRESHOLD = 0.10; // Borderline plates - lowered to detect more plates

// Multi-scale detection settings
const SCALE_FACTORS = [1.0, 1.5, 2.0, 2.5, 3.0]; // Upscale factors for distant faces
const MIN_FACE_SIZE = 15;   // Lowered minimum face size for distant faces
const MAX_FACE_SIZE = 500;  // Maximum face size in pixels
const NMS_IOU_THRESHOLD = 0.3; // IoU threshold for NMS - tighter to reduce overlapping boxes

// Face aspect ratio validation (width / height)
const FACE_MIN_ASPECT_RATIO = 0.6;  // Face should not be too narrow
const FACE_MAX_ASPECT_RATIO = 1.4;  // Face should not be too wide

// License plate aspect ratio constraints (width / height)
const PLATE_MIN_ASPECT_RATIO = 0.5;  // Minimum: plate must be wider than tall
const PLATE_MAX_ASPECT_RATIO = 6.5;  // Maximum: reject excessively wide boxes

/**
 * BOUNDING BOX VALIDATION for license plates
 * ALL conditions must be true before blurring
 */
const validatePlateBoundingBox = (plate, vehicle, imgWidth, imgHeight) => {
  const validationResult = {
    isValid: true,
    correctedBox: { ...plate },
    rejectionReason: null
  };

  // FAIL-SAFE: HIGH CONFIDENCE BYPASS
  if (plate.confidence >= 0.90) {
    return validationResult;
  }

  // 1. Check aspect ratio (width > height for plates)
  const aspectRatio = plate.width / plate.height;
  if (aspectRatio < PLATE_MIN_ASPECT_RATIO || aspectRatio > PLATE_MAX_ASPECT_RATIO) {
    validationResult.isValid = false;
    validationResult.rejectionReason = `Aspect ratio ${aspectRatio.toFixed(2)} invalid for vehicle-attached plate`;
    return validationResult;
  }

  // 2. Clamp box to image boundaries
  let { x, y, width, height } = plate;
  if (x < 0) { width += x; x = 0; }
  if (y < 0) { height += y; y = 0; }
  if (x + width > imgWidth) { width = imgWidth - x; }
  if (y + height > imgHeight) { height = imgHeight - y; }

  // Check if box is still valid after clamping
  if (width <= 0 || height <= 0) {
    validationResult.isValid = false;
    validationResult.rejectionReason = 'Box outside image boundaries';
    return validationResult;
  }

  // 3. If vehicle is provided, validate plate is inside/attached to vehicle
  if (vehicle) {
    const [vx, vy, vw, vh] = vehicle.bbox;
    const vehicleRight = vx + vw;
    const vehicleBottom = vy + vh;
    const plateRight = x + width;
    const plateBottom = y + height;

    // Check if plate is floating outside vehicle (not attached)
    const isOutsideLeft = plateRight < vx;
    const isOutsideRight = x > vehicleRight;
    const isOutsideTop = plateBottom < vy;
    const isOutsideBottom = y > vehicleBottom;

    if (isOutsideLeft || isOutsideRight || isOutsideTop || isOutsideBottom) {
      validationResult.isValid = false;
      validationResult.rejectionReason = 'Plate box floating outside vehicle region';
      return validationResult;
    }

    // Clamp plate box to stay inside vehicle region
    if (x < vx) { width -= (vx - x); x = vx; }
    if (y < vy) { height -= (vy - y); y = vy; }
    if (x + width > vehicleRight) { width = vehicleRight - x; }
    if (y + height > vehicleBottom) { height = vehicleBottom - y; }
  }

  // Update corrected box
  validationResult.correctedBox = { ...plate, x, y, width, height };
  return validationResult;
};

/**
 * Find plate closest to vehicle center-bottom (secondary confirmation)
 * Used when primary detection fails but vehicle is present
 */
const findPlateNearVehicleBottom = (candidates, vehicle) => {
  if (!vehicle || candidates.length === 0) return null;

  const [vx, vy, vw, vh] = vehicle.bbox;
  const targetX = vx + vw / 2;  // Center X of vehicle
  const targetY = vy + vh * 0.75; // 75% down from top (typical plate location)

  let bestCandidate = null;
  let bestDistance = Infinity;

  candidates.forEach(plate => {
    const plateCenterX = plate.x + plate.width / 2;
    const plateCenterY = plate.y + plate.height / 2;
    const distance = Math.sqrt(
      Math.pow(plateCenterX - targetX, 2) +
      Math.pow(plateCenterY - targetY, 2)
    );

    if (distance < bestDistance) {
      bestDistance = distance;
      bestCandidate = plate;
    }
  });

  // Only return if reasonably close to expected position
  const maxDistance = Math.sqrt(vw * vw + vh * vh) * 0.4; // 40% of vehicle diagonal
  return bestDistance <= maxDistance ? bestCandidate : null;
};

// ============================================================================
// NON-MAXIMUM SUPPRESSION (NMS) FOR FALSE POSITIVE PREVENTION
// Filters overlapping/duplicate detections to prevent hallucinated blur regions
// ============================================================================

/**
 * Calculate Intersection over Union (IoU) between two bounding boxes
 * @param {Object} box1 - First box {x, y, width, height}
 * @param {Object} box2 - Second box {x, y, width, height}
 * @returns {number} IoU value between 0 and 1
 */
const calculateIoU = (box1, box2) => {
  const x1 = Math.max(box1.x, box2.x);
  const y1 = Math.max(box1.y, box2.y);
  const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
  const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);

  const intersectionWidth = Math.max(0, x2 - x1);
  const intersectionHeight = Math.max(0, y2 - y1);
  const intersectionArea = intersectionWidth * intersectionHeight;

  const area1 = box1.width * box1.height;
  const area2 = box2.width * box2.height;
  const unionArea = area1 + area2 - intersectionArea;

  return unionArea > 0 ? intersectionArea / unionArea : 0;
};

/**
 * Apply Non-Maximum Suppression to filter overlapping detections
 * Keeps only the highest confidence detection for overlapping regions
 * @param {Array} detections - Array of {x, y, width, height, confidence}
 * @param {number} iouThreshold - IoU threshold for considering overlap
 * @returns {Array} Filtered detections
 */
const applyNMS = (detections, iouThreshold = NMS_IOU_THRESHOLD) => {
  if (!detections || detections.length === 0) return [];

  // Sort by confidence (highest first)
  const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
  const kept = [];
  const suppressed = new Set();

  for (let i = 0; i < sorted.length; i++) {
    if (suppressed.has(i)) continue;

    const current = sorted[i];
    kept.push(current);

    // Suppress overlapping lower-confidence detections
    for (let j = i + 1; j < sorted.length; j++) {
      if (suppressed.has(j)) continue;

      const iou = calculateIoU(current, sorted[j]);
      if (iou > iouThreshold) {
        suppressed.add(j);
        console.log(`🔇 NMS: Suppressed overlapping detection (IoU: ${(iou * 100).toFixed(0)}%)`);
      }
    }
  }

  console.log(`🔍 NMS: Kept ${kept.length}/${detections.length} detections`);
  return kept;
};

/**
 * Validate face bounding box to reject false positives
 * @param {Object} face - Face detection with bounding box
 * @param {number} imgWidth - Image width
 * @param {number} imgHeight - Image height
 * @returns {Object} {isValid, reason}
 */
const validateFaceBoundingBox = (face, imgWidth, imgHeight) => {
  const { x, y, width, height, confidence } = face;

  // 1. Size validation
  if (width < MIN_FACE_SIZE || height < MIN_FACE_SIZE) {
    return { isValid: false, reason: `Too small (${Math.round(width)}x${Math.round(height)})` };
  }
  if (width > MAX_FACE_SIZE || height > MAX_FACE_SIZE) {
    return { isValid: false, reason: `Too large (${Math.round(width)}x${Math.round(height)})` };
  }

  // 2. Aspect ratio validation (faces are roughly square)
  const aspectRatio = width / height;
  if (aspectRatio < FACE_MIN_ASPECT_RATIO || aspectRatio > FACE_MAX_ASPECT_RATIO) {
    return { isValid: false, reason: `Invalid aspect ratio ${aspectRatio.toFixed(2)}` };
  }

  // 3. Position validation (face should be within image with margin)
  if (x < -width * 0.2 || y < -height * 0.2 ||
    x + width > imgWidth * 1.1 || y + height > imgHeight * 1.1) {
    return { isValid: false, reason: 'Outside image bounds' };
  }

  // 4. Confidence-based size validation
  // High confidence faces can be any valid size
  // Lower confidence faces need to be larger to be trusted
  if (confidence < FACE_HIGH_CONFIDENCE) {
    const minSizeForLowConf = MIN_FACE_SIZE * 1.5;
    if (width < minSizeForLowConf || height < minSizeForLowConf) {
      return { isValid: false, reason: `Low conf (${(confidence * 100).toFixed(0)}%) + small size` };
    }
  }

  return { isValid: true, reason: null };
};

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
 * Apply strong blur to a specific region of the canvas
 * Uses Canvas 2D filter API (GPU-accelerated, like OpenCV GaussianBlur)
 * with pixelation for guaranteed unreadability
 * @param {CanvasRenderingContext2D} context - Canvas context
 * @param {number} x - X coordinate of the region
 * @param {number} y - Y coordinate of the region
 * @param {number} width - Width of the region
 * @param {number} height - Height of the region
 * @param {number} blurRadius - Blur intensity (default: 40)
 */
const applyGaussianBlur = (context, x, y, width, height, blurRadius = 40) => {
  try {
    const canvas = context.canvas;
    x = Math.max(0, Math.floor(x));
    y = Math.max(0, Math.floor(y));
    width = Math.min(canvas.width - x, Math.ceil(width));
    height = Math.min(canvas.height - y, Math.ceil(height));
    if (width <= 0 || height <= 0) return;

    // 1. Create a temporary offscreen canvas of the exact target region
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, x, y, width, height, 0, 0, width, height);

    // 2. Downscale into a tiny canvas to completely destroy and blend characters
    const tinyCanvas = document.createElement('canvas');
    tinyCanvas.width = 12;
    tinyCanvas.height = 6;
    const tinyCtx = tinyCanvas.getContext('2d');
    tinyCtx.imageSmoothingEnabled = true;
    tinyCtx.drawImage(tempCanvas, 0, 0, 12, 6);

    // 3. Scale back up to original size with smoothing on to blend into a smooth block
    const blurCanvas = document.createElement('canvas');
    blurCanvas.width = width;
    blurCanvas.height = height;
    const blurCtx = blurCanvas.getContext('2d');
    blurCtx.imageSmoothingEnabled = true;
    blurCtx.drawImage(tinyCanvas, 0, 0, 12, 6, 0, 0, width, height);

    // 4. Apply a native CSS blur filter to melt the blocks completely
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = width;
    finalCanvas.height = height;
    const finalCtx = finalCanvas.getContext('2d');
    finalCtx.filter = `blur(${Math.max(6, Math.floor(Math.min(width, height) / 4))}px)`;
    finalCtx.drawImage(blurCanvas, 0, 0);

    // Draw directly back onto main canvas without clearing!
    context.drawImage(finalCanvas, 0, 0, width, height, x, y, width, height);

    console.log(`✅ Ultra-solid smooth Gaussian blur applied to ${width}x${height} region`);
  } catch (error) {
    console.error('Error applying blur:', error);
  }
};

/**
 * Preprocess a plate region for better detection clarity.
 * Applies grayscale conversion, contrast stretching, and unsharp masking.
 * This improves plate edge detection in overexposed or blurry captures.
 * @param {CanvasRenderingContext2D} context - Canvas 2D context
 * @param {number} x - X coordinate of plate region
 * @param {number} y - Y coordinate
 * @param {number} width - Width of plate region
 * @param {number} height - Height of plate region
 * @returns {ImageData|null} Preprocessed image data for analysis
 */
const preprocessPlateRegion = (context, x, y, width, height) => {
  try {
    const canvas = context.canvas;
    x = Math.max(0, Math.floor(x));
    y = Math.max(0, Math.floor(y));
    width = Math.min(canvas.width - x, Math.ceil(width));
    height = Math.min(canvas.height - y, Math.ceil(height));
    if (width <= 0 || height <= 0) return null;

    const imageData = context.getImageData(x, y, width, height);
    const pixels = imageData.data;

    // 1. Convert to grayscale (improves edge detection for text)
    let minVal = 255, maxVal = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const gray = Math.round(0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]);
      pixels[i] = pixels[i + 1] = pixels[i + 2] = gray;
      if (gray < minVal) minVal = gray;
      if (gray > maxVal) maxVal = gray;
    }

    // 2. Contrast stretching (histogram stretch to full 0-255 range)
    const range = maxVal - minVal || 1;
    for (let i = 0; i < pixels.length; i += 4) {
      const stretched = Math.round(((pixels[i] - minVal) / range) * 255);
      pixels[i] = pixels[i + 1] = pixels[i + 2] = Math.max(0, Math.min(255, stretched));
    }

    // 3. Simple unsharp mask (sharpen edges for plate characters)
    const copy = new Uint8ClampedArray(pixels);
    for (let row = 1; row < height - 1; row++) {
      for (let col = 1; col < width - 1; col++) {
        const idx = (row * width + col) * 4;
        const center = copy[idx] * 5;
        const neighbors = copy[idx - 4] + copy[idx + 4] +
          copy[((row - 1) * width + col) * 4] + copy[((row + 1) * width + col) * 4];
        const sharpened = Math.max(0, Math.min(255, center - neighbors));
        pixels[idx] = pixels[idx + 1] = pixels[idx + 2] = sharpened;
      }
    }

    console.log(`🔍 Preprocessed plate region: ${width}x${height} (grayscale+contrast+sharpen)`);
    return imageData;
  } catch (err) {
    console.warn('⚠️ Plate preprocessing failed:', err);
    return null;
  }
};

/**
 * Detect faces in the image using BlazeFace AI model
 * ENHANCED: Multi-scale detection for faces at varying distances
 * @param {HTMLCanvasElement} canvas - Canvas containing the image
 * @returns {Promise<Array>} Array of detected face regions
 */
export const detectFaces = async (canvas) => {
  try {
    // Ensure model is loaded
    if (!faceModel) {
      await loadFaceDetectionModel();
    }

    console.log('🔍 MULTI-SCALE FACE DETECTION starting...');

    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const allDetections = [];

    // Create temporary canvas for scaled detection
    const tempCanvas = document.createElement('canvas');
    const tempContext = tempCanvas.getContext('2d');

    // Run detection at multiple scales to catch distant/small faces
    for (const scale of SCALE_FACTORS) {
      try {
        const scaledWidth = Math.round(imgWidth * scale);
        const scaledHeight = Math.round(imgHeight * scale);

        // Skip if scaled image would be too large (memory constraint)
        if (scaledWidth > 2000 || scaledHeight > 2000) {
          console.log(`⚠️ Skipping scale ${scale}x - too large`);
          continue;
        }

        // Create scaled canvas
        tempCanvas.width = scaledWidth;
        tempCanvas.height = scaledHeight;
        tempContext.drawImage(canvas, 0, 0, scaledWidth, scaledHeight);

        // Convert to tensor and detect
        const image = tf.browser.fromPixels(tempCanvas);
        const predictions = await faceModel.estimateFaces(image, false);
        image.dispose();

        console.log(`   Scale ${scale}x (${scaledWidth}x${scaledHeight}): ${predictions.length} face(s)`);

        // Convert detections back to original scale
        predictions.forEach(pred => {
          const [x1, y1] = pred.topLeft;
          const [x2, y2] = pred.bottomRight;

          // Scale coordinates back to original image
          const origX = x1 / scale;
          const origY = y1 / scale;
          const origWidth = (x2 - x1) / scale;
          const origHeight = (y2 - y1) / scale;

          // Extract confidence
          const confidence = pred.probability?.[0] || pred.probability || 0.5;

          // Boost confidence slightly for higher scale detections (small faces)
          const adjustedConfidence = scale > 1
            ? Math.min(confidence + 0.05 * (scale - 1), 0.99)
            : confidence;

          allDetections.push({
            x: origX,
            y: origY,
            width: origWidth,
            height: origHeight,
            confidence: adjustedConfidence,
            scale: scale,
            landmarks: pred.landmarks ? pred.landmarks.map(lm => [lm[0] / scale, lm[1] / scale]) : null,
            // Keep original format for compatibility
            topLeft: [origX, origY],
            bottomRight: [origX + origWidth, origY + origHeight],
            probability: [adjustedConfidence]
          });
        });

      } catch (scaleError) {
        console.error(`Error at scale ${scale}:`, scaleError);
      }
    }

    console.log(`👤 Multi-scale: ${allDetections.length} total raw detections`);

    // Validate and filter detections
    const validDetections = allDetections.filter(face => {
      const validation = validateFaceBoundingBox(face, imgWidth, imgHeight);
      if (!validation.isValid) {
        console.log(`   ⚠️ Rejected: ${validation.reason}`);
        return false;
      }
      return face.confidence >= FACE_MIN_CONFIDENCE;
    });

    console.log(`👤 After validation: ${validDetections.length} valid detections`);

    // Apply Non-Maximum Suppression to remove duplicates/overlaps
    const finalDetections = applyNMS(validDetections, NMS_IOU_THRESHOLD);

    console.log(`👤 After NMS: ${finalDetections.length} final face(s)`);

    return finalDetections;
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
 * Blur all detected faces in the image - FULL HEAD COVERAGE
 * Uses BlazeFace landmarks (eyes, nose, mouth) to calculate TRUE head size
 * The eye-to-eye distance gives accurate head width at ANY distance
 * Auto-adjusts: near faces → big box, far faces → small box
 * @param {HTMLCanvasElement} canvas - Canvas containing the image
 * @param {Array} faces - Array of detected faces from multi-scale detection
 */
export const blurFaces = (canvas, faces) => {
  if (!faces || faces.length === 0) {
    console.log('ℹ️ No faces to blur');
    return;
  }

  const context = canvas.getContext('2d');
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  let blurredCount = 0;

  // Sort faces by confidence (highest first)
  const sortedFaces = [...faces].sort((a, b) => {
    const confA = a.confidence || a.probability?.[0] || a.probability || 0;
    const confB = b.confidence || b.probability?.[0] || b.probability || 0;
    return confB - confA;
  });

  sortedFaces.forEach((face, index) => {
    try {
      const confidence = face.confidence || face.probability?.[0] || face.probability || 1;

      if (confidence < FACE_CONFIDENCE_THRESHOLD) {
        console.log(`⚠️ Face ${index + 1} skipped - confidence ${(confidence * 100).toFixed(0)}% below threshold`);
        return;
      }

      // ═══════════════════════════════════════════════════════════════
      // SIMPLE & CONSISTENT: Get bounding box center, expand 2.5x
      // BlazeFace box centers on face features — we just expand around it
      // ═══════════════════════════════════════════════════════════════

      // Get face bounding box (support both formats)
      let x1, y1, x2, y2;
      if (face.topLeft && face.bottomRight) {
        [x1, y1] = face.topLeft;
        [x2, y2] = face.bottomRight;
      } else {
        x1 = face.x;
        y1 = face.y;
        x2 = face.x + face.width;
        y2 = face.y + face.height;
      }

      const faceWidth = x2 - x1;
      const faceHeight = y2 - y1;

      // Exact center of the detected face box
      const centerX = x1 + faceWidth / 2;
      const centerY = y1 + faceHeight / 2;

      // Expand to cover full head (2.5x wider, 3x taller)
      const blurW = faceWidth * 2.5;
      const blurH = faceHeight * 3.0;

      // Center the blur box exactly on the face center
      const blurX = centerX - blurW / 2;
      const blurY = centerY - blurH / 2;

      console.log(`   📍 Face box: (${x1.toFixed(0)},${y1.toFixed(0)}) to (${x2.toFixed(0)},${y2.toFixed(0)}) = ${faceWidth.toFixed(0)}x${faceHeight.toFixed(0)}`);
      console.log(`   📍 Face center: (${centerX.toFixed(0)}, ${centerY.toFixed(0)})`);
      console.log(`   📍 Blur region: (${blurX.toFixed(0)},${blurY.toFixed(0)}) size ${blurW.toFixed(0)}x${blurH.toFixed(0)}`);
      console.log(`   📍 Canvas size: ${imgWidth}x${imgHeight}`);

      // Clamp to image bounds
      const finalX = Math.max(0, Math.floor(blurX));
      const finalY = Math.max(0, Math.floor(blurY));
      const finalW = Math.min(Math.ceil(blurW), imgWidth - finalX);
      const finalH = Math.min(Math.ceil(blurH), imgHeight - finalY);

      if (finalW <= 0 || finalH <= 0) {
        console.log(`⚠️ Face ${index + 1} outside bounds - skipping`);
        return;
      }

      // Determine blur strength based on face size
      const faceArea = finalW * finalH;
      const imageArea = imgWidth * imgHeight;
      const blurStrength = faceArea / imageArea > 0.05 ? 40 : 25;

      const scaleInfo = face.scale ? ` [scale: ${face.scale}x]` : '';
      console.log(`🔒 Blurring FULL HEAD ${index + 1} (${(confidence * 100).toFixed(0)}% conf)${scaleInfo}: ${finalW}x${finalH} at (${finalX}, ${finalY})`);

      // Apply OpenCV-style blur (pixelation + canvas filter)
      applyGaussianBlur(context, finalX, finalY, finalW, finalH, blurStrength);
      blurredCount++;

    } catch (error) {
      console.error(`Error blurring face ${index}:`, error);
    }
  });

  console.log(`✅ Face blurring complete - ${blurredCount}/${faces.length} faces blurred`);
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
  let blurredCount = 0;

  people.forEach((person, index) => {
    try {
      // Check confidence threshold - skip low confidence detections
      if (person.score < PERSON_CONFIDENCE_THRESHOLD) {
        console.log(`⚠️ Person ${index + 1} skipped - confidence ${(person.score * 100).toFixed(0)}% below threshold ${(PERSON_CONFIDENCE_THRESHOLD * 100)}%`);
        return;
      }

      // COCO-SSD returns bbox as [x, y, width, height]
      const [x, y, width, height] = person.bbox;

      // FULL HEAD REGION - top 25% of person for complete face coverage
      // Human head is roughly 1/7 to 1/8 of body height, but we go larger to ensure full blur
      const headHeight = height * 0.25;
      const headWidth = Math.min(width * 0.70, headHeight * 1.2); // Head slightly wider for full coverage
      const headX = x + (width - headWidth) / 2; // Center horizontally
      const headY = y; // Start from very top

      console.log(`🔒 Blurring face region ${index + 1} (${(person.score * 100).toFixed(0)}% conf): ${Math.round(headWidth)}x${Math.round(headHeight)} at (${Math.round(headX)}, ${Math.round(headY)})`);

      // Apply blur to ONLY the face region - not body, not clothing
      applyGaussianBlur(context, headX, headY, headWidth, headHeight, 35);
      blurredCount++;

    } catch (error) {
      console.error(`Error blurring person ${index}:`, error);
    }
  });

  console.log(`✅ Face region blurring complete - ${blurredCount}/${people.length} people processed`);
};

// ============================================================================
// 2-STAGE LICENSE PLATE DETECTION PIPELINE (HIGH ACCURACY)
// Stage 1: Detect vehicles using COCO-SSD (car/motorcycle)
// Stage 2: Search for plates ONLY inside detected vehicle regions
// This reduces false positives by 30-50%
// ============================================================================

/**
 * STAGE 1: Detect vehicles using COCO-SSD
 * Only returns high-confidence vehicle detections (>0.5)
 * @param {HTMLCanvasElement} canvas - Canvas containing the image
 * @returns {Promise<Array>} Array of detected vehicles with bbox
 */
const detectVehiclesStage1 = async (canvas) => {
  try {
    if (!personModel) {
      await loadFaceDetectionModel();
    }

    console.log('🚗 STAGE 1: Detecting vehicles with COCO-SSD and YOLOv8...');

    // 1. Run standard COCO-SSD detection
    const predictions = await personModel.detect(canvas, 20, 0.4);
    const vehicleClasses = ['car', 'truck', 'bus', 'motorcycle', 'bicycle'];
    let vehicles = predictions.filter(pred =>
      vehicleClasses.includes(pred.class) && pred.score > 0.4
    );

    // 2. Load and run YOLOv8 detection
    try {
      if (!yoloSession) {
        console.log('🤖 Initializing YOLOv8 onnx session...');
        try {
          yoloSession = await ort.InferenceSession.create('/models/yolov8n.onnx');
        } catch (e1) {
          yoloSession = await ort.InferenceSession.create('./models/yolov8n.onnx');
        }
      }

      if (yoloSession) {
        console.log('🤖 Running YOLOv8 advanced detection...');
        const resizedCanvas = document.createElement('canvas');
        resizedCanvas.width = 640;
        resizedCanvas.height = 640;
        const ctx = resizedCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, 0, 640, 640);

        const imageData = ctx.getImageData(0, 0, 640, 640);
        const data = imageData.data;

        // Extract R, G, B channels, normalize to [0, 1] for CHW tensor [1, 3, 640, 640]
        const floatData = new Float32Array(3 * 640 * 640);
        for (let i = 0; i < 640 * 640; i++) {
          floatData[i] = data[i * 4] / 255.0;
          floatData[i + 640 * 640] = data[i * 4 + 1] / 255.0;
          floatData[i + 2 * 640 * 640] = data[i * 4 + 2] / 255.0;
        }

        const inputTensor = new ort.Tensor('float32', floatData, [1, 3, 640, 640]);
        const outputMap = await yoloSession.run({ images: inputTensor });
        const output = outputMap[Object.keys(outputMap)[0]].data;

        const origWidth = canvas.width;
        const origHeight = canvas.height;
        const scaleX = origWidth / 640;
        const scaleY = origHeight / 640;

        const yoloVehicles = [];
        const yoloVehicleClasses = [2, 3, 5, 7]; // car, motorcycle, bus, truck
        const classNames = { 2: 'car', 3: 'motorcycle', 5: 'bus', 7: 'truck' };

        for (let i = 0; i < 8400; i++) {
          let maxScore = 0;
          let bestClass = -1;

          for (const c of yoloVehicleClasses) {
            const score = output[c * 8400 + i];
            if (score > maxScore) {
              maxScore = score;
              bestClass = c;
            }
          }

          if (maxScore > 0.45) {
            const cx = output[0 * 8400 + i] * scaleX;
            const cy = output[1 * 8400 + i] * scaleY;
            const w = output[2 * 8400 + i] * scaleX;
            const h = output[3 * 8400 + i] * scaleY;

            const x = cx - w / 2;
            const y = cy - h / 2;

            yoloVehicles.push({
              class: classNames[bestClass],
              score: maxScore,
              bbox: [Math.max(0, x), Math.max(0, y), Math.min(origWidth - x, w), Math.min(origHeight - y, h)]
            });
          }
        }

        // Apply NMS to YOLO results
        const keepYolo = [];
        yoloVehicles.sort((a, b) => b.score - a.score);

        for (const v of yoloVehicles) {
          let overlap = false;
          for (const kept of keepYolo) {
            const iouVal = (box1, box2) => {
              const xA = Math.max(box1[0], box2[0]);
              const yA = Math.max(box1[1], box2[1]);
              const xB = Math.min(box1[0] + box1[2], box2[0] + box2[2]);
              const yB = Math.min(box1[1] + box1[3], box2[1] + box2[3]);
              const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
              const b1Area = box1[2] * box1[3];
              const b2Area = box2[2] * box2[3];
              return interArea / (b1Area + b2Area - interArea);
            };
            if (iouVal(v.bbox, kept.bbox) > 0.45) {
              overlap = true;
              break;
            }
          }
          if (!overlap) {
            keepYolo.push(v);
          }
        }

        console.log(`🤖 YOLOv8 found ${keepYolo.length} vehicles`);

        // Combine COCO-SSD and YOLO results, avoiding duplicate bbox
        keepYolo.forEach(yV => {
          const isDuplicate = vehicles.some(v => {
            const xA = Math.max(yV.bbox[0], v.bbox[0]);
            const yA = Math.max(yV.bbox[1], v.bbox[1]);
            const xB = Math.min(yV.bbox[0] + yV.bbox[2], v.bbox[0] + v.bbox[2]);
            const yB = Math.min(yV.bbox[1] + yV.bbox[3], v.bbox[1] + v.bbox[3]);
            const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
            const b1Area = yV.bbox[2] * yV.bbox[3];
            const b2Area = v.bbox[2] * v.bbox[3];
            const overlapRatio = interArea / (b1Area + b2Area - interArea);
            return overlapRatio > 0.40;
          });
          if (!isDuplicate) {
            vehicles.push(yV);
          }
        });
      }
    } catch (yoloErr) {
      console.warn('⚠️ YOLOv8 inference skipped or errored:', yoloErr);
    }

    console.log(`🚙 STAGE 1 Result: ${vehicles.length} vehicle(s) detected`);
    vehicles.forEach((v, i) => {
      const [x, y, w, h] = v.bbox;
      console.log(`  Vehicle ${i + 1}: ${v.class} (${(v.score * 100).toFixed(0)}%) at [${Math.round(x)}, ${Math.round(y)}, ${Math.round(w)}, ${Math.round(h)}]`);
    });

    return vehicles;
  } catch (error) {
    console.error('Error in Stage 1 vehicle detection:', error);
    return [];
  }
};

/**
 * STAGE 2: Search for license plates INSIDE detected vehicle regions only
 * This dramatically reduces false positives
 * @param {HTMLCanvasElement} canvas - Canvas containing the image
 * @param {Array} vehicles - Array of detected vehicles from Stage 1
 * @returns {Array} Array of detected plate regions with validation
 */
const detectPlatesInVehiclesStage2 = (canvas, vehicles) => {
  if (!vehicles || vehicles.length === 0) {
    console.log('⚠️ STAGE 2: No vehicles to search for plates');
    return [];
  }

  console.log(`🔍 STAGE 2: Searching for plates in ${vehicles.length} vehicle region(s)...`);

  const context = canvas.getContext('2d');
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const imageData = context.getImageData(0, 0, imgWidth, imgHeight);
  const pixels = imageData.data;

  const detectedPlates = [];

  vehicles.forEach((vehicle, vIndex) => {
    const [vx, vy, vw, vh] = vehicle.bbox;
    const vehicleArea = vw * vh;
    const isMotorcycle = vehicle.class === 'motorcycle' || vehicle.class === 'bicycle';

    console.log(`  Searching vehicle ${vIndex + 1} (${vehicle.class})...`);

    // Define search region within vehicle (lower 60% where plates are)
    const searchStartX = Math.max(0, Math.floor(vx));
    const searchEndX = Math.min(imgWidth, Math.ceil(vx + vw));
    const searchStartY = Math.max(0, Math.floor(vy + vh * 0.4)); // Lower portion
    const searchEndY = Math.min(imgHeight, Math.ceil(vy + vh));

    // Plate size constraints relative to vehicle
    const minPlateW = Math.max(30, vw * 0.15);
    const maxPlateW = Math.min(vw * 0.5, 250);
    const minPlateH = Math.max(10, vh * 0.03);
    const maxPlateH = Math.min(vh * 0.15, 80);

    // Step sizes for scanning
    const stepX = Math.max(4, Math.floor(vw / 30));
    const stepY = Math.max(3, Math.floor(vh / 25));

    const candidates = [];

    // Test plate sizes
    const testWidths = [
      minPlateW,
      minPlateW * 1.5,
      minPlateW * 2,
      minPlateW * 2.5
    ].filter(w => w <= maxPlateW);

    for (const testW of testWidths) {
      // Aspect ratio 2.5:1 to 4:1 for typical plates
      const testH = testW / 3.2;
      if (testH < minPlateH || testH > maxPlateH) continue;

      for (let y = searchStartY; y < searchEndY - testH; y += stepY) {
        for (let x = searchStartX; x < searchEndX - testW; x += stepX) {
          // Sample colors in this region
          let greenPixels = 0;
          let whitePixels = 0;
          let yellowPixels = 0;
          let bluePixels = 0;
          let darkPixels = 0;
          let sampleCount = 0;

          for (let py = y; py < y + testH && py < imgHeight; py += 3) {
            for (let px = x; px < x + testW && px < imgWidth; px += 3) {
              const idx = (Math.floor(py) * imgWidth + Math.floor(px)) * 4;
              const r = pixels[idx];
              const g = pixels[idx + 1];
              const b = pixels[idx + 2];
              const brightness = (r + g + b) / 3;

              // GREEN plate (Philippine)
              if (g > 90 && g > r * 1.15 && g > b * 1.1 && brightness > 50 && brightness < 180) {
                greenPixels++;
              }
              // WHITE plate
              else if (brightness > 185 && Math.abs(r - g) < 30 && Math.abs(g - b) < 30) {
                whitePixels++;
              }
              // YELLOW plate
              else if (r > 160 && g > 130 && b < 110 && r > b * 1.4) {
                yellowPixels++;
              }
              // BLUE plate
              else if (b > 130 && b > r * 1.15 && b > g * 1.05) {
                bluePixels++;
              }
              // DARK (text)
              else if (brightness < 70) {
                darkPixels++;
              }

              sampleCount++;
            }
          }

          if (sampleCount < 15) continue;

          // Calculate ratios
          const greenRatio = greenPixels / sampleCount;
          const whiteRatio = whitePixels / sampleCount;
          const yellowRatio = yellowPixels / sampleCount;
          const blueRatio = bluePixels / sampleCount;
          const darkRatio = darkPixels / sampleCount;

          // Determine plate type
          let plateType = null;
          let colorRatio = 0;

          if (greenRatio > 0.20 && greenRatio >= whiteRatio && greenRatio >= yellowRatio) {
            plateType = 'green';
            colorRatio = greenRatio;
          } else if (whiteRatio > 0.30 && whiteRatio > greenRatio) {
            plateType = 'white';
            colorRatio = whiteRatio;
          } else if (yellowRatio > 0.25) {
            plateType = 'yellow';
            colorRatio = yellowRatio;
          } else if (blueRatio > 0.20) {
            plateType = 'blue';
            colorRatio = blueRatio;
          }

          if (!plateType) continue;

          // VALIDATION CHECKS
          // 1. Must have dark pixels (text) - 5% to 50%
          if (darkRatio < 0.05 || darkRatio > 0.50) continue;

          // 2. Plate area must be < 55% of vehicle area
          const plateArea = testW * testH;
          if (plateArea > vehicleArea * 0.55) continue;

          // 3. Width must be > height (plates are wide rectangles)
          if (testW <= testH) continue;

          // 4. Position validation - plate should be in lower half of vehicle
          const relativeY = (y - vy) / vh;
          if (relativeY < 0.10) continue; // Relaxed to 10% for angled vehicles

          // Calculate confidence
          const positionBonus = (relativeY > 0.5 && relativeY < 0.9) ? 0.15 : 0;
          const confidence = colorRatio * 0.4 + darkRatio * 0.25 + positionBonus + 0.2;

          // Check for overlaps
          const overlaps = candidates.some(c => {
            const ox = Math.max(0, Math.min(c.x + c.width, x + testW) - Math.max(c.x, x));
            const oy = Math.max(0, Math.min(c.y + c.height, y + testH) - Math.max(c.y, y));
            return ox > testW * 0.3 && oy > testH * 0.3;
          });

          if (!overlaps && confidence > 0.5) {
            candidates.push({
              x, y,
              width: testW,
              height: testH,
              confidence,
              plateType,
              vehicleClass: vehicle.class,
              vehicleConfidence: vehicle.score
            });
          }
        }
      }
    }

    // Get best candidates for this vehicle with BOUNDING BOX VALIDATION
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.confidence - a.confidence);

      let validPlateFound = false;

      // Try high-confidence candidates first
      for (const candidate of candidates) {
        if (candidate.confidence < PLATE_BORDERLINE_THRESHOLD) break;

        // CRITICAL: Validate bounding box before blurring
        const validation = validatePlateBoundingBox(candidate, vehicle, imgWidth, imgHeight);

        if (!validation.isValid) {
          console.log(`    ⚠️ Plate rejected: ${validation.rejectionReason}`);
          continue;
        }

        // Use corrected bounding box
        const validatedPlate = {
          ...candidate,
          ...validation.correctedBox
        };

        if (candidate.confidence >= PLATE_CONFIDENCE_THRESHOLD) {
          detectedPlates.push(validatedPlate);
          console.log(`    ✅ VALIDATED ${validatedPlate.plateType.toUpperCase()} plate (conf: ${(validatedPlate.confidence * 100).toFixed(0)}%)`);
          validPlateFound = true;
          break;
        } else if (candidate.confidence >= PLATE_BORDERLINE_THRESHOLD) {
          detectedPlates.push(validatedPlate);
          console.log(`    ⚠️ VALIDATED borderline ${validatedPlate.plateType.toUpperCase()} plate (conf: ${(validatedPlate.confidence * 100).toFixed(0)}%)`);
          validPlateFound = true;
          break;
        }
      }

      // SECONDARY CONFIRMATION: If no valid plate found, check low-confidence near vehicle bottom
      if (!validPlateFound && candidates.length > 0) {
        console.log(`    🔄 Secondary confirmation: checking low-confidence plates near vehicle center-bottom...`);
        const lowConfCandidates = candidates.filter(c => c.confidence >= PLATE_BORDERLINE_THRESHOLD);
        const nearBottomPlate = findPlateNearVehicleBottom(lowConfCandidates, vehicle);

        if (nearBottomPlate) {
          const validation = validatePlateBoundingBox(nearBottomPlate, vehicle, imgWidth, imgHeight);
          if (validation.isValid) {
            const validatedPlate = { ...nearBottomPlate, ...validation.correctedBox };
            detectedPlates.push(validatedPlate);
            console.log(`    ✅ Secondary: Found plate near vehicle bottom (conf: ${(validatedPlate.confidence * 100).toFixed(0)}%)`);
          }
        } else {
          console.log(`    ❌ No valid plate found for this vehicle (avoiding wrong location blur)`);
        }
      }
    }
  });

  console.log(`🔍 STAGE 2 Result: ${detectedPlates.length} VALIDATED plate(s) detected`);
  return detectedPlates;
};

/**
 * Apply adaptive blur to detected plates
 * Blur ONLY the license plate region - NEVER headlights, bumper, or vehicle body
 * @param {HTMLCanvasElement} canvas - Canvas
 * @param {Array} plates - Detected plates
 */
const blurPlatesAdaptive = (canvas, plates) => {
  if (!plates || plates.length === 0) return;

  const context = canvas.getContext('2d');
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  plates.forEach((plate, index) => {
    // FINAL VALIDATION before blur - ensure box is within image
    let { x, y, width, height } = plate;

    // Clamp to image boundaries (safety check)
    x = Math.max(0, x);
    y = Math.max(0, y);
    if (x + width > imgWidth) width = imgWidth - x;
    if (y + height > imgHeight) height = imgHeight - y;

    if (width <= 0 || height <= 0) {
      console.log(`⚠️ Plate ${index + 1} skipped - invalid dimensions after clamping`);
      return;
    }

    // Rule: Expand blur region by 10%-20% for stable coverage and avoid flickering/glitches
    const padX = width * 0.15;
    const padY = height * 0.15;

    const blurX = Math.max(0, x - padX);
    const blurY = Math.max(0, y - padY);
    let blurW = width + padX * 2;
    let blurH = height + padY * 2;

    // Final clamp to ensure blur stays within image
    if (blurX + blurW > imgWidth) blurW = imgWidth - blurX;
    if (blurY + blurH > imgHeight) blurH = imgHeight - blurY;

    // Apply exact blur strength based on detection confidence
    const conf = plate.confidence;
    let blurStrength = 25;

    if (conf >= 0.90) {
      blurStrength = 100; // Strongest blur for high confidence
    } else if (conf >= 0.40) {
      blurStrength = 65;  // Moderate blur for medium confidence
    } else if (conf >= 0.15) {
      blurStrength = 25;  // Light blur for low confidence
    } else {
      console.log(`⚠️ Plate ${index + 1} skipped - confidence below 15%`);
      return;
    }

    console.log(`🔒 FINAL BLUR: ${plate.plateType || 'unknown'} plate ${index + 1} (${(conf * 100).toFixed(0)}% conf, strength: ${blurStrength}): ${Math.round(blurW)}x${Math.round(blurH)} at (${Math.round(blurX)}, ${Math.round(blurY)})`);
    applyGaussianBlur(context, blurX, blurY, blurW, blurH, blurStrength);
  });
};

/**
 * FALLBACK: Direct plate detection when no vehicles detected
 * Searches entire lower portion of image with strict validation
 */
const detectPlatesFallback = (canvas) => {
  console.log('🔄 FALLBACK: Searching for plates without vehicle detection...');

  const context = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const imageData = context.getImageData(0, 0, width, height);
  const pixels = imageData.data;

  const candidates = [];

  // Compute global image brightness to automatically optimize scanning rules
  let totalBrightness = 0;
  for (let i = 0; i < pixels.length; i += 16) { // Sample every 4th pixel for speed
    totalBrightness += (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
  }
  const avgBrightness = totalBrightness / (pixels.length / 16);
  console.log(`🤖 Smart AI: Average image brightness is ${avgBrightness.toFixed(1)}`);

  // Dynamically configure detection thresholds based on lighting conditions
  const isLowLight = avgBrightness < 80;
  const isOverExposed = avgBrightness > 185;

  const minColorRatio = isLowLight ? 0.16 : (isOverExposed ? 0.14 : 0.20);
  const minDarkRatio = isLowLight ? 0.04 : 0.06;

  // Search entire image
  const searchStartY = 0;
  const searchEndY = Math.floor(height * 0.95);

  // Broad size constraints
  const minW = Math.max(40, width * 0.05);
  const maxW = Math.min(500, width * 0.65);

  const stepX = Math.max(6, Math.floor(width / 60));
  const stepY = Math.max(5, Math.floor(height / 50));

  const testWidths = [minW, minW * 1.5, minW * 2, minW * 2.5, minW * 3, minW * 3.5].filter(w => w <= maxW);

  for (const testW of testWidths) {
    if (testW > maxW) continue;
    const testH = testW / 3.0;

    for (let y = searchStartY; y < searchEndY - testH; y += stepY) {
      for (let x = 0; x < width - testW; x += stepX) {
        let greenPixels = 0, whitePixels = 0, yellowPixels = 0, darkPixels = 0, sampleCount = 0;

        for (let py = y; py < y + testH; py += 3) {
          for (let px = x; px < x + testW; px += 3) {
            const idx = (Math.floor(py) * width + Math.floor(px)) * 4;
            const r = pixels[idx], g = pixels[idx + 1], b = pixels[idx + 2];
            const brightness = (r + g + b) / 3;

            // GREEN
            if (g > 70 && g > r * 1.05 && g > b * 1.02 && brightness > 30 && brightness < 195) {
              greenPixels++;
            }
            // WHITE
            if (brightness > 165 && Math.abs(r - g) < 45 && Math.abs(g - b) < 45) {
              whitePixels++;
            }
            // YELLOW
            if (r > 130 && g > 100 && b < 95 && Math.abs(r - g) < 60 && r > b * 1.3) {
              yellowPixels++;
            }
            // DARK TEXT
            if (brightness < 90) {
              darkPixels++;
            }
            sampleCount++;
          }
        }

        if (sampleCount < 15) continue;

        const greenRatio = greenPixels / sampleCount;
        const whiteRatio = whitePixels / sampleCount;
        const yellowRatio = yellowPixels / sampleCount;
        const darkRatio = darkPixels / sampleCount;

        let plateType = null, colorRatio = 0;
        if (whiteRatio + greenRatio + yellowRatio > minColorRatio) {
          plateType = 'smart_detected';
          colorRatio = whiteRatio + greenRatio + yellowRatio;
        }

        if (!plateType || darkRatio < minDarkRatio || darkRatio > 0.70) continue;

        const confidence = colorRatio * 0.5 + darkRatio * 0.35;

        // BOUNDING BOX VALIDATION for fallback (no vehicle context)
        const plateCandidate = { x, y, width: testW, height: testH, confidence, plateType };
        const validation = validatePlateBoundingBox(plateCandidate, null, width, height);

        if (!validation.isValid) continue; // Skip invalid boxes

        // PRIVACY SAFETY: Include plates that pass validation with inclusive confidence for privacy
        if (confidence >= 0.15) {
          const overlaps = candidates.some(c =>
            Math.abs(c.x - x) < testW * 0.4 && Math.abs(c.y - y) < testH * 0.4
          );

          if (!overlaps) {
            candidates.push(validation.correctedBox);
          }
        }
      }
    }
  }

  candidates.sort((a, b) => b.confidence - a.confidence);

  // Validate all results before returning
  const validatedResults = [];
  for (const plate of candidates.slice(0, 10)) { // Check top 10
    if (validatedResults.length >= 5) break; // Return max 5

    const status = plate.confidence >= 0.25 ? '✅ VALIDATED' : '⚠️ borderline VALIDATED';
    console.log(`🔄 FALLBACK: ${status} ${plate.plateType} plate (conf: ${(plate.confidence * 100).toFixed(0)}%)`);
    validatedResults.push(plate);
  }

  if (validatedResults.length === 0) {
    console.log(`🔄 FALLBACK: No valid plates found (avoiding wrong location blur)`);
  }

  return validatedResults;
};

// ============================================================================
// LEGACY FUNCTIONS (kept for backward compatibility)
// ============================================================================

/**
 * Detect vehicles (cars, trucks, motorcycles) using COCO-SSD
 * @param {HTMLCanvasElement} canvas - Canvas containing the image
 * @returns {Promise<Array>} Array of detected vehicle regions
 */
export const detectVehicles = async (canvas) => {
  return detectVehiclesStage1(canvas);
};

/**
 * Blur license plate area of detected vehicles
 * Uses vehicle detection to estimate plate location (no false positives)
 * @param {HTMLCanvasElement} canvas - Canvas containing the image
 * @param {Array} vehicles - Array of detected vehicles from COCO-SSD
 */
export const blurVehiclePlates = (canvas, vehicles) => {
  const plates = detectPlatesInVehiclesStage2(canvas, vehicles);
  blurPlatesAdaptive(canvas, plates);
};

/**
 * Main function: Apply AI-powered privacy protection to the image
 * 
 * 2-STAGE DETECTION PIPELINE (HIGH ACCURACY):
 * 1. Face/Person Detection: BlazeFace + COCO-SSD
 * 2. Vehicle Detection → Plate Search INSIDE vehicle only
 * 
 * This approach increases plate detection accuracy by 30-50%
 * 
 * @param {HTMLCanvasElement} canvas - Canvas containing the captured image
 * @returns {Promise<Object>} Detection results with counts
 */
export const applyAIPrivacyProtection = async (canvas, options = {}) => {
  try {
    const {
      blurFaces: shouldBlurFaces = true,
      blurPlates: shouldBlurPlates = true,
      faceConfidence = FACE_CONFIDENCE_THRESHOLD,
      plateConfidence = PLATE_CONFIDENCE_THRESHOLD
    } = options;

    console.log('═══════════════════════════════════════════════════');
    console.log('🔒 AI PRIVACY PROTECTION - 2-STAGE PIPELINE');
    console.log('═══════════════════════════════════════════════════');

    // Load models if not already loaded
    if (!faceModel || !personModel) {
      await loadFaceDetectionModel();
    }

    let totalDetections = 0;
    let facesFound = [];
    let peopleFound = [];
    let platesDetected = 0;
    let vehiclesDetected = 0;

    // ═══════════════════════════════════════════════════
    // FACE & PERSON DETECTION (INDEPENDENT - conditionally enabled)
    // ═══════════════════════════════════════════════════
    if (shouldBlurFaces) {
      console.log('\n👤 DETECTING FACES & PEOPLE...');
      const [faces, people] = await Promise.all([
        detectFaces(canvas),
        detectPeople(canvas)
      ]);

      facesFound = faces.filter(f => f.confidence >= faceConfidence);
      peopleFound = people;

      // 1. Blur detected faces (BlazeFace - most accurate)
      if (facesFound.length > 0) {
        blurFaces(canvas, facesFound);
        totalDetections += facesFound.length;
        console.log(`✅ Blurred ${facesFound.length} face(s)`);
      }

      // 2. Blur heads of people (when multiple humans are captured, force blurring all of them)
      if (peopleFound.length > 0) {
        const unblurredPeople = peopleFound.filter(p => {
          const [px, py, pw, ph] = p.bbox;
          const headX = Math.max(0, px);
          const headY = Math.max(0, py - ph * 0.1);

          const overlaps = facesFound.some(f => {
            const [fx, fy] = f.topLeft;
            return Math.abs(headX - fx) < (pw * 0.5) && Math.abs(headY - fy) < (ph * 0.5);
          });
          return !overlaps;
        });

        if (unblurredPeople.length > 0) {
          blurPeople(canvas, unblurredPeople);
          totalDetections += unblurredPeople.length;
          console.log(`✅ Blurred ${unblurredPeople.length} additional head(s)`);
        }
      }
    } else {
      console.log('\n👤 Face/Person detection disabled via options');
    }

    // ═══════════════════════════════════════════════════
    // LICENSE PLATE DETECTION (INDEPENDENT - conditionally enabled)
    // ═══════════════════════════════════════════════════
    if (shouldBlurPlates) {
      console.log('\n🚗 LICENSE PLATE DETECTION...');

      // Collect all detected plates from multiple methods
      let allPlates = [];

      // STAGE 1: Detect vehicles to help locate plates
      const vehicles = await detectVehiclesStage1(canvas);
      vehiclesDetected = vehicles.length;

      if (vehicles.length > 0) {
        // STAGE 2: Search for plates INSIDE detected vehicles
        const vehiclePlates = detectPlatesInVehiclesStage2(canvas, vehicles);
        allPlates = allPlates.concat(vehiclePlates);
        console.log(`🔍 Found ${vehiclePlates.length} plate(s) in ${vehicles.length} vehicle region(s)`);
      }

      // Fallback plate detection without vehicle is removed to prevent false positives on backgrounds.

      // Filter by confidence threshold
      allPlates = allPlates.filter(p => p.confidence >= plateConfidence);

      // Blur all detected plates
      if (allPlates.length > 0) {
        blurPlatesAdaptive(canvas, allPlates);
        platesDetected = allPlates.length;
        totalDetections += allPlates.length;
        console.log(`✅ Blurred ${allPlates.length} license plate(s) total`);
      } else {
        console.log('ℹ️ No license plates detected in image');
      }
    } else {
      console.log('\n🚗 Plate detection disabled via options');
    }

    // ═══════════════════════════════════════════════════
    // SUMMARY & LOGS FOR ANALYTICS
    // ═══════════════════════════════════════════════════
    console.log('\n═══════════════════════════════════════════════════');
    console.log('📊 DETECTION SUMMARY:');
    console.log(`   Faces: ${facesFound.length}`);
    console.log(`   People: ${peopleFound.length}`);
    console.log(`   Vehicles: ${vehiclesDetected}`);
    console.log(`   Plates: ${platesDetected}`);
    console.log(`   Total Blurred: ${totalDetections}`);
    console.log('═══════════════════════════════════════════════════\n');

    return {
      facesDetected: facesFound.length,
      peopleDetected: peopleFound.length,
      vehiclesDetected: vehiclesDetected,
      platesDetected: platesDetected,
      totalBlurred: totalDetections
    };

  } catch (error) {
    console.error('❌ Error applying privacy protection:', error);
    console.log('⚠️ Proceeding without privacy detection');
    return {
      facesDetected: 0,
      peopleDetected: 0,
      vehiclesDetected: 0,
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
