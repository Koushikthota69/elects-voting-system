const mongoose = require('mongoose');

const electionSchema = mongoose.Schema({
    name: { type: String, required: true },
    where: { type: String, required: true },
    date: { type: String, required: true },  // ✅ CHANGED: Date -> String
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    description: { type: String, required: true },
    rules: { type: String },
    candidates: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Candidate' }],
    parties: [{ type: mongoose.Schema.Types.ObjectId, ref: 'PoliticalParty' }],
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

// ✅ Virtual for formatted date
electionSchema.virtual('formattedDate').get(function() {
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

// ✅ Method to check if election is active
electionSchema.methods.isActive = function() {
    try {
        const now = new Date();
        const electionDate = new Date(this.date);

        const [startHours, startMinutes] = this.startTime.split(':');
        const [endHours, endMinutes] = this.endTime.split(':');

        const startDateTime = new Date(electionDate);
        startDateTime.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);

        const endDateTime = new Date(electionDate);
        endDateTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

        return now >= startDateTime && now <= endDateTime;
    } catch (error) {
        return false;
    }
};

// ✅ FIX: Register the model directly (not via exports.Election)
// This ensures mongoose.model('Election') works everywhere
const Election = mongoose.model('Election', electionSchema);

module.exports = Election;