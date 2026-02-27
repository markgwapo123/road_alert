import { NEGROS_PROVINCES, NEGROS_CITIES, NEGROS_BARANGAYS } from '../data/negrosLocations.js';

/**
 * Validates and finds matching dropdown values for geocoded addresses.
 * Includes fuzzy matching and display_name fallback for reliable barangay detection.
 */

// Simple Levenshtein distance for fuzzy matching
const levenshteinDistance = (a, b) => {
  const matrix = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      matrix[i][j] = a[i - 1] === b[j - 1]
        ? matrix[i - 1][j - 1]
        : 1 + Math.min(matrix[i - 1][j], matrix[i][j - 1], matrix[i - 1][j - 1]);
    }
  }
  return matrix[a.length][b.length];
};

// Similarity score (0 to 1, where 1 = exact match)
const similarity = (a, b) => {
  if (!a || !b) return 0;
  const al = a.toLowerCase();
  const bl = b.toLowerCase();
  if (al === bl) return 1;
  const maxLen = Math.max(al.length, bl.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(al, bl) / maxLen;
};

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

  const normalized = geocodedCity.toLowerCase()
    .replace(/\s+city$/i, '')
    .replace(/\s+municipality$/i, '');

  // Direct match
  const directMatch = cities.find(c =>
    c.value === normalized ||
    c.label.toLowerCase() === normalized ||
    c.label.toLowerCase().replace(' city', '') === normalized ||
    c.label.toLowerCase().replace(/\s+/g, '-') === normalized.replace(/\s+/g, '-')
  );

  if (directMatch) {
    console.log('✅ City match found:', directMatch.value);
    return directMatch.value;
  }

  // Partial match
  const partialMatch = cities.find(c => {
    const cLabel = c.label.toLowerCase().replace(' city', '');
    return normalized.includes(cLabel) || cLabel.includes(normalized);
  });

  if (partialMatch) {
    console.log('✅ City partial match:', partialMatch.value);
    return partialMatch.value;
  }

  // Fuzzy match (similarity >= 0.75)
  let bestMatch = null;
  let bestScore = 0;
  for (const c of cities) {
    const score = similarity(normalized, c.label.toLowerCase().replace(' city', ''));
    if (score > bestScore && score >= 0.75) {
      bestScore = score;
      bestMatch = c;
    }
  }
  if (bestMatch) {
    console.log(`✅ City fuzzy match: ${bestMatch.value} (score: ${bestScore.toFixed(2)})`);
    return bestMatch.value;
  }

  console.warn('❌ No city match for:', geocodedCity, 'in province:', province);
  return '';
};

// Find barangay match — tries exact, partial, and fuzzy matching
export const findBarangayMatch = (geocodedBarangay, city) => {
  if (!geocodedBarangay || !city) return '';

  const barangays = NEGROS_BARANGAYS[city];
  if (!barangays) {
    console.warn('❌ No barangays found for city:', city);
    return '';
  }

  const normalized = geocodedBarangay.toLowerCase()
    .replace(/^(barangay|brgy\.?|bgy\.?)\s+/i, '')
    .replace(/\s+/g, '-');

  // 1. Direct match (value or label)
  const directMatch = barangays.find(b =>
    b.value === normalized ||
    b.label.toLowerCase() === geocodedBarangay.toLowerCase() ||
    b.label.toLowerCase().replace(/\s+/g, '-') === normalized
  );

  if (directMatch) {
    console.log('✅ Barangay exact match:', directMatch.value);
    return directMatch.value;
  }

  // 2. Partial / contains match
  const partialMatch = barangays.find(b => {
    const bLabel = b.label.toLowerCase();
    const gLabel = geocodedBarangay.toLowerCase();
    return bLabel.includes(gLabel) || gLabel.includes(bLabel);
  });

  if (partialMatch) {
    console.log('✅ Barangay partial match:', partialMatch.value);
    return partialMatch.value;
  }

  // 3. Fuzzy match (similarity >= 0.75)
  let bestMatch = null;
  let bestScore = 0;
  for (const b of barangays) {
    const bNorm = b.label.toLowerCase().replace(/\s+/g, '-');
    const score = similarity(normalized, bNorm);
    if (score > bestScore && score >= 0.75) {
      bestScore = score;
      bestMatch = b;
    }
  }
  if (bestMatch) {
    console.log(`✅ Barangay fuzzy match: ${bestMatch.value} (score: ${bestScore.toFixed(2)})`);
    return bestMatch.value;
  }

  console.warn('❌ No barangay match for:', geocodedBarangay, 'in city:', city);
  return '';
};

