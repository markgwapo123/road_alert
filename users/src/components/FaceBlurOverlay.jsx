/**
 * FaceBlurOverlay Component
 * Displays a blur overlay on detected faces in an image
 * Automatically positions and resizes based on face detection data
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useFaceDetection, preloadFaceDetectionModel } from '../hooks/useFaceDetection.js';

/**
 * Calculate the actual rendered image dimensions and position
 * when using object-fit: cover
 */
const getRenderedImageDimensions = (imgElement, naturalWidth, naturalHeight) => {
  const containerWidth = imgElement.clientWidth;
  const containerHeight = imgElement.clientHeight;
  
  // Calculate aspect ratios
  const imageAspect = naturalWidth / naturalHeight;
  const containerAspect = containerWidth / containerHeight;
  
  let renderedWidth, renderedHeight, offsetX, offsetY;
  
  // object-fit: cover - image fills container and may be cropped
  if (imageAspect > containerAspect) {
    // Image is wider - height fits, width is cropped
    renderedHeight = containerHeight;
    renderedWidth = containerHeight * imageAspect;
    offsetX = (containerWidth - renderedWidth) / 2;
    offsetY = 0;
  } else {
    // Image is taller - width fits, height is cropped
    renderedWidth = containerWidth;
    renderedHeight = containerWidth / imageAspect;
    offsetX = 0;
    offsetY = (containerHeight - renderedHeight) / 2;
  }
  
  return {
    renderedWidth,
    renderedHeight,
    offsetX,
    offsetY,
    containerWidth,
    containerHeight,
    scaleX: renderedWidth / naturalWidth,
    scaleY: renderedHeight / naturalHeight,
  };
};

/**
 * Individual blur box for a single face
 */
const BlurBox = ({ face, imageDimensions, animate = true }) => {
  if (!face || !imageDimensions) return null;

  const { scaleX, scaleY, offsetX, offsetY, containerWidth, containerHeight } = imageDimensions;

  // Get center of detected face
  const faceCenterX = face.x + face.width / 2;
  const faceCenterY = face.y + face.height / 2;

  // Determine if this is a close face (larger area = closer)
  const faceArea = face.width * face.height;
  const imageArea = face.imageWidth * face.imageHeight;
  const facePercentage = (faceArea / imageArea) * 100;
  
  // Expand more for close faces (BlazeFace returns smaller box for close faces)
  // Close face: expand 2.5x wider, 3x taller
  // Distant face: expand 1.5x wider, 2x taller
  let widthMultiplier, heightMultiplier;
  if (facePercentage > 2) {
    // Close face - need bigger expansion
    widthMultiplier = 2.5;
    heightMultiplier = 3.0;
  } else if (facePercentage > 0.5) {
    // Medium distance
    widthMultiplier = 2.0;
    heightMultiplier = 2.5;
  } else {
    // Distant face
    widthMultiplier = 1.5;
    heightMultiplier = 2.0;
  }

  const blurWidth = face.width * widthMultiplier;
  const blurHeight = face.height * heightMultiplier;

  // Position blur box centered on face
  const blurX = faceCenterX - blurWidth / 2;
  const blurY = faceCenterY - blurHeight / 2;

  // Scale and position for displayed image
  const scaledX = blurX * scaleX + offsetX;
  const scaledY = blurY * scaleY + offsetY;
  const scaledWidth = blurWidth * scaleX;
  const scaledHeight = blurHeight * scaleY;

  // Clamp to visible container bounds
  const finalX = Math.max(0, Math.min(scaledX, containerWidth - 10));
  const finalY = Math.max(0, Math.min(scaledY, containerHeight - 10));
  const finalWidth = Math.max(20, Math.min(scaledWidth, containerWidth - finalX));
  const finalHeight = Math.max(20, Math.min(scaledHeight, containerHeight - finalY));

  // Skip if mostly outside visible area
  if (scaledX + scaledWidth < 0 || scaledY + scaledHeight < 0 ||
      scaledX > containerWidth || scaledY > containerHeight) {
    return null;
  }

  const style = {
    position: 'absolute',
    left: `${finalX}px`,
    top: `${finalY}px`,
    width: `${finalWidth}px`,
    height: `${finalHeight}px`,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '8px',
    pointerEvents: 'none',
    zIndex: 10,
    // Animation
    transition: animate ? 'all 0.3s ease-out' : 'none',
    // Border for visibility
    border: '2px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  };

  return <div style={style} className="face-blur-box" />;
};

/**
 * Main FaceBlurOverlay component
 * Wraps an image and overlays blur boxes on detected faces
 */
const FaceBlurOverlay = ({
  imageSrc,
  imageAlt = 'Image',
  imageClassName = '',
  containerClassName = '',
  onFacesDetected,
  minConfidence = 0.80,
  blurLargestOnly = true,
  showLoadingState = true,
  animate = true,
  children,
}) => {
  const containerRef = useRef(null);
  const imageElementRef = useRef(null);
  const [imageDimensions, setImageDimensions] = useState(null);

  // Use face detection hook
  const { faces, isLoading, error, modelReady } = useFaceDetection(imageSrc, {
    autoDetect: true,
    minConfidence,
    blurLargestOnly,
  });

  // Notify parent of detected faces
  useEffect(() => {
    if (onFacesDetected) {
      onFacesDetected(faces);
    }
  }, [faces, onFacesDetected]);

  /**
   * Update image dimensions for responsive positioning
   */
  const updateDimensions = useCallback(() => {
    if (imageElementRef.current && faces.length > 0) {
      const img = imageElementRef.current;
      const naturalWidth = faces[0]?.imageWidth || img.naturalWidth;
      const naturalHeight = faces[0]?.imageHeight || img.naturalHeight;
      
      if (naturalWidth && naturalHeight && img.clientWidth && img.clientHeight) {
        const dims = getRenderedImageDimensions(img, naturalWidth, naturalHeight);
        setImageDimensions(dims);
      }
    }
  }, [faces]);

  // Update dimensions on image load, resize, and when faces change
  useEffect(() => {
    updateDimensions();

    // Listen for window resize
    const handleResize = () => {
      requestAnimationFrame(updateDimensions);
    };
    window.addEventListener('resize', handleResize);

    // Use ResizeObserver for container changes
    let resizeObserver;
    if (containerRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [updateDimensions, imageSrc, faces]);

  // Handle image load
  const handleImageLoad = () => {
    // Small delay to ensure image is fully rendered
    setTimeout(updateDimensions, 100);
  };

  const containerStyle = {
    position: 'relative',
    display: 'inline-block',
    overflow: 'hidden',
  };

  const loadingOverlayStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    color: 'white',
    fontSize: '14px',
    fontWeight: 500,
    zIndex: 20,
    backdropFilter: 'blur(2px)',
  };

  return (
    <div
      ref={containerRef}
      className={`face-blur-overlay-container ${containerClassName}`}
      style={containerStyle}
    >
      <img
        ref={imageElementRef}
        src={imageSrc}
        alt={imageAlt}
        className={imageClassName}
        onLoad={handleImageLoad}
        style={{ display: 'block' }}
      />

      {/* Blur boxes for detected faces */}
      {faces.map((face) => (
        <BlurBox
          key={face.id}
          face={face}
          imageDimensions={imageDimensions}
          animate={animate}
        />
      ))}

      {/* Loading state */}
      {showLoadingState && isLoading && (
        <div style={loadingOverlayStyle}>
          <span>🔍 Detecting faces...</span>
        </div>
      )}

      {/* Children (e.g., additional controls) */}
      {children}
    </div>
  );
};

/**
 * Preload face detection model
 * Call this early in app lifecycle for faster detection
 */
export { preloadFaceDetectionModel };

export default FaceBlurOverlay;
