const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

const debugUser = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected');

        const user = await User.findOne({ email: 'mark@gmail.com' });
        if (user) {
            console.log('User ID:', user._id);
            console.log('User Email:', user.email);
            console.log('User Username:', user.username);
        } else {
            console.log('User mark@gmail.com not found');
        }

        await mongoose.connection.close();
    } catch (err) {
        console.error('Error:', err);
    }
};

debugUser();
