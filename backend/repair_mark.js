const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const User = require('./models/User');
const Report = require('./models/Report');
const Notification = require('./models/Notification');

const repairAccount = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected');

        const oldId = '692e5d4efba3b30bd1e197b2';
        const email = 'mark@gmail.com';
        const username = 'markstephen';

        // 1. Rename old user
        console.log('Renaming old user...');
        await User.updateOne(
            { _id: oldId },
            { $set: { email: 'mark_backup@gmail.com', username: 'markstephen_backup' } }
        );

        // 2. Create new user
        console.log('Creating fresh user...');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('123456', salt);
        
        const newUser = await User.create({
            email,
            username,
            password: hashedPassword,
            profile: {
                firstName: 'Mark',
                lastName: 'Stephen',
                fullName: 'Mark Stephen'
            }
        });
        const newId = newUser._id;
        console.log('New User created with ID:', newId);

        // 3. Transfer Reports
        console.log('Transferring reports...');
        const reportsResult = await Report.updateMany(
            { 'reportedBy.id': oldId },
            { $set: { 'reportedBy.id': newId } }
        );
        console.log('Reports transferred:', reportsResult.modifiedCount);

        // 4. Transfer Notifications
        console.log('Transferring notifications...');
        const notifsResult = await Notification.updateMany(
            { userId: oldId },
            { $set: { userId: newId } }
        );
        console.log('Notifications transferred:', notifsResult.modifiedCount);

        console.log('Repair complete!');

        await mongoose.connection.close();
    } catch (err) {
        console.error('Error during repair:', err);
    }
};

repairAccount();
