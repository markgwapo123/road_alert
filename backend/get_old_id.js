const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

const checkOldUser = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const user = await User.findById('692e5d4efba3b30bd1e197b2');
        if (user) {
            console.log('OLD_USERNAME:', user.username);
            console.log('OLD_CREATED_AT:', user.createdAt);
        }
        await mongoose.connection.close();
    } catch (err) {}
};

checkOldUser();
