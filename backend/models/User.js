const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true,
        minLength: 3,
        maxLength: 50 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: { 
        type: String, 
        required: true,
        minLength: 6 
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date,
        default: null
    },
    lastActivity: {
        type: Date,
        default: Date.now
    },
    profile: {
        firstName: String,
        lastName: String,
        phone: String,
        profileImage: String
    },
    isFrozen: {
        type: Boolean,
        default: false
    },
    frozenAt: {
        type: Date,
        default: null
    },
    frozenBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null
    },
    freezeReason: {
        type: String,
        default: null
    },
    socialLogin: {
        provider: {
            type: String,
            enum: ['google', 'facebook'],
            default: null
        },
        providerId: {
            type: String,
            default: null
        },
        picture: {
            type: String,
            default: null
        }
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Update last login
userSchema.methods.updateLastLogin = function() {
    this.lastLogin = new Date();
    return this.save();
};

// Update last activity
userSchema.methods.updateLastActivity = function() {
    this.lastActivity = new Date();
    return this.save();
};

// Check if user is online (active within last 5 minutes)
userSchema.methods.isOnline = function() {
    if (!this.lastActivity) return false;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.lastActivity > fiveMinutesAgo;
};

// Check if user can submit reports (not frozen)
userSchema.methods.canSubmitReports = function() {
    return !this.isFrozen && this.isActive;
};

module.exports = mongoose.model('User', userSchema);
