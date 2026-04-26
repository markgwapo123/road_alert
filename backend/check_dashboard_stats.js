const mongoose = require('mongoose');
require('dotenv').config();
const Report = require('./models/Report');

const getDashboardStats = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const userId = '69edd4861b3b407a2b5c6535';
        
        const stats = await Report.aggregate([
            { $match: { 'reportedBy.id': new mongoose.Types.ObjectId(userId) } },
            { $group: {
                _id: '$status',
                count: { $sum: 1 }
            }}
        ]);
        
        console.log('STATS_RESULT:', JSON.stringify(stats));
        await mongoose.connection.close();
    } catch (err) {
        console.error('Error:', err);
    }
};

getDashboardStats();
