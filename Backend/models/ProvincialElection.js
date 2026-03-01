const mongoose = require('mongoose');

const ProvincialElectionSchema = mongoose.Schema({
    year: { type: String, required: true },
    date: { type: String, required: true },  // ✅ CHANGED: Date -> String
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    description: { type: String, required: true },
    rules: { type: String },
    province: { type: String, required: true },
    candidates: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Candidate' }],
    results: {
        totalVotes: { type: Number, default: 0 },
        winningCandidate: {
            candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate' },
            name: { type: String }
        },
        winningParty: {
            partyId: { type: mongoose.Schema.Types.ObjectId, ref: 'PoliticalParty' },
            name: { type: String }
        },
        voteDistribution: [{
            candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate' },
            votes: { type: Number, default: 0 },
            voters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
        }]
    },
    isCompleted: { type: Boolean, default: false }
});

// ✅ ADD: Virtual for formatted date
ProvincialElectionSchema.virtual('formattedDate').get(function() {
    if (!this.date) return 'Invalid Date';
    try {
        const date = new Date(this.date);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        return 'Invalid Date';
    }
});

const ProvincialElection = mongoose.model('ProvincialElection', ProvincialElectionSchema);
module.exports = { ProvincialElection };