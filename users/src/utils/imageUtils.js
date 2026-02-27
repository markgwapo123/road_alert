import config from '../config/index.js';

/**
 * Get full URL for profile image with fallback handling
 * @param {string} imagePath - The relative image path from backend
 * @returns {string} Full image URL or null if invalid
 */
export const getProfileImageUrl = (imagePath) => {
  if (!imagePath) return null;
  
  // If already a full URL, return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // If starts with /, it's a relative path from backend
  if (imagePath.startsWith('/')) {
    return `${config.BACKEND_URL}${imagePath}`;
  }
  
  // Otherwise assume it's a filename and add uploads path
  return `${config.BACKEND_URL}/uploads/profile-images/${imagePath}`;
};

/**
 * Check if image URL is accessible
 * @param {string} imageUrl - The image URL to check
 * @returns {Promise<boolean>} Whether image is accessible
 */
export const checkImageAccessibility = async (imageUrl) => {
  if (!imageUrl) return false;
  
  try {
    const response = await fetch(imageUrl, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.warn('Image accessibility check failed:', imageUrl, error);
    return false;
  }
};

/**
 * Profile image component with robust error handling
 * @param {Object} props - Component props
 * @param {string} props.imagePath - Image path from backend
 * @param {string} props.alt - Alt text
 * @param {Object} props.style - Inline styles
 * @param {string} props.className - CSS class
 * @param {Function} props.onError - Error callback
 * @returns {JSX.Element} Image or fallback
 */
export const ProfileImage = ({ 
  imagePath, 
  alt = "Profile", 
  style = {}, 
  className = "",
  onError = () => {}
}) => {
  const imageUrl = getProfileImageUrl(imagePath);
  
  const handleError = (e) => {
    console.log('Profile image failed to load:', e.target.src);
    e.target.style.display = 'none';
    if (e.target.parentElement) {
      e.target.parentElement.innerHTML = '👤';
    }
    onError(e);
  };

  if (!imageUrl) {
    return <span style={style}>👤</span>;
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      style={style}
      className={className}
      onError={handleError}
    />
  );
};

export default {
  getProfileImageUrl,
  checkImageAccessibility,
  ProfileImage
};