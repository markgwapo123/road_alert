/**
 * Skeleton Loaders for Improved Perceived Performance
 * Shows placeholder content while data is loading
 */

import React from 'react';
import './SkeletonLoaders.css';

/**
 * Base skeleton element with shimmer animation
 */
export const Skeleton = ({ 
  width = '100%', 
  height = '1rem', 
  borderRadius = '4px',
  className = '',
  style = {},
}) => (
  <div 
    className={`skeleton ${className}`}
    style={{ 
      width, 
      height, 
      borderRadius,
      ...style 
    }}
  />
);

/**
 * Circular skeleton for avatars
 */
export const SkeletonCircle = ({ size = '40px', className = '' }) => (
  <Skeleton 
    width={size} 
    height={size} 
    borderRadius="50%" 
    className={className}
  />
);

/**
 * Text line skeleton
 */
export const SkeletonText = ({ lines = 3, className = '' }) => (
  <div className={`skeleton-text ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton 
        key={i} 
        height="0.875rem" 
        width={i === lines - 1 ? '60%' : '100%'}
        style={{ marginBottom: i < lines - 1 ? '0.5rem' : 0 }}
      />
    ))}
  </div>
);

/**
 * Report card skeleton
 */
export const ReportCardSkeleton = () => (
  <div className="skeleton-card">
    <div className="skeleton-card-header">
      <SkeletonCircle size="32px" />
      <div className="skeleton-card-title">
        <Skeleton width="120px" height="1rem" />
        <Skeleton width="80px" height="0.75rem" style={{ marginTop: '4px' }} />
      </div>
    </div>
    <div className="skeleton-card-body">
      <Skeleton height="120px" borderRadius="8px" style={{ marginBottom: '12px' }} />
      <SkeletonText lines={2} />
    </div>
    <div className="skeleton-card-footer">
      <Skeleton width="60px" height="24px" borderRadius="12px" />
      <Skeleton width="60px" height="24px" borderRadius="12px" />
    </div>
  </div>
);

/**
 * Report list skeleton (multiple cards)
 */
export const ReportListSkeleton = ({ count = 3 }) => (
  <div className="skeleton-list">
    {Array.from({ length: count }).map((_, i) => (
      <ReportCardSkeleton key={i} />
    ))}
  </div>
);

/**
 * Dashboard stats skeleton
 */
export const DashboardStatsSkeleton = () => (
  <div className="skeleton-stats">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="skeleton-stat-card">
        <SkeletonCircle size="40px" />
        <Skeleton width="60px" height="1.5rem" style={{ marginTop: '8px' }} />
        <Skeleton width="80px" height="0.75rem" style={{ marginTop: '4px' }} />
      </div>
    ))}
  </div>
);

/**
 * Full dashboard skeleton
 */
export const DashboardSkeleton = () => (
  <div className="skeleton-dashboard">
    <div className="skeleton-header">
      <Skeleton width="200px" height="1.5rem" />
      <Skeleton width="150px" height="1rem" style={{ marginTop: '8px' }} />
    </div>
    <DashboardStatsSkeleton />
    <div className="skeleton-section">
      <Skeleton width="150px" height="1.25rem" style={{ marginBottom: '16px' }} />
      <ReportListSkeleton count={3} />
    </div>
  </div>
);

/**
 * Profile page skeleton
 */
export const ProfileSkeleton = () => (
  <div className="skeleton-profile">
    <div className="skeleton-profile-header">
      <SkeletonCircle size="80px" />
      <Skeleton width="150px" height="1.25rem" style={{ marginTop: '12px' }} />
      <Skeleton width="200px" height="0.875rem" style={{ marginTop: '8px' }} />
    </div>
    <div className="skeleton-profile-stats">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="skeleton-profile-stat">
          <Skeleton width="40px" height="1.5rem" />
          <Skeleton width="60px" height="0.75rem" style={{ marginTop: '4px' }} />
        </div>
      ))}
    </div>
    <div className="skeleton-profile-section">
      <Skeleton width="120px" height="1rem" style={{ marginBottom: '12px' }} />
      <SkeletonText lines={4} />
    </div>
  </div>
);

/**
 * Map loading skeleton
 */
export const MapSkeleton = () => (
  <div className="skeleton-map">
    <div className="skeleton-map-placeholder">
      <div className="skeleton-map-icon">🗺️</div>
      <Skeleton width="150px" height="1rem" style={{ marginTop: '12px' }} />
    </div>
  </div>
);

/**
 * Loading overlay with timeout fallback message
 */
export const LoadingOverlay = ({ 
  message = 'Loading...', 
  showTimeout = false,
  onRetry = null,
}) => (
  <div className="loading-overlay">
    <div className="loading-spinner" />
    <p className="loading-message">{message}</p>
    {showTimeout && (
      <div className="loading-timeout">
        <p>This is taking longer than expected.</p>
        {onRetry && (
          <button onClick={onRetry} className="loading-retry-btn">
            Try Again
          </button>
        )}
      </div>
    )}
  </div>
);

/**
 * Smart loading component that shows skeleton then timeout fallback
 */
export const SmartLoader = ({ 
  isLoading,
  error,
  children,
  skeleton: SkeletonComponent = DashboardSkeleton,
  timeoutMs = 5000,
  onRetry = null,
  cachedData = null,
}) => {
  const [showTimeout, setShowTimeout] = React.useState(false);
  
  React.useEffect(() => {
    if (!isLoading) {
      setShowTimeout(false);
      return;
    }
    
    const timer = setTimeout(() => {
      setShowTimeout(true);
    }, timeoutMs);
    
    return () => clearTimeout(timer);
  }, [isLoading, timeoutMs]);
  
  // Show cached data with stale indicator
  if (cachedData && isLoading) {
    return (
      <div className="stale-data-container">
        <div className="stale-indicator">
          <span className="stale-icon">🔄</span>
          <span>Updating...</span>
        </div>
        {children}
      </div>
    );
  }
  
  // Show error with retry
  if (error) {
    return (
      <div className="error-container">
        <div className="error-icon">⚠️</div>
        <p className="error-message">{error}</p>
        {onRetry && (
          <button onClick={onRetry} className="retry-btn">
            Try Again
          </button>
        )}
      </div>
    );
  }
  
  // Show skeleton with timeout fallback
  if (isLoading) {
    return (
      <div className="skeleton-container">
        <SkeletonComponent />
        {showTimeout && (
          <div className="timeout-overlay">
            <p>Server is waking up, please wait...</p>
            {onRetry && (
              <button onClick={onRetry} className="timeout-retry-btn">
                Retry Now
              </button>
            )}
          </div>
        )}
      </div>
    );
  }
  
  return children;
};

export default {
  Skeleton,
  SkeletonCircle,
  SkeletonText,
  ReportCardSkeleton,
  ReportListSkeleton,
  DashboardStatsSkeleton,
  DashboardSkeleton,
  ProfileSkeleton,
  MapSkeleton,
  LoadingOverlay,
  SmartLoader,
};
