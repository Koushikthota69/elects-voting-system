const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    nic: {
        type: String,
        required: true,
        unique: true
    },
    gender: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    passwordHash: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    addressline1: {
        type: String,
        default: ''
    },
    addressline2: {
        type: String,
        default: ''
    },
    city: {
        type: String,
        required: true
    },
    district: {
        type: String,
        required: true
    },
    province: {
        type: String,
        required: true
    },
    profilePhoto: {
        type: String,
        default: ''
    },
    nicFront: {
        type: String,
        default: ''
    },
    nicBack: {
        type: String,
        default: ''
    },
    realtimePhoto: {
        type: String,
        default: ''
    },
    faceEncoding: {
        type: [Number],
        default: null
    },
    isFaceRegistered: {
        type: Boolean,
        default: false
    },
    photoUpdatedAt: {
        type: Date,
        default: Date.now,
    },
    role: {
        type: String,
        enum: ['voter', 'admin', 'candidate'],
        default: 'voter'
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    isCandidate: {
        type: Boolean,
        default: false
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date
}, {
    timestamps: true
});

// ✅ REMOVED the pre-save hook to avoid double hashing
// Password hashing is now handled only in the registration route

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    const bcrypt = require('bcryptjs');
    return await bcrypt.compare(candidatePassword, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);