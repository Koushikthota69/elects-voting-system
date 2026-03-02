const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
require('../models/ParlimentaryElection'); 

const ParlimentaryElection = mongoose.model('ParlimentaryElection');
const Candidate = mongoose.model('Candidate');
const User = mongoose.model('User');

const Service = require('../Services/GenericService');
const name = 'parlimentaryElection';

// Get All Parliamentary Elections
router.get('/', async (req, res) => {
    try {
        const elections = await ParlimentaryElection.find().sort({ date: -1 });
        res.status(200).json({ success: true, data: elections });
    } catch (error) {
        console.error('❌ Get parliamentary elections error:', error);
        res.status(500).json({ success: false, message: "Server Error: " + error.message });
    }
});

// Get Parliamentary Election By ID
router.get('/:id', async (req, res) => {
    try {
        const election = await ParlimentaryElection.findById(req.params.id);
        if (!election) {
            return res.status(404).json({ success: false, message: "Election not found" });
        }
        res.status(200).json({ success: true, data: election });
    } catch (error) {
        console.error('❌ Get parliamentary election by ID error:', error);
        res.status(500).json({ success: false, message: "Server Error: " + error.message });
    }
});

// Get Election with candidates details
router.get('/election/:id', async (req, res) => {
    try {
        const election = await ParlimentaryElection.findById(req.params.id).populate({
            path: 'candidates',
            populate: {
                path: 'user',
                model: 'User',
                select: 'firstName lastName profilePhoto email'
            }
        });

        if (!election) {
            return res.status(404).json({ success: false, message: "Election not found" });
        }

        res.status(200).json({ success: true, data: election });
    } catch (error) {
        console.error('❌ Get parliamentary election with candidates error:', error);
        res.status(500).json({ success: false, message: "Server Error: " + error.message });
    }
});

// ✅ FIXED: Add New Parliamentary Election with consistent date/time storage
router.post('/', async (req, res) => {
    console.log('📥 Received parliamentary election creation request:', req.body);

    const { year, date, startTime, endTime, description, rules } = req.body;

    // Validation
    if (!year || !date || !startTime || !endTime || !description) {
        return res.status(400).json({
            success: false,
            message: "Please fill all required fields: year, date, start time, end time, and description!"
        });
    }

    try {
        // Validate date format
        const electionDate = new Date(date);
        if (isNaN(electionDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Invalid date format. Please use YYYY-MM-DD format."
            });
        }

        // Validate time formats
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
            return res.status(400).json({
                success: false,
                message: "Invalid time format. Please use HH:MM format (24-hour)."
            });
        }

        // Check if end time is after start time
        const [startHours, startMinutes] = startTime.split(':');
        const [endHours, endMinutes] = endTime.split(':');

        const startDateTime = new Date(electionDate);
        startDateTime.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);

        const endDateTime = new Date(electionDate);
        endDateTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

        if (endDateTime <= startDateTime) {
            return res.status(400).json({
                success: false,
                message: "End time must be after start time."
            });
        }

        // Check if election date is in the future
        const currentDate = new Date();
        if (electionDate < currentDate) {
            return res.status(400).json({
                success: false,
                message: "Election date cannot be in the past."
            });
        }

        // Create election object with consistent string storage
        const newElection = new ParlimentaryElection({
            year: year.toString().trim(),
            date: electionDate,
            startTime: startTime,  // ✅ Store as string
            endTime: endTime,      // ✅ Store as string
            description: description.trim(),
            rules: rules ? rules.trim() : '',
            candidates: [],
            results: {
                totalVotes: 0,
                voteDistribution: []
            },
            isCompleted: false
        });

        console.log('💾 Saving parliamentary election to database...');

        const savedElection = await newElection.save();

        console.log('✅ Parliamentary election created successfully:', savedElection._id);

        res.status(201).json({
            success: true,
            message: "Parliamentary election created successfully!",
            data: savedElection
        });
    } catch (error) {
        console.error('❌ Parliamentary election creation error:', error);

        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation Error',
                errors: errors
            });
        }

        res.status(500).json({
            success: false,
            message: "Internal server error: " + error.message
        });
    }
});

