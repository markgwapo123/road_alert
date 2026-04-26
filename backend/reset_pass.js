const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const User = require('./models/User');

const resetPassword = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected');

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('123456', salt);

        const result = await User.updateOne(
            { email: 'mark@gmail.com' },
            { $set: { password: hashedPassword } }
        );

        console.log('Password reset result:', result);

        await mongoose.connection.close();
    } catch (err) {
        console.error('Error:', err);
    }
};

resetPassword();
