const mongoose = require('mongoose');

const auditLogSchema = mongoose.Schema({
    action: {
        type: String,
        required: true,
        enum: ['VOTE_CAST', 'ELECTION_CREATED', 'CANDIDATE_APPLIED', 'USER_REGISTERED', 'ELECTION_UPDATED']
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    electionId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'electionModel'
    },
    electionModel: {
        type: String,
        enum: ['Election', 'PresidentialElection', 'ParlimentaryElection', 'ProvincialElection']
    },
    candidateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Candidate'
    },
    electionType: {
        type: String,
        enum: ['general', 'presidential', 'parliamentary', 'provincial']
    },
    province: {
        type: String
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    ipAddress: {
        type: String
    },
    details: {
        type: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true
});

// Index for better query performance
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ electionId: 1 });
auditLogSchema.index({ action: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);