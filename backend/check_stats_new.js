const mongoose = require('mongoose');
require('dotenv').config();
const Report = require('./models/Report');

const checkStats = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected');

        const userId = '69edd4861b3b407a2b5c6535'; // The NEW ID
        
        const count = await Report.countDocuments({ 'reportedBy.id': userId });
        console.log('Total Reports for NEW ID:', count);

        const reports = await Report.find({ 'reportedBy.id': userId }).limit(1);
        if (reports.length > 0) {
            console.log('Sample Report:', {
                id: reports[0]._id,
                reportedById: reports[0].reportedBy.id,
                createdAt: reports[0].createdAt
            });
        }

        await mongoose.connection.close();
    } catch (err) {
        console.error('Error:', err);
    }
};

checkStats();
