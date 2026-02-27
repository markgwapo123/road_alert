const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  try {    // Connect directly with connection string
    await mongoose.connect('mongodb+srv://markstephenmagbatos:your_password@cluster0.mx6qk3q.mongodb.net/roadalert?retryWrites=true&w=majority&appName=Cluster0');
    console.log('\x1b[31mConnected to MongoDB\x1b[0m');

    // Simple admin schema
    const AdminSchema = new mongoose.Schema({
      username: String,
      password: String,
      email: String,
      role: { type: String, default: 'admin' },
      isActive: { type: Boolean, default: true }
    });

    // Add password comparison method
    AdminSchema.methods.comparePassword = async function (candidatePassword) {
      return await bcrypt.compare(candidatePassword, this.password);
    };

    const Admin = mongoose.model('Admin', AdminSchema);    // Delete existing admins
    await Admin.deleteMany({});
    console.log('\x1b[31mCleared existing admins\x1b[0m');

    // Hash password manually
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    // Create admin directly
    const admin = await Admin.create({
      username: 'admin',
      password: hashedPassword,
      email: 'admin@roadalert.com',
      role: 'admin',
      isActive: true
    }); console.log('\x1b[31mAdmin created:\x1b[0m', admin.username);

    // Test password
    const testResult = await admin.comparePassword('admin123');
    console.log('\x1b[31mPassword test:\x1b[0m', testResult ? 'PASSED' : 'FAILED');

    console.log('\x1b[31m✅ Use these credentials to login:\x1b[0m');
    console.log('\x1b[31mUsername: admin\x1b[0m');
    console.log('\x1b[31mPassword: admin123\x1b[0m');

    process.exit(0);
  } catch (error) {
    console.error('\x1b[31mError:\x1b[0m', error);
    process.exit(1);
  }
}

createAdmin();