// Scan display_name segments against the city's barangay list
const findBarangayFromDisplayName = (displayName, city) => {
  if (!displayName || !city) return '';

  const barangays = NEGROS_BARANGAYS[city];
  if (!barangays || barangays.length === 0) return '';

  // Split display_name by commas and try each segment
  const segments = displayName.split(',').map(s => s.trim()).filter(Boolean);

  console.log('🔍 Scanning display_name segments for barangay:', segments);

  for (const segment of segments) {
    const cleaned = segment
      .replace(/^(barangay|brgy\.?|bgy\.?)\s+/i, '')
      .trim();

    // Exact match on any segment
    const match = barangays.find(b => {
      const bLabel = b.label.toLowerCase();
      const sLabel = cleaned.toLowerCase();
      return bLabel === sLabel ||
        b.value === sLabel.replace(/\s+/g, '-') ||
        bLabel.replace(/\s+/g, '-') === sLabel.replace(/\s+/g, '-');
    });

    if (match) {
      console.log(`✅ Barangay found in display_name segment "${segment}":`, match.value);
      return match.value;
    }

    // Fuzzy match on segment (threshold 0.80 — stricter for display_name to avoid false positives)
    let bestMatch = null;
    let bestScore = 0;
    for (const b of barangays) {
      const score = similarity(cleaned.toLowerCase(), b.label.toLowerCase());
      if (score > bestScore && score >= 0.80) {
        bestScore = score;
        bestMatch = b;
      }
    }
    if (bestMatch) {
      console.log(`✅ Barangay fuzzy match from display_name "${segment}": ${bestMatch.value} (score: ${bestScore.toFixed(2)})`);
      return bestMatch.value;
    }
  }

  console.warn('❌ No barangay found in display_name for city:', city);
  return '';
};

// Process geocoded address data and return validated dropdown values
export const processGeocodedAddress = (addressData) => {
  console.log('🔍 Processing geocoded address:', {
    province: addressData.province,
    city: addressData.city,
    barangay: addressData.barangay,
    barangayCandidates: addressData.barangayCandidates,
    barangayCandidatesRaw: addressData.barangayCandidatesRaw
  });

  const result = {
    province: '',
    city: '',
    barangay: '',
    provinceLabel: addressData.provinceLabel || '',
    cityLabel: addressData.cityLabel || '',
    barangayLabel: addressData.barangayLabel || '',
    barangayNotDetected: false
  };

  // 1. Find province match
  if (addressData.province || addressData.provinceLabel) {
    result.province = findProvinceMatch(addressData.province) ||
      findProvinceMatch(addressData.provinceLabel) ||
      '';
  }

  // 2. Find city match (only if province was found)
  if (result.province && (addressData.city || addressData.cityLabel)) {
    result.city = findCityMatch(addressData.city, result.province) ||
      findCityMatch(addressData.cityLabel, result.province) ||
      '';
  }

  // 3. Find barangay match — multi-strategy approach
  if (result.city) {
    // Strategy A: Try primary barangay value
    if (addressData.barangay) {
      result.barangay = findBarangayMatch(addressData.barangay, result.city);
    }

    // Strategy B: Try the raw label
    if (!result.barangay && addressData.barangayLabel) {
      result.barangay = findBarangayMatch(addressData.barangayLabel, result.city);
    }

    // Strategy C: Try all candidate fields from Nominatim
    if (!result.barangay && addressData.barangayCandidatesRaw?.length > 0) {
      for (const candidate of addressData.barangayCandidatesRaw) {
        result.barangay = findBarangayMatch(candidate, result.city);
        if (result.barangay) {
          console.log('✅ Barangay matched from candidate:', candidate);
          break;
        }
      }
    }

    // Strategy D: Parse display_name and match against known barangays
    if (!result.barangay && addressData.fullAddress) {
      result.barangay = findBarangayFromDisplayName(addressData.fullAddress, result.city);
    }

    // If still no match, flag it
    if (!result.barangay) {
      result.barangayNotDetected = true;
      console.warn('⚠️ Barangay not detected after all strategies. Please select manually.');
    }
  }

  console.log('✅ Final processed result:', result);
  console.log('📊 Match success:', {
    provinceMatched: !!result.province,
    cityMatched: !!result.city,
    barangayMatched: !!result.barangay
  });

  return result;
};
