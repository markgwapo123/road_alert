const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

const checkOldUser = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected');

        const user = await User.findOne({ email: 'mark_backup@gmail.com' });
        if (user) {
            console.log('Old User Data:', {
                id: user._id,
                username: user.username,
                profile: user.profile
            });
        }

        await mongoose.connection.close();
    } catch (err) {
        console.error('Error:', err);
    }
};

checkOldUser();
