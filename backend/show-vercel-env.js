require('dotenv').config();

console.log('\n📋 VERCEL DEPLOYMENT ENVIRONMENT VARIABLES\n');
console.log('=' .repeat(70));
console.log('\n⚠️  Copy these to your Vercel Dashboard → Project Settings → Environment Variables\n');

const envVars = [
  {
    key: 'MONGODB_URI',
    value: process.env.MONGODB_URI,
    description: 'MongoDB connection string',
    critical: true
  },
  {
    key: 'NODE_ENV',
    value: 'production',
    description: 'Node environment',
    critical: true
  },
  {
    key: 'JWT_SECRET',
    value: process.env.JWT_SECRET,
    description: 'JWT secret key for authentication',
    critical: true
  },
  {
    key: 'JWT_EXPIRE',
    value: process.env.JWT_EXPIRE || '7d',
    description: 'JWT token expiration',
    critical: false
  },
  {
    key: 'ADMIN_USERNAME',
    value: process.env.ADMIN_USERNAME,
    description: 'Initial admin username',
    critical: true
  },
  {
    key: 'ADMIN_PASSWORD',
    value: process.env.ADMIN_PASSWORD,
    description: 'Initial admin password',
    critical: true
  },
  {
    key: 'CLOUDINARY_CLOUD_NAME',
    value: process.env.CLOUDINARY_CLOUD_NAME,
    description: 'Cloudinary cloud name',
    critical: true
  },
  {
    key: 'CLOUDINARY_API_KEY',
    value: process.env.CLOUDINARY_API_KEY,
    description: 'Cloudinary API key',
    critical: true
  },
  {
    key: 'CLOUDINARY_API_SECRET',
    value: process.env.CLOUDINARY_API_SECRET,
    description: 'Cloudinary API secret',
    critical: true
  },
  {
    key: '***REMOVED***',
    value: process.env.***REMOVED***,
    description: 'Google OAuth client ID',
    critical: false
  },
  {
    key: '***REMOVED***',
    value: process.env.***REMOVED***,
    description: 'Google OAuth client secret',
    critical: false
  },
];

console.log('CRITICAL VARIABLES (Required):');
console.log('-'.repeat(70));

envVars
  .filter(v => v.critical)
  .forEach(({ key, value, description }) => {
    console.log(`\n${key}`);
    console.log(`  Description: ${description}`);
    console.log(`  Value: ${value || '⚠️  NOT SET'}`);
  });

console.log('\n\nOPTIONAL VARIABLES:');
console.log('-'.repeat(70));

envVars
  .filter(v => !v.critical)
  .forEach(({ key, value, description }) => {
    console.log(`\n${key}`);
    console.log(`  Description: ${description}`);
    console.log(`  Value: ${value || '(not set)'}`);
  });

console.log('\n\n' + '='.repeat(70));
console.log('\n📝 RECOMMENDED MONGODB_URI for Vercel (SRV format):\n');

// Try to convert current URI to SRV format
const currentUri = process.env.MONGODB_URI;
if (currentUri) {
  // Extract parts
  const match = currentUri.match(/mongodb:\/\/([^:]+):([^@]+)@([^\/]+)\/([^?]+)(\?(.+))?/);
  if (match) {
    const [, username, password, hosts, dbname, , params] = match;
    const clusterName = hosts.split('.')[0].replace(/-shard-00-00$/, '');
    const domain = hosts.split('.').slice(-3).join('.');
    
    console.log(`mongodb+srv://${username}:${password}@${clusterName}.${domain}/${dbname}?retryWrites=true&w=majority`);
    console.log('\n⚡ Benefits of SRV format:');
    console.log('  - Automatic server discovery');
    console.log('  - Better failover handling');
    console.log('  - Vercel-friendly DNS resolution');
    console.log('  - Shorter connection string');
  } else {
    console.log('Current URI:', currentUri);
  }
} else {
  console.log('⚠️  MONGODB_URI not set in .env file');
}

console.log('\n\n' + '='.repeat(70));
console.log('\n🚀 DEPLOYMENT STEPS:\n');
console.log('1. Go to https://vercel.com/dashboard');
console.log('2. Select your project');
console.log('3. Go to Settings → Environment Variables');
console.log('4. Add each variable above (one by one)');
console.log('5. Select "Production", "Preview", and "Development" environments');
console.log('6. Click "Save"');
console.log('7. Redeploy your project');
console.log('\n' + '='.repeat(70) + '\n');

console.log('💡 TIP: Test your connection with: node test-db-health.js\n');
