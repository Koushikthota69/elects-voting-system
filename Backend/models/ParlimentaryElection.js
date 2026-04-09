const mongoose = require('mongoose');

const ParlimentaryElectionSchema = mongoose.Schema({
    year: { type: String, required: true },
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    description: { type: String, required: true },
    rules: { type: String },
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

ParlimentaryElectionSchema.virtual('formattedDate').get(function() {
    if (!this.date) return 'Invalid Date';
    try {
        const date = new Date(this.date);
        return date.toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    } catch (error) {
        return 'Invalid Date';
    }
});

// ✅ FIXED isActive
ParlimentaryElectionSchema.methods.isActive = function() {
    try {
        const now = new Date();

        const electionDate = new Date(this.date);
        const [startHours, startMinutes] = this.startTime.split(':').map(Number);
        const [endHours, endMinutes] = this.endTime.split(':').map(Number);

        const startIST = new Date(Date.UTC(
            electionDate.getFullYear(),
            electionDate.getMonth(),
            electionDate.getDate(),
            startHours, startMinutes, 0, 0
        ));
        const startUTC = new Date(startIST.getTime() - (5.5 * 60 * 60 * 1000));

        const endIST = new Date(Date.UTC(
            electionDate.getFullYear(),
            electionDate.getMonth(),
            electionDate.getDate(),
            endHours, endMinutes, 0, 0
        ));
        const endUTC = new Date(endIST.getTime() - (5.5 * 60 * 60 * 1000));

        console.log('🕐 Now (UTC):', now.toISOString());
        console.log('⏰ Start (UTC):', startUTC.toISOString());
        console.log('⏰ End (UTC):', endUTC.toISOString());
        console.log('✅ isActive:', now >= startUTC && now <= endUTC);

        return now >= startUTC && now <= endUTC;
    } catch (error) {
        console.error('❌ isActive error:', error);
        return false;
    }
};

const ParlimentaryElection = mongoose.model('ParlimentaryElection', ParlimentaryElectionSchema);
module.exports = ParlimentaryElection;