const mongoose = require('mongoose');
require('dotenv').config();
const cache = require('./services/cache');

const clearUserCache = async () => {
    try {
        const userId = '69edd4861b3b407a2b5c6535';
        console.log('Clearing cache for user:', userId);
        
        // Clear dashboard and profile stats cache
        cache.del(`dashboard:${userId}`);
        cache.del(`profile:${userId}:stats`);
        
        console.log('Cache cleared! Please refresh the app.');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

clearUserCache();
