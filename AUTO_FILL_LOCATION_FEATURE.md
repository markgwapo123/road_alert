# 🗺️ Auto-Fill Location Feature

## Overview
BantayDalan now automatically fills province, city, and barangay when you select a location on the map!

## How It Works

### **Reverse Geocoding**
When you get GPS coordinates (latitude, longitude), the app automatically converts them to human-readable address:

```
GPS: 10.3157, 123.8854
   ↓ Reverse Geocoding
Address: Barangay 1, Kabankalan City, Negros Occidental
```

## Features

### ✅ **Automatic Address Detection**
1. **When you click "Use Current Location"**
   - Gets your GPS coordinates
   - Automatically fills: Province, City, Barangay
   - Shows: "✅ Location detected: Kabankalan City, Negros Occidental"

2. **When you upload a photo with GPS**
   - Extracts GPS from photo EXIF data
   - Automatically fills: Province, City, Barangay  
   - Shows: "📍 Photo location: Kabankalan City, Negros Occidental"

3. **When you tap location on map**
   - Gets coordinates from map click
   - Automatically fills: Province, City, Barangay
   - Shows address in form

### 🌍 **Geocoding Provider**
- **Using:** OpenStreetMap Nominatim (FREE)
- **No API key required**
- **Rate limit:** 1 request per second
- **Coverage:** Worldwide, good for Philippines

## User Flow

```
📱 USER ACTIONS:
1. Click "Use Current Location" button
   OR
2. Upload photo with GPS data
   OR
3. Tap location on map

⬇️

🌍 AUTOMATIC GEOCODING:
- Gets latitude, longitude
- Sends to Nominatim API
- Receives address breakdown

⬇️

✨ AUTO-FILLED FORM:
✅ Province: "Negros Occidental"
✅ City: "Kabankalan City"
✅ Barangay: "Barangay 1"
✅ Full Address: "Barangay 1, Kabankalan City, Negros Occidental, Philippines"
```

## Manual Override
Users can still manually edit the auto-filled values if needed!

## Benefits

### For Users:
- ⏱️ **Faster submission** - No typing needed
- ✅ **More accurate** - Reduces typos
- 📍 **Better precision** - Exact location from GPS

### For Admins:
- 📊 **Better data quality** - Consistent formatting
- 🗺️ **Easier filtering** - Standard province/city/barangay names
- 📈 **Better analytics** - Can group by location

## Technical Details

### API Endpoint
```
GET https://nominatim.openstreetmap.org/reverse?
    lat=10.3157&
    lon=123.8854&
    format=json&
    addressdetails=1
```

### Response Example
```json
{
  "address": {
    "suburb": "Barangay 1",
    "city": "Kabankalan City",
    "state": "Negros Occidental",
    "country": "Philippines"
  },
  "display_name": "Barangay 1, Kabankalan City, Negros Occidental, Philippines"
}
```

### Mapping to Form Fields
```javascript
province: address.state || address.province    // "Negros Occidental"
city: address.city || address.municipality     // "Kabankalan City"
barangay: address.suburb || address.neighbourhood  // "Barangay 1"
```

## Error Handling
- If geocoding fails → Shows "Unknown Province/City/Barangay"
- User can manually enter values
- Form submission still works

## Future Enhancements
- Cache common locations for faster loading
- Add Google Geocoding as backup option
- Support address search (forward geocoding)
- Add location verification

## Files Modified
- `users/src/services/geocoding.js` - NEW geocoding service
- `users/src/components/ReportForm.jsx` - Auto-fill on location detect
- `src/services/geocoding.js` - Admin side geocoding
