const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

const checkOldUser = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const user = await User.findOne({ email: 'mark_backup@gmail.com' });
        if (user) {
            console.log('OLD_USERNAME:', user.username);
            console.log('OLD_CREATED_AT:', user.createdAt);
            console.log('OLD_PROFILE:', JSON.stringify(user.profile));
        }
        await mongoose.connection.close();
    } catch (err) {}
};

checkOldUser();
