const mongoose = require('mongoose');
const Report = require('./models/Report');

// Connect to MongoDB
mongoose.connect('mongodb+srv://markstephenmagbatos:your_password@cluster0.mx6qk3q.mongodb.net/roadalert?retryWrites=true&w=majority&appName=Cluster0');

async function checkReportsWithImages() {
  try {
    console.log('🔍 Checking reports with images...');

    // Find all reports
    const allReports = await Report.find({}).select('_id type images location.address');
    console.log(`📊 Total reports: ${allReports.length}`);

    // Find reports with images
    const reportsWithImages = await Report.find({
      images: { $exists: true, $not: { $size: 0 } }
    }).select('_id type images location.address');

    console.log(`🖼️ Reports with images: ${reportsWithImages.length}`);

    if (reportsWithImages.length > 0) {
      console.log('\n📋 Reports with images:');
      reportsWithImages.forEach((report, index) => {
        console.log(`${index + 1}. ID: ${report._id}`);
        console.log(`   Type: ${report.type}`);
        console.log(`   Address: ${report.location.address}`);
        console.log(`   Images: ${report.images.length}`);
        if (report.images.length > 0) {
          report.images.forEach((img, i) => {
            console.log(`     Image ${i + 1}: ${img.filename || img}`);
          });
        }
        console.log('');
      });
    } else {
      console.log('❌ No reports found with images');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkReportsWithImages();