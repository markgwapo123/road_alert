/**
 * Geocoding Service - Convert GPS coordinates to address
 * Optimized for Philippine barangay-level detection
 * Uses Nominatim (OpenStreetMap) - FREE, no API key needed
 */

// Mapping for province names to match dropdown values
const provinceMapping = {
  'negros occidental': 'negros-occidental',
  'negros oriental': 'negros-oriental',
};

// Mapping for city names to match dropdown values (lowercase, hyphenated)
const normalizeCityName = (cityName) => {
  if (!cityName) return '';
  return cityName
    .toLowerCase()
    .replace(/\s+city$/i, '')
    .replace(/\s+municipality$/i, '')
    .replace(/\s+/g, '-')
    .replace(/[áàâä]/g, 'a')
    .replace(/[éèêë]/g, 'e')
    .replace(/[íìîï]/g, 'i')
    .replace(/[óòôö]/g, 'o')
    .replace(/[úùûü]/g, 'u')
    .replace(/ñ/g, 'n');
};

// Normalize barangay name to match dropdown values
const normalizeBarangayName = (barangayName) => {
  if (!barangayName) return '';
  return barangayName
    .toLowerCase()
    .replace(/^(barangay|brgy\.?|bgy\.?)\s+/i, '') // Remove "Barangay" / "Brgy." prefix
    .replace(/\s+/g, '-')
    .replace(/[áàâä]/g, 'a')
    .replace(/[éèêë]/g, 'e')
    .replace(/[íìîï]/g, 'i')
    .replace(/[óòôö]/g, 'o')
    .replace(/[úùûü]/g, 'u')
    .replace(/ñ/g, 'n');
};

// Extract all possible barangay candidates from Nominatim address object
const extractBarangayCandidates = (address) => {
  if (!address) return [];

  // Nominatim maps Philippine barangays to various fields depending on the area.
  // We check ALL possible fields and return them as ranked candidates.
  const candidateFields = [
    address.suburb,           // Most common for barangays
    address.neighbourhood,    // Sometimes used instead
    address.hamlet,           // Rural barangays
    address.quarter,          // Some areas
    address.village,          // Small barangays sometimes here
    address.residential,      // Residential areas
    address.city_district,    // District-level (rare but happens)
  ];

  // Return deduplicated, non-empty candidates
  return [...new Set(candidateFields.filter(Boolean))];
};

// Using Nominatim (OpenStreetMap) - FREE, no API key needed
export const getReverseGeocode = async (latitude, longitude) => {
  try {
    console.log(`🌍 Reverse geocoding: ${latitude}, ${longitude}`);

    // zoom=18 gives barangay/suburb-level detail (higher = more granular)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?` +
      `lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&zoom=18`,
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
    const provinceRaw = address.state || address.province || address.county || '';
    const province = provinceMapping[provinceRaw.toLowerCase()] || provinceRaw;

    // City (city, municipality, or town)
    const cityRaw = address.city ||
      address.municipality ||
      address.town ||
      address.village || '';
    const city = normalizeCityName(cityRaw);

    // Barangay — try multiple fields with fallback
    const barangayCandidates = extractBarangayCandidates(address);
    const barangayRaw = barangayCandidates[0] || ''; // Primary candidate
    const barangay = normalizeBarangayName(barangayRaw);

    // Full formatted address
    const fullAddress = data.display_name || '';

    console.log('🗺️ OpenStreetMap raw address:', JSON.stringify(address, null, 2));
    console.log('📍 Barangay candidates from fields:', barangayCandidates);
    console.log('✅ Extracted (raw):', { provinceRaw, cityRaw, barangayRaw });
    console.log('✅ Normalized:', { province, city, barangay });

    const result = {
      province: province || '',
      city: city || '',
      barangay: barangay || '',
      provinceLabel: provinceRaw || 'Unknown Province',
      cityLabel: cityRaw || 'Unknown City',
      barangayLabel: barangayRaw || '',
      // All raw barangay candidates for the matcher to try
      barangayCandidates: barangayCandidates.map(normalizeBarangayName),
      barangayCandidatesRaw: barangayCandidates,
      fullAddress,
      raw: data // Keep raw data for debugging
    };

    console.log('📤 Returning geocode result:', result);
    return result;

  } catch (error) {
    console.error('❌ Geocoding error:', error);

    // Return default values on error
    return {
      province: '',
      city: '',
      barangay: '',
      barangayCandidates: [],
      barangayCandidatesRaw: [],
      fullAddress: `${latitude}, ${longitude}`,
      error: error.message
    };
  }
};

// Optional: Google Geocoding (if you want to use it later)
export const getReverseGeocodeGoogle = async (latitude, longitude, apiKey) => {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?` +
      `latlng=${latitude},${longitude}&key=${apiKey}`
    );

    const data = await response.json();

    if (data.status !== 'OK' || !data.results[0]) {
      throw new Error(`Google Geocoding failed: ${data.status}`);
    }

    const addressComponents = data.results[0].address_components;

    // Extract Philippine address components
    const province = addressComponents.find(c =>
      c.types.includes('administrative_area_level_2')
    )?.long_name || '';

    const city = addressComponents.find(c =>
      c.types.includes('locality') || c.types.includes('administrative_area_level_3')
    )?.long_name || '';

    const barangay = addressComponents.find(c =>
      c.types.includes('sublocality_level_1') || c.types.includes('neighborhood')
    )?.long_name || '';

    return {
      province: province || 'Unknown Province',
      city: city || 'Unknown City',
      barangay: barangay || 'Unknown Barangay',
      fullAddress: data.results[0].formatted_address,
      raw: data
    };

  } catch (error) {
    console.error('❌ Google Geocoding error:', error);
    return null;
  }
};

// Helper: Format address for display
export const formatAddress = (province, city, barangay) => {
  const parts = [barangay, city, province].filter(Boolean);
  return parts.join(', ');
};
