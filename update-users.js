const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://markstephen:i9bU0kJdMXADODWz@cluster0.mx6qk3q.mongodb.net/roadalertsystem?retryWrites=true&w=majority&appName=Cluster0')
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

const User = require('./models/User');

async function updateExistingUsers() {
  try {
    console.log('\n=== Updating Existing Users for Freeze System ===\n');

    // Update all users to have isFrozen: false if not set
    const result = await User.updateMany(
      { isFrozen: { $exists: false } }, 
      { 
        $set: { 
          isFrozen: false,
          frozenAt: null,
          frozenBy: null,
          freezeReason: null
        } 
      }
    );

    console.log(`Updated ${result.modifiedCount} users with freeze fields`);

    // Get all users to verify
    const users = await User.find({}, 'username email isFrozen isActive');
    console.log(`\nFound ${users.length} users:`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username || user.email} - Active: ${user.isActive} - Frozen: ${user.isFrozen}`);
    });

    console.log('\n✅ User update completed successfully!');
    
  } catch (error) {
    console.error('❌ Error updating users:', error);
  } finally {
    mongoose.connection.close();
  }
}

updateExistingUsers();