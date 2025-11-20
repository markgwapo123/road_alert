require('dotenv').config();
const mongoose = require('mongoose');
const Report = require('./models/Report');

async function checkCoordinates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');
    
    // Find reports with location data
    const reports = await Report.find({}).select('location type description').limit(5);
    
    console.log('\n📍 Checking report coordinates:');
    console.log('='.repeat(50));
    
    for (const report of reports) {
      console.log(`\nReport ID: ${report._id}`);
      console.log(`Type: ${report.type}`);
      console.log(`Description: ${report.description.substring(0, 50)}...`);
      
      if (report.location && report.location.coordinates) {
        const lat = report.location.coordinates.latitude;
        const lng = report.location.coordinates.longitude;
        
        console.log(`Coordinates: ${lat}, ${lng}`);
        console.log(`Google Maps URL: https://www.google.com/maps?q=${lat},${lng}`);
        
        // Validate coordinates are reasonable
        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          console.log('✅ Coordinates are valid');
        } else {
          console.log('❌ Coordinates are invalid!');
        }
      } else {
        console.log('❌ No coordinates found');
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkCoordinates();