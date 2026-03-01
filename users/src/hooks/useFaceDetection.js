/**
 * Custom Hook for Face Detection
 * Uses TensorFlow.js BlazeFace model to detect faces in images
 * Returns face bounding boxes for positioning blur overlays
 * 
 * MULTI-SCALE DETECTION: Detects faces at varying distances
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';

// Configuration
const MIN_CONFIDENCE = 0.55; // Lowered for distant faces
const MODEL_LOAD_TIMEOUT = 30000; // 30 seconds timeout for model loading

// Multi-scale detection settings - higher scales detect smaller/distant faces
const SCALE_FACTORS = [1.0, 1.5, 2.0, 2.5, 3.0]; // Upscale for distant/small faces
const NMS_IOU_THRESHOLD = 0.3; // IoU threshold for removing duplicates

let globalModel = null;
let modelLoadPromise = null;

/**
 * Calculate IoU between two boxes
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
 * Apply Non-Maximum Suppression to remove duplicate detections
 */
const applyNMS = (detections, iouThreshold = NMS_IOU_THRESHOLD) => {
  if (!detections || detections.length === 0) return [];

  const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
  const kept = [];
  const suppressed = new Set();

  for (let i = 0; i < sorted.length; i++) {
    if (suppressed.has(i)) continue;
    const current = sorted[i];
    kept.push(current);

    for (let j = i + 1; j < sorted.length; j++) {
      if (suppressed.has(j)) continue;
      const iou = calculateIoU(current, sorted[j]);
      if (iou > iouThreshold) {
        suppressed.add(j);
      }
    }
  }

  return kept;
};

/**
 * Load BlazeFace model (singleton pattern)
 */
const loadModel = async () => {
  if (globalModel) return globalModel;
  
  if (modelLoadPromise) return modelLoadPromise;
  
  modelLoadPromise = (async () => {
    try {
      console.log('🤖 Loading BlazeFace model for face detection...');
      const model = await blazeface.load();
      globalModel = model;
      console.log('✅ BlazeFace model loaded successfully');
      return model;
    } catch (error) {
      console.error('❌ Failed to load BlazeFace model:', error);
      modelLoadPromise = null;
      throw error;
    }
  })();
  
  return modelLoadPromise;
};

/**
 * Preload the face detection model
 */
export const preloadFaceDetectionModel = async () => {
  try {
    await loadModel();
    return true;
  } catch {
    return false;
  }
};

/**
 * Custom hook for face detection
 * @param {string} imageSrc - Image source URL or data URL
 * @param {Object} options - Configuration options
 * @returns {Object} - { faces, isLoading, error, detectFaces }
 */