// ✅ FIXED: Update Parliamentary Election with consistent date/time storage
router.put('/:id', async (req, res) => {
    const electionId = req.params.id;
    const { year, date, startTime, endTime, description, rules } = req.body;

    console.log('📥 Updating parliamentary election:', electionId, req.body);

    // Validation
    if (!year || !date || !startTime || !endTime || !description) {
        return res.status(400).json({
            success: false,
            message: "Please fill all required fields!"
        });
    }

    try {
        // Validate election exists
        const existingElection = await ParlimentaryElection.findById(electionId);
        if (!existingElection) {
            return res.status(404).json({
                success: false,
                message: 'Election not found'
            });
        }

        // Validate date format
        const electionDate = new Date(date);
        if (isNaN(electionDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Invalid date format."
            });
        }

        // Validate time formats
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
            return res.status(400).json({
                success: false,
                message: "Invalid time format. Please use HH:MM format."
            });
        }

        const updatedElection = await ParlimentaryElection.findByIdAndUpdate(
            electionId,
            {
                year: year.toString().trim(),
                date: electionDate,
                startTime: startTime,  // ✅ Store as string
                endTime: endTime,      // ✅ Store as string
                description: description.trim(),
                rules: rules ? rules.trim() : ''
            },
            {
                new: true,
                runValidators: true
            }
        );

        console.log('✅ Parliamentary election updated successfully:', updatedElection._id);

        res.status(200).json({
            success: true,
            message: 'Parliamentary election updated successfully',
            data: updatedElection
        });
    } catch (error) {
        console.error('❌ Error updating parliamentary election:', error);

        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation Error',
                errors: errors
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
});

// ✅ FIXED: Apply for Parliamentary Election
router.post('/:id/apply', async (req, res) => {
    try {
        console.log('🔍 Parliamentary election apply request:', req.params.id, req.body);

        const userId = req.body.userId;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        // Check if user exists and is candidate
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (!user.isCandidate) {
            return res.status(403).json({
                success: false,
                message: 'You cannot apply because you are not registered as a candidate.'
            });
        }

        const election = await ParlimentaryElection.findById(req.params.id);
        if (!election) {
            return res.status(404).json({
                success: false,
                message: 'Election not found'
            });
        }

        console.log('✅ Election found:', election.year);

        // Check candidate profile
        const candidate = await Candidate.findOne({ user: userId });
        if (!candidate) {
            return res.status(404).json({
                success: false,
                message: 'Candidate details not found. Please complete your candidate profile.'
            });
        }

        // Check if candidate is verified
        if (!candidate.isVerified) {
            return res.status(400).json({
                success: false,
                message: 'Your candidate profile is pending verification. Please wait for admin approval.'
            });
        }

        // Check if already applied
        if (election.candidates.includes(candidate._id)) {
            return res.status(400).json({
                success: false,
                message: 'You have already applied for this election.'
            });
        }

        // Add candidate to election
        election.candidates.push(candidate._id);
        await election.save();

        console.log('✅ Candidate applied successfully to parliamentary election');

        res.status(200).json({
            success: true,
            message: 'Applied successfully to parliamentary election',
            data: {
                election: election.year,
                candidate: {
                    _id: candidate._id,
                    user: candidate.user
                }
            }
        });

    } catch (error) {
        console.error('❌ Parliamentary election apply error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error: ' + error.message
        });
    }
});

