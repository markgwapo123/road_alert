# Quick Test Script for Local Development

# Test the user app with new configuration
echo "🚀 Testing User App Configuration"
cd users
echo "Building user app..."
npm run build

echo "🚀 Testing Admin App Configuration" 
cd ..
echo "Building admin app..."
npm run build

echo "✅ Build test complete!"
echo "💡 If builds succeed, your configuration is correct."
echo "🔧 Next step: Deploy backend to get production URL"
