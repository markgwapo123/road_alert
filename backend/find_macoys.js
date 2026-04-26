const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

const findMacoys = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const user = await User.findOne({ username: 'macoys' });
        if (user) {
            console.log('MACOYS_USER:', JSON.stringify(user));
        } else {
            console.log('Username macoys not found');
        }
        await mongoose.connection.close();
    } catch (err) {}
};

findMacoys();
