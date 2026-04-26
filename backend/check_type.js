const mongoose = require('mongoose');
require('dotenv').config();
const Report = require('./models/Report');

const checkIdType = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected');

        const newId = '69edd4861b3b407a2b5c6535';
        
        // Check for reports with the string version of the ID
        const stringCount = await Report.countDocuments({ 'reportedBy.id': newId });
        // Check for reports with the ObjectId version of the ID
        const objectIdCount = await Report.countDocuments({ 'reportedBy.id': new mongoose.Types.ObjectId(newId) });
        
        console.log('String ID count:', stringCount);
        console.log('ObjectId ID count:', objectIdCount);

        await mongoose.connection.close();
    } catch (err) {
        console.error('Error:', err);
    }
};

checkIdType();
