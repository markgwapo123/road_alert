const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://markstephen:your_password@cluster0.mx6qk3q.mongodb.net/roadalertsystem?retryWrites=true&w=majority&appName=Cluster0')
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

const User = require('./models/User');

async function testFreeze() {
  try {
    console.log('\n=== Testing Freeze Functionality ===\n');

    // Get a user to test with
    const user = await User.findOne();
    if (!user) {
      console.log('No users found for testing');
      return;
    }

    console.log(`Testing with user: ${user.username || user.email}`);
    console.log(`Current freeze status: ${user.isFrozen}`);
    console.log(`Current active status: ${user.isActive}`);
    console.log(`Can submit reports: ${user.canSubmitReports()}`);

    // Test freezing the user
    user.isFrozen = true;
    user.frozenAt = new Date();
    await user.save();

    console.log('\n--- After freezing ---');
    console.log(`Freeze status: ${user.isFrozen}`);
    console.log(`Can submit reports: ${user.canSubmitReports()}`);

    // Test unfreezing the user
    user.isFrozen = false;
    user.frozenAt = null;
    await user.save();

    console.log('\n--- After unfreezing ---');
    console.log(`Freeze status: ${user.isFrozen}`);
    console.log(`Can submit reports: ${user.canSubmitReports()}`);

    console.log('\n✅ Freeze functionality test completed!');

  } catch (error) {
    console.error('❌ Error testing freeze:', error);
  } finally {
    mongoose.connection.close();
  }
}

testFreeze();