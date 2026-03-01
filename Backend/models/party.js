const mongoose = require('mongoose');

const politicalPartySchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    abbreviation: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    logo: { type: String, required: false },
    leader: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Candidate', // Use string reference to avoid circular dependency
    },
    foundingDate: {
        type: Date,
        required: true
    },
    headquarters: {
        addressLine1: { type: String, required: true },
        addressLine2: { type: String },
        city: { type: String, required: true },
        district: { type: String, required: true },
        province: { type: String, required: true }
    },
    candidates: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Candidate'
        }
    ],
    electionsParticipated: [
        {
            election: { type: mongoose.Schema.Types.ObjectId, ref: 'Election' },
            seatsWon: { type: Number, default: 0 },
            totalVotes: { type: Number, default: 0 }
        }
    ],
    contactDetails: {
        email: { type: String, required: true },
        phone: { type: String, required: true }
    },
    website: {
        type: String,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date
    }
});

// Middleware to update `updatedAt` before saving
politicalPartySchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('PoliticalParty', politicalPartySchema);