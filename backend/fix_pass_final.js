const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

const fixPassword = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected');

        const user = await User.findOne({ email: 'mark@gmail.com' });
        if (user) {
            user.password = '123456'; // Pre-save hook will hash this correctly
            await user.save();
            console.log('Password fixed for mark@gmail.com');
        } else {
            console.log('User not found');
        }

        await mongoose.connection.close();
    } catch (err) {
        console.error('Error:', err);
    }
};

fixPassword();
