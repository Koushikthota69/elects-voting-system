const express = require('express');
const router = express.Router();

const Election = require('../models/election');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const Candidate = mongoose.model('Candidate');
const emailService = require('../Services/emailService');

const getCurrentISTTime = () => {
    const now = new Date();
    return new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
};

const parseTimeToIST = (timeStr) => {
    if (!timeStr) return { hours: 0, minutes: 0 };
    try {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return { hours: isNaN(hours) ? 0 : hours, minutes: isNaN(minutes) ? 0 : minutes };
    } catch (error) {
        return { hours: 0, minutes: 0 };
    }
};

const createISTDateTime = (dateString, timeStr) => {
    try {
        const date = new Date(dateString);
        const time = parseTimeToIST(timeStr);
        const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), time.hours, time.minutes, 0, 0));
        return new Date(utcDate.getTime() + (5.5 * 60 * 60 * 1000));
    } catch (error) {
        return new Date();
    }
};

// Create new election
router.post('/', async (req, res) => {
    const { name, where, date, startTime, endTime, description, rules, electionType = 'general' } = req.body;
    const requiredFields = { name, where, date, startTime, endTime, description };
    const missingFields = Object.entries(requiredFields)
        .filter(([key, value]) => !value || (typeof value === 'string' && value.trim() === ''))
        .map(([key]) => key);

    if (missingFields.length > 0) {
        return res.status(400).json({ success: false, message: `Missing required fields: ${missingFields.join(', ')}` });
    }

    try {
        const formatTime = (timeStr) => {
            if (!timeStr) return '00:00';
            const parts = timeStr.split(':');
            return `${parts[0].padStart(2, '0')}:${parts[1] ? parts[1].padStart(2, '0') : '00'}`;
        };

        const formattedStartTime = formatTime(startTime);
        const formattedEndTime = formatTime(endTime);
        const currentIST = getCurrentISTTime();
        const electionDate = new Date(date);
        const currentDateOnly = new Date(currentIST.getFullYear(), currentIST.getMonth(), currentIST.getDate());
        const electionDateOnly = new Date(electionDate.getFullYear(), electionDate.getMonth(), electionDate.getDate());

        if (electionDateOnly < currentDateOnly) {
            return res.status(400).json({ success: false, message: "Election date cannot be in the past." });
        }

        const startIST = createISTDateTime(date, formattedStartTime);
        const endIST = createISTDateTime(date, formattedEndTime);

        if (endIST <= startIST) {
            return res.status(400).json({ success: false, message: "End time must be after start time." });
        }

        const election = new Election({
            name: name.trim(), where: where.trim(), date,
            startTime: formattedStartTime, endTime: formattedEndTime,
            description: description.trim(), rules: rules ? rules.trim() : '',
            electionType, candidates: [], status: 'upcoming',
            createdAt: new Date(), updatedAt: new Date()
        });

        const savedElection = await election.save();
        console.log('✅ Election created:', savedElection._id);
        res.status(201).json({ success: true, message: "Election created successfully!", data: savedElection });

    } catch (error) {
        console.error('❌ Election creation error:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: 'Validation Error', errors: Object.values(error.errors).map(e => e.message) });
        }
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Election with this name already exists' });
        }
        res.status(500).json({ success: false, message: "Internal server error: " + error.message });
    }
});

// Get all elections
router.get('/', async (req, res) => {
    try {
        const elections = await Election.find().populate('candidates').sort({ date: 1 });
        res.status(200).json({ success: true, data: elections, count: elections.length });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error: " + error.message });
    }
});

// Get count - MUST BE BEFORE /:id
router.get('/get/count', async (req, res) => {
    try {
        const count = await Election.countDocuments();
        res.status(200).json({ success: true, count });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error: " + error.message });
    }
});

// Get by /election/:id path - MUST BE BEFORE /:id
router.get('/election/:id', async (req, res) => {
    try {
        const election = await Election.findById(req.params.id).populate('candidates');
        if (!election) return res.status(404).json({ success: false, message: "Election not found" });
        res.status(200).json({ success: true, data: election });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error: " + error.message });
    }
});

