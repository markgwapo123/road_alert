/**
 * Geocoding Service - Convert GPS coordinates to address
 * Supports multiple providers with fallback
 */

// Using Nominatim (OpenStreetMap) - FREE, no API key needed
export const getReverseGeocode = async (latitude, longitude) => {
  try {
    console.log(`🌍 Reverse geocoding: ${latitude}, ${longitude}`);
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?` +
      `lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'BantayDalan/1.0 (Road Alert App)',
          'Accept-Language': 'en' // Get English names
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data || !data.address) {
      throw new Error('No address data returned');
    }

    // Extract Philippine address components
    const address = data.address;
    
    // Province (state or province field)
    const province = address.state || address.province || address.county || '';
    
    // City (city, municipality, or town)
    const city = address.city || 
                 address.municipality || 
                 address.town || 
                 address.village || '';
    
    // Barangay (suburb, neighbourhood, or hamlet)
    const barangay = address.suburb || 
                     address.neighbourhood || 
                     address.hamlet || 
                     address.quarter || '';
    
    // Full formatted address
    const fullAddress = data.display_name || '';

    console.log('✅ Geocoding result:', { province, city, barangay });

    return {
      province: province || 'Unknown Province',
      city: city || 'Unknown City',
      barangay: barangay || 'Unknown Barangay',
      fullAddress,
      raw: data // Keep raw data for debugging
    };

  } catch (error) {
    console.error('❌ Geocoding error:', error);
    
    // Return default values on error
    return {
      province: 'Unknown Province',
      city: 'Unknown City',
      barangay: 'Unknown Barangay',
      fullAddress: `${latitude}, ${longitude}`,
      error: error.message
    };
  }
};

// Helper: Format address for display
export const formatAddress = (province, city, barangay) => {
  const parts = [barangay, city, province].filter(Boolean);
  return parts.join(', ');
};
