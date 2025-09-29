#!/bin/bash

# Road Alert Deployment Script
echo "🚀 Starting Road Alert Deployment Process..."

# Check if we're in the users directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the users directory"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building project..."
npm run build

# Check if build was successful
if [ -d "dist" ]; then
    echo "✅ Build successful! dist folder created."
    echo "📁 Build size:"
    du -sh dist/
    echo ""
    echo "🎯 Ready for Vercel deployment!"
    echo ""
    echo "Next steps:"
    echo "1. Go to vercel.com"
    echo "2. Connect your GitHub repository"
    echo "3. Set root directory to 'users'"
    echo "4. Deploy!"
    echo ""
    echo "Or use Vercel CLI:"
    echo "  npx vercel --prod"
else
    echo "❌ Build failed! Check the errors above."
    exit 1
fi