// Get by ID
router.get('/:id', async (req, res) => {
    try {
        const election = await Election.findById(req.params.id).populate('candidates');
        if (!election) return res.status(404).json({ success: false, message: "Election not found" });
        res.status(200).json({ success: true, data: election });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error: " + error.message });
    }
});

// Delete election
router.delete('/:id', async (req, res) => {
    try {
        const election = await Election.findByIdAndDelete(req.params.id);
        if (!election) return res.status(404).json({ success: false, message: "Election not found" });
        res.status(200).json({ success: true, message: "Election deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error: " + error.message });
    }
});

// Apply for election
router.post('/:id/apply', async (req, res) => {
    try {
        const { userId } = req.body;
        const electionId = req.params.id;

        if (!userId) return res.status(400).json({ success: false, message: "User ID is required" });

        const election = await Election.findById(electionId);
        if (!election) return res.status(404).json({ success: false, message: "Election not found" });

        const candidate = await Candidate.findOne({ user: userId });
        if (!candidate) return res.status(404).json({ success: false, message: "Candidate profile not found" });

        if (election.candidates.map(c => c.toString()).includes(candidate._id.toString())) {
            return res.status(400).json({ success: false, message: "You have already applied for this election" });
        }

        election.candidates.push(candidate._id);
        await election.save();
        res.status(200).json({ success: true, message: "Successfully applied for the election" });
    } catch (error) {
        console.error('❌ Apply error:', error);
        res.status(500).json({ success: false, message: "Server Error: " + error.message });
    }
});

// Vote in election - WITH EMAIL
router.post('/:electionId/vote/:candidateId', async (req, res) => {
    try {
        const { electionId, candidateId } = req.params;
        const { userId } = req.body;

        console.log(`🗳️ Vote - Election: ${electionId}, Candidate: ${candidateId}, User: ${userId}`);

        if (!userId) {
            return res.status(400).json({ success: false, message: "User ID is required" });
        }

        const election = await Election.findById(electionId);
        if (!election) {
            return res.status(404).json({ success: false, message: "Election not found" });
        }

        if (!election.isActive()) {
            return res.status(400).json({ success: false, message: "Election is not currently active" });
        }

        // ✅ FIX: Compare as strings
        const alreadyVoted = election.results.voteDistribution.some(vd =>
            vd.voters.map(v => v.toString()).includes(userId.toString())
        );

        if (alreadyVoted) {
            return res.status(400).json({ success: false, message: "You have already voted in this election" });
        }

        let candidateVoteEntry = election.results.voteDistribution.find(
            vd => vd.candidateId.toString() === candidateId.toString()
        );

        if (!candidateVoteEntry) {
            election.results.voteDistribution.push({ candidateId, votes: 0, voters: [] });
            candidateVoteEntry = election.results.voteDistribution[election.results.voteDistribution.length - 1];
        }

        candidateVoteEntry.votes += 1;
        candidateVoteEntry.voters.push(userId);
        election.results.totalVotes += 1;

        await election.save();
        console.log('✅ Vote saved successfully');

        // ✅ Send confirmation email (non-blocking)
        try {
            const user = await User.findById(userId);
            const candidate = await Candidate.findById(candidateId).populate('user');
            if (user && candidate) {
                emailService.sendVoteConfirmation(user, election, candidate)
                    .then(() => console.log('✅ Vote confirmation email sent to:', user.email))
                    .catch(e => console.error('❌ Email failed:', e.message));
            }
        } catch (emailError) {
            console.error('❌ Email setup failed:', emailError.message);
        }

        res.status(200).json({ success: true, message: "Vote cast successfully" });

    } catch (error) {
        console.error('❌ Vote error:', error);
        res.status(500).json({ success: false, message: "Server Error: " + error.message });
    }
});

module.exports = router;