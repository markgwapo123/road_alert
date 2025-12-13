import { NEGROS_PROVINCES, NEGROS_CITIES, NEGROS_BARANGAYS } from '../data/negrosLocations.js';

/**
 * Validates and finds matching dropdown values for geocoded addresses
 */

// Find province match
export const findProvinceMatch = (geocodedProvince) => {
  if (!geocodedProvince) return '';
  
  const normalized = geocodedProvince.toLowerCase();
  
  // Direct match
  const directMatch = NEGROS_PROVINCES.find(p => 
    p.value === normalized || 
    p.label.toLowerCase() === normalized
  );
  
  if (directMatch) {
    console.log('✅ Province match found:', directMatch.value);
    return directMatch.value;
  }
  
  // Partial match
  const partialMatch = NEGROS_PROVINCES.find(p => 
    normalized.includes(p.label.toLowerCase()) || 
    p.label.toLowerCase().includes(normalized)
  );
  
  if (partialMatch) {
    console.log('✅ Province partial match:', partialMatch.value);
    return partialMatch.value;
  }
  
  console.warn('❌ No province match for:', geocodedProvince);
  return '';
};

// Find city match
export const findCityMatch = (geocodedCity, province) => {
  if (!geocodedCity || !province) return '';
  
  const cities = NEGROS_CITIES[province];
  if (!cities) {
    console.warn('❌ No cities found for province:', province);
    return '';
  }
  
  const normalized = geocodedCity.toLowerCase();
  
  // Direct match
  const directMatch = cities.find(c => 
    c.value === normalized || 
    c.label.toLowerCase() === normalized ||
    c.label.toLowerCase().replace(' city', '') === normalized
  );
  
  if (directMatch) {
    console.log('✅ City match found:', directMatch.value);
    return directMatch.value;
  }
  
  // Partial match
  const partialMatch = cities.find(c => 
    normalized.includes(c.label.toLowerCase().replace(' city', '')) ||
    c.label.toLowerCase().includes(normalized)
  );
  
  if (partialMatch) {
    console.log('✅ City partial match:', partialMatch.value);
    return partialMatch.value;
  }
  
  console.warn('❌ No city match for:', geocodedCity, 'in province:', province);
  return '';
};

// Find barangay match
export const findBarangayMatch = (geocodedBarangay, city) => {
  if (!geocodedBarangay || !city) return '';
  
  const barangays = NEGROS_BARANGAYS[city];
  if (!barangays) {
    console.warn('❌ No barangays found for city:', city);
    return '';
  }
  
  const normalized = geocodedBarangay.toLowerCase()
    .replace(/^barangay\s+/i, '')
    .replace(/\s+/g, '-');
  
  // Direct match
  const directMatch = barangays.find(b => 
    b.value === normalized || 
    b.label.toLowerCase() === geocodedBarangay.toLowerCase() ||
    b.label.toLowerCase().replace(/\s+/g, '-') === normalized
  );
  
  if (directMatch) {
    console.log('✅ Barangay match found:', directMatch.value);
    return directMatch.value;
  }
  
  // Partial match
  const partialMatch = barangays.find(b => 
    b.label.toLowerCase().includes(geocodedBarangay.toLowerCase()) ||
    geocodedBarangay.toLowerCase().includes(b.label.toLowerCase())
  );
  
  if (partialMatch) {
    console.log('✅ Barangay partial match:', partialMatch.value);
    return partialMatch.value;
  }
  
  console.warn('❌ No barangay match for:', geocodedBarangay, 'in city:', city);
  console.log('📋 Available barangays:', barangays.map(b => b.label).slice(0, 10));
  return '';
};

// Process geocoded address data and return validated dropdown values
export const processGeocodedAddress = (addressData) => {
  console.log('🔍 Processing geocoded address:', addressData);
  console.log('📝 Input values:', {
    province: addressData.province,
    provinceLabel: addressData.provinceLabel,
    city: addressData.city,
    cityLabel: addressData.cityLabel,
    barangay: addressData.barangay,
    barangayLabel: addressData.barangayLabel
  });
  
  const result = {
    province: '',
    city: '',
    barangay: '',
    provinceLabel: addressData.provinceLabel || '',
    cityLabel: addressData.cityLabel || '',
    barangayLabel: addressData.barangayLabel || ''
  };
  
  // Find province match - try both normalized value and raw label
  if (addressData.province || addressData.provinceLabel) {
    result.province = findProvinceMatch(addressData.province) || 
                     findProvinceMatch(addressData.provinceLabel) ||
                     '';
  }
  
  // Find city match (only if province was found)
  if (result.province && (addressData.city || addressData.cityLabel)) {
    result.city = findCityMatch(addressData.city, result.province) ||
                  findCityMatch(addressData.cityLabel, result.province) ||
                  '';
  }
  
  // Find barangay match (only if city was found)
  if (result.city && (addressData.barangay || addressData.barangayLabel)) {
    result.barangay = findBarangayMatch(addressData.barangay, result.city) ||
                     findBarangayMatch(addressData.barangayLabel, result.city) ||
                     '';
  }
  
  console.log('✅ Processed result:', result);
  console.log('📊 Match success:', {
    provinceMatched: !!result.province,
    cityMatched: !!result.city,
    barangayMatched: !!result.barangay
  });
  
  return result;
};
