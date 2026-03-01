const mongoose = require('mongoose');

const candidateSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    party: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PoliticalParty',
        required: false
    },
    skills: {
        type: [String],
        default: []
    },
    objectives: {
        type: [String],
        default: []
    },
    bio: {
        type: String,
        default: ''
    },
    // ✅ FIXED: Add voters array for compatibility with election routes
    voters: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    votes: [{
        voter: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'User' 
        },
        election: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Election' 
        },
        votedAt: {
            type: Date,
            default: Date.now
        }
    }],
    isVerified: {  
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Candidate', candidateSchema);