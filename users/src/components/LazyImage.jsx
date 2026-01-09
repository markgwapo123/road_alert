/**
 * LazyImage Component
 * Optimized image loading for mobile performance
 * 
 * Features:
 * - Lazy loading (only loads when visible)
 * - Placeholder while loading
 * - Error handling with fallback
 * - Image caching
 * - Progressive loading
 */

import React, { useState, useEffect, useRef, memo } from 'react';
import config from '../config/index.js';

// In-memory image cache
const imageCache = new Map();
const MAX_CACHE_SIZE = 50;

/**
 * Get image from cache or null
 */
const getCachedImage = (url) => {
  return imageCache.get(url) || null;
};

/**
 * Add image to cache with LRU eviction
 */
const setCachedImage = (url, data) => {
  if (imageCache.size >= MAX_CACHE_SIZE) {
    // Remove oldest entry
    const firstKey = imageCache.keys().next().value;
    imageCache.delete(firstKey);
  }
  imageCache.set(url, data);
};

/**
 * Build image URL from report data
 */
export const getReportImageUrl = (report, index = 0) => {
  if (!report) return null;
  
  // If report has images array with imageUrl
  if (report.images && report.images[index]) {
    const img = report.images[index];
    
    // If it has full base64 data, use it
    if (img.data) {
      return `data:${img.mimetype || 'image/jpeg'};base64,${img.data}`;
    }
    
    // If it has imageUrl (from lightweight endpoint)
    if (img.imageUrl) {
      return `${config.BACKEND_URL}${img.imageUrl}`;
    }
    
    // If it's just a filename
    if (typeof img === 'string' || img.filename) {
      const filename = img.filename || img;
      return `${config.BACKEND_URL}/uploads/${filename}`;
    }
  }
  
  return null;
};

/**
 * Placeholder component while image loads
 */
const ImagePlaceholder = ({ width, height, className }) => (
  <div 
    className={className}
    style={{
      width: width || '100%',
      height: height || '150px',
      backgroundColor: '#e5e7eb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '8px',
    }}
  >
    <div style={{ 
      width: '40px', 
      height: '40px',
      border: '3px solid #d1d5db',
      borderTopColor: '#9ca3af',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
    }} />
    <style>{`
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

/**
 * Error fallback component
 */
const ImageError = ({ width, height, className, onRetry }) => (
  <div 
    className={className}
    style={{
      width: width || '100%',
      height: height || '150px',
      backgroundColor: '#fef2f2',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '8px',
      color: '#991b1b',
      gap: '8px',
    }}
    onClick={onRetry}
  >
    <span style={{ fontSize: '24px' }}>📷</span>
    <span style={{ fontSize: '12px' }}>Tap to retry</span>
  </div>
);

/**
 * LazyImage Component
 */
const LazyImage = memo(({ 
  src, 
  alt = 'Image',
  width,
  height,
  className = '',
  style = {},
  placeholder,
  fallback,
  onLoad,
  onError,
  lazy = true,
  cacheEnabled = true,
}) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isVisible, setIsVisible] = useState(!lazy);
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  // Check cache on mount
  useEffect(() => {
    if (src && cacheEnabled) {
      const cached = getCachedImage(src);
      if (cached) {
        setImageSrc(cached);
        setLoading(false);
        return;
      }
    }
  }, [src, cacheEnabled]);

  // Set up intersection observer for lazy loading
  useEffect(() => {
    if (!lazy || !imgRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observerRef.current?.disconnect();
          }
        });
      },
      {
        rootMargin: '100px', // Start loading 100px before visible
        threshold: 0.1,
      }
    );

    observerRef.current.observe(imgRef.current);

    return () => observerRef.current?.disconnect();
  }, [lazy]);

  // Load image when visible
  useEffect(() => {
    if (!isVisible || !src || imageSrc) return;

    const loadImage = async () => {
      setLoading(true);
      setError(false);

      try {
        // For base64 data URLs, use directly
        if (src.startsWith('data:')) {
          setImageSrc(src);
          setLoading(false);
          if (cacheEnabled) setCachedImage(src, src);
          return;
        }

        // For HTTP URLs, preload image
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = src;
        });

        setImageSrc(src);
        setLoading(false);
        if (cacheEnabled) setCachedImage(src, src);
        onLoad?.();

      } catch (err) {
        console.warn('Image load failed:', src, err);
        setError(true);
        setLoading(false);
        onError?.(err);
      }
    };

    loadImage();
  }, [isVisible, src, imageSrc, cacheEnabled, onLoad, onError]);

  // Retry handler
  const handleRetry = () => {
    setError(false);
    setImageSrc(null);
    setLoading(true);
  };

  // Render placeholder while loading
  if (loading && !imageSrc) {
    return (
      <div ref={imgRef}>
        {placeholder || <ImagePlaceholder width={width} height={height} className={className} />}
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div ref={imgRef}>
        {fallback || <ImageError width={width} height={height} className={className} onRetry={handleRetry} />}
      </div>
    );
  }

  // Render image
  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={className}
      style={{
        width: width || '100%',
        height: height || 'auto',
        objectFit: 'cover',
        borderRadius: '8px',
        ...style,
      }}
      loading="lazy"
      decoding="async"
    />
  );
});

LazyImage.displayName = 'LazyImage';

/**
 * ReportImage - Specialized component for report images
 */
export const ReportImage = memo(({ 
  report, 
  imageIndex = 0, 
  ...props 
}) => {
  const src = getReportImageUrl(report, imageIndex);
  
  if (!src && !report?.hasImages) {
    return null;
  }
  
  return <LazyImage src={src} alt={`Report ${report?.type || 'image'}`} {...props} />;
});

ReportImage.displayName = 'ReportImage';

export default LazyImage;