export const useFaceDetection = (imageSrc, options = {}) => {
  const {
    autoDetect = true,
    minConfidence = MIN_CONFIDENCE,
    blurLargestOnly = true,
  } = options;

  const [faces, setFaces] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modelReady, setModelReady] = useState(false);
  
  const imageRef = useRef(null);
  const canvasRef = useRef(null);

  // Load model on mount
  useEffect(() => {
    const initModel = async () => {
      try {
        await loadModel();
        setModelReady(true);
      } catch (err) {
        setError('Failed to load face detection model');
      }
    };
    initModel();
  }, []);

  /**
   * Detect faces in the provided image using MULTI-SCALE detection
   * This improves detection of distant/smaller faces
   */
  const detectFaces = useCallback(async (imgSrc) => {
    const sourceImage = imgSrc || imageSrc;
    if (!sourceImage || !modelReady) {
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      const model = await loadModel();
      
      // Create image element
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = sourceImage;
      });

      imageRef.current = img;

      // Create canvas for detection
      const canvas = document.createElement('canvas');
      const imgWidth = img.naturalWidth || img.width;
      const imgHeight = img.naturalHeight || img.height;
      canvas.width = imgWidth;
      canvas.height = imgHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      canvasRef.current = canvas;

      console.log('🔍 MULTI-SCALE face detection starting...');

      // Collect all detections across multiple scales
      const allDetections = [];

      // Create temp canvas for scaled detection
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');

      // Run detection at multiple scales to catch distant/small faces
      for (const scale of SCALE_FACTORS) {
        try {
          const scaledWidth = Math.round(imgWidth * scale);
          const scaledHeight = Math.round(imgHeight * scale);

          // Skip if too large (memory constraint)
          if (scaledWidth > 2000 || scaledHeight > 2000) {
            console.log(`⚠️ Skipping scale ${scale}x - too large`);
            continue;
          }

          // Create scaled canvas
          tempCanvas.width = scaledWidth;
          tempCanvas.height = scaledHeight;
          tempCtx.drawImage(canvas, 0, 0, scaledWidth, scaledHeight);

          // Detect faces at this scale
          const predictions = await model.estimateFaces(tempCanvas, false);
          
          console.log(`   Scale ${scale}x (${scaledWidth}x${scaledHeight}): ${predictions.length} face(s)`);

          // Convert back to original scale
          predictions.forEach((pred, idx) => {
            const [x1, y1] = pred.topLeft;
            const [x2, y2] = pred.bottomRight;

            // Scale coordinates back to original
            const origX = x1 / scale;
            const origY = y1 / scale;
            const origWidth = (x2 - x1) / scale;
            const origHeight = (y2 - y1) / scale;

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
              centerX: origX + origWidth / 2,
              centerY: origY + origHeight / 2,
              confidence: adjustedConfidence,
              area: origWidth * origHeight,
              scale,
              imageWidth: imgWidth,
              imageHeight: imgHeight,
            });
          });
        } catch (scaleError) {
          console.error(`Error at scale ${scale}:`, scaleError);
        }
      }

      console.log(`👤 Multi-scale: ${allDetections.length} total raw detections`);

      // Filter by confidence
      const validDetections = allDetections.filter(face => face.confidence >= minConfidence);
      console.log(`👤 After confidence filter: ${validDetections.length} faces`);

      // Apply NMS to remove duplicates
      const uniqueFaces = applyNMS(validDetections, NMS_IOU_THRESHOLD);
      console.log(`👤 After NMS: ${uniqueFaces.length} unique faces`);

      // Add IDs
      const detectedFaces = uniqueFaces.map((face, index) => ({
        ...face,
        id: index,
      }));

      console.log(`✅ ${detectedFaces.length} face(s) detected (min confidence: ${(minConfidence * 100).toFixed(0)}%)`);

      // If blurLargestOnly, keep only the largest face
      let finalFaces = detectedFaces;
      if (blurLargestOnly && detectedFaces.length > 1) {
        const largest = detectedFaces.reduce((max, face) => 
          face.area > max.area ? face : max
        );
        finalFaces = [largest];
        console.log(`📍 Selected largest face: ${largest.width.toFixed(0)}x${largest.height.toFixed(0)}`);
      }

      setFaces(finalFaces);
      setIsLoading(false);
      return finalFaces;

    } catch (err) {
      console.error('❌ Face detection error:', err);
      setError(err.message || 'Face detection failed');
      setFaces([]);
      setIsLoading(false);
      return [];
    }
  }, [imageSrc, modelReady, minConfidence, blurLargestOnly]);

  // Auto-detect when image changes
  useEffect(() => {
    if (autoDetect && imageSrc && modelReady) {
      detectFaces(imageSrc);
    }
  }, [imageSrc, modelReady, autoDetect, detectFaces]);

  // Clear faces when image is removed
  useEffect(() => {
    if (!imageSrc) {
      setFaces([]);
    }
  }, [imageSrc]);

  return {
    faces,
    isLoading,
    error,
    modelReady,
    detectFaces,
    imageRef,
    canvasRef,
  };
};

export default useFaceDetection;