// Enhanced voting endpoint for Parliamentary Election
router.post('/:id/vote/:candidateId', async (req, res) => {
    const { voterId } = req.body;
    const { candidateId, id: electionId } = req.params;

    console.log('🗳️ Parliamentary voting request:', { electionId, candidateId, voterId });

    if (!mongoose.isValidObjectId(electionId) || !mongoose.isValidObjectId(candidateId) || !mongoose.isValidObjectId(voterId)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid IDs provided'
        });
    }

    try {
        const election = await ParlimentaryElection.findById(electionId).populate('candidates');
        if (!election) {
            return res.status(404).json({
                success: false,
                message: 'Election not found'
            });
        }

        const voter = await User.findById(voterId);
        if (!voter) {
            return res.status(404).json({
                success: false,
                message: 'Voter not found'
            });
        }

        // ✅ FIXED: Check if election is active using consistent date/time parsing
        const currentDateTime = new Date();
        const electionDate = new Date(election.date);

        // Combine election date with start time (stored as string)
        const [startHours, startMinutes] = election.startTime.split(':');
        const electionStartDateTime = new Date(electionDate);
        electionStartDateTime.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);

        // Combine election date with end time (stored as string)
        const [endHours, endMinutes] = election.endTime.split(':');
        const electionEndDateTime = new Date(electionDate);
        electionEndDateTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

        console.log('⏰ Election time check:', {
            current: currentDateTime,
            start: electionStartDateTime,
            end: electionEndDateTime,
            startTime: election.startTime,
            endTime: election.endTime
        });

        if (currentDateTime < electionStartDateTime) {
            return res.status(400).json({
                success: false,
                message: 'Election has not started yet'
            });
        }

        if (currentDateTime > electionEndDateTime) {
            return res.status(400).json({
                success: false,
                message: 'Election has ended'
            });
        }

        const candidateExists = election.candidates.some(candidate =>
            candidate._id.toString() === candidateId
        );
        if (!candidateExists) {
            return res.status(404).json({
                success: false,
                message: 'Candidate not found in this election'
            });
        }

        const hasVoted = election.results.voteDistribution.some(vote =>
            vote.voters.some(voter => voter.toString() === voterId)
        );
        if (hasVoted) {
            return res.status(400).json({
                success: false,
                message: 'You have already voted in this election'
            });
        }

        const candidateVote = election.results.voteDistribution.find(vote =>
            vote.candidateId && vote.candidateId.toString() === candidateId
        );

        if (candidateVote) {
            candidateVote.votes += 1;
            candidateVote.voters.push(voterId);
        } else {
            election.results.voteDistribution.push({
                candidateId: candidateId,
                votes: 1,
                voters: [voterId]
            });
        }

        election.results.totalVotes += 1;
        await election.save();

        console.log('✅ Vote recorded successfully for parliamentary election');

        // Create audit log
        try {
            const AuditLog = mongoose.model('AuditLog');
            const auditLog = new AuditLog({
                action: 'VOTE_CAST',
                userId: voterId,
                electionId: electionId,
                candidateId: candidateId,
                timestamp: new Date(),
                ipAddress: req.ip,
                electionType: 'parliamentary'
            });
            await auditLog.save();
        } catch (auditError) {
            console.log('ℹ️ Audit log not created:', auditError.message);
        }

        res.status(200).json({
            success: true,
            message: 'Vote successfully recorded'
        });
    } catch (error) {
        console.error('❌ Parliamentary election voting error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error: ' + error.message
        });
    }
});

// Get Parliamentary Election results
router.get('/:id/results', async (req, res) => {
    try {
        console.log('📊 Fetching parliamentary election results:', req.params.id);

        const election = await ParlimentaryElection.findById(req.params.id)
            .populate({
                path: 'candidates',
                populate: {
                    path: 'user',
                    select: 'firstName lastName profilePhoto'
                }
            })
            .populate({
                path: 'results.voteDistribution.candidateId',
                populate: {
                    path: 'user',
                    select: 'firstName lastName profilePhoto'
                }
            });

        if (!election) {
            return res.status(404).json({
                success: false,
                message: 'Election not found'
            });
        }

        // Calculate winner
        let winner = null;
        let maxVotes = 0;
        let isTie = false;

        election.results.voteDistribution.forEach(vote => {
            if (vote.votes > maxVotes) {
                maxVotes = vote.votes;
                winner = vote.candidateId;
                isTie = false;
            } else if (vote.votes === maxVotes && vote.votes > 0) {
                isTie = true;
            }
        });

        // ✅ FIXED: Determine if election is completed using consistent date/time
        const currentDateTime = new Date();
        const electionDate = new Date(election.date);
        const [endHours, endMinutes] = election.endTime.split(':');
        const electionEndDateTime = new Date(electionDate);
        electionEndDateTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

        const results = {
            election: {
                _id: election._id,
                year: election.year,
                description: election.description,
                totalVotes: election.results.totalVotes,
                isCompleted: currentDateTime > electionEndDateTime
            },
            voteDistribution: election.results.voteDistribution,
            winner: isTie ? null : winner,
            isTie: isTie,
            totalCandidates: election.candidates.length,
            maxVotes: maxVotes
        };

        console.log('✅ Parliamentary election results calculated');

        res.status(200).json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('❌ Parliamentary election results error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching results: ' + error.message
        });
    }
});

// Delete an Election
router.delete('/:id', async (req, res) => {
    try {
        await Service.deleteById(req, res, ParlimentaryElection, name);
    } catch (error) {
        console.error('❌ Delete parliamentary election error:', error);
        res.status(500).json({
            success: false,
            message: "Server Error: " + error.message
        });
    }
});

module.exports = router;