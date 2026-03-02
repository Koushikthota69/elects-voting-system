const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
require('../models/ProvincialElection');
// ✅ FIXED: Use mongoose.model() instead of direct imports
const ProvincialElection = mongoose.model('ProvincialElection');
const Candidate = mongoose.model('Candidate');
const User = mongoose.model('User');

const Service = require('../Services/GenericService');
const name = 'provincialElection';

// Get All Provincial Elections
router.get('/', async (req, res) => {
    try {
        const elections = await ProvincialElection.find().sort({ date: -1 });
        res.status(200).json({ success: true, data: elections });
    } catch (error) {
        console.error('❌ Get provincial elections error:', error);
        res.status(500).json({ success: false, message: "Server Error: " + error.message });
    }
});

// Get Provincial Election by ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ success: false, message: 'Invalid election ID' });
    }

    try {
        const election = await ProvincialElection.findById(id).populate('candidates');

        if (!election) {
            return res.status(404).json({ success: false, message: 'Election not found' });
        }

        res.status(200).json({ success: true, data: election });
    } catch (error) {
        console.error('❌ Get provincial election by ID error:', error);
        res.status(500).json({ success: false, message: "Server Error: " + error.message });
    }
});

// Get Election By id (with candidates details)
router.get('/election/:id', async (req, res) => {
    try {
        const election = await ProvincialElection.findById(req.params.id).populate({
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
        console.error('❌ Get provincial election with candidates error:', error);
        res.status(500).json({ success: false, message: "Server Error: " + error.message });
    }
});

// ✅ FIXED: Add New Provincial Election with consistent date/time storage
router.post('/', async (req, res) => {
    console.log('📥 Received provincial election creation request:', req.body);

    const { year, date, startTime, endTime, description, rules, province } = req.body;

    if (!year || !date || !startTime || !endTime || !description || !province) {
        return res.status(400).json({
            success: false,
            message: "Please fill all required fields: year, date, start time, end time, description, and province!"
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
        let newElection = new ProvincialElection({
            year: year.toString().trim(),
            date: electionDate,
            startTime: startTime,  // ✅ Store as string
            endTime: endTime,      // ✅ Store as string
            description: description.trim(),
            rules: rules ? rules.trim() : '',
            province: province.trim(),
            candidates: [],
            results: {
                totalVotes: 0,
                voteDistribution: []
            },
            isCompleted: false
        });

        newElection = await newElection.save();

        if (!newElection) {
            return res.status(400).json({ success: false, message: "Election could not be added!" });
        }

        console.log('✅ Provincial election created successfully:', newElection._id);

        res.status(201).json({
            success: true,
            message: "Provincial election created successfully!",
            data: newElection
        });
    } catch (error) {
        console.error('❌ Provincial election creation error:', error);

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
            message: "Server Error: " + error.message
        });
    }
});

// ✅ FIXED: Update Provincial Election with consistent date/time storage
router.put('/:id', async (req, res) => {
    const electionId = req.params.id;
    const { year, date, startTime, endTime, description, rules, province } = req.body;

    console.log('📥 Updating provincial election:', electionId, req.body);

    try {
        // Validate election exists
        const existingElection = await ProvincialElection.findById(electionId);
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

        const election = await ProvincialElection.findByIdAndUpdate(
            electionId,
            {
                year: year.toString().trim(),
                date: electionDate,
                startTime: startTime,  // ✅ Store as string
                endTime: endTime,      // ✅ Store as string
                description: description.trim(),
                rules: rules ? rules.trim() : '',
                province: province.trim()
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!election) {
            return res.status(404).json({ success: false, message: 'Election not found' });
        }

        console.log('✅ Provincial election updated successfully:', election._id);

        res.status(200).json({
            success: true,
            message: 'Provincial election updated successfully',
            data: election
        });
    } catch (error) {
        console.error('❌ Error updating provincial election:', error);

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

// ✅ FIXED: Apply for Provincial Election
router.post('/:id/apply', async (req, res) => {
    try {
        console.log('🔍 Provincial election apply request:', req.params.id, req.body);

        const userId = req.body.userId;

        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        // Check if user exists and is candidate
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (!user.isCandidate) {
            return res.status(403).json({ success: false, message: 'You cannot apply because you are not a candidate' });
        }

        const election = await ProvincialElection.findById(req.params.id);
        if (!election) {
            return res.status(404).json({ success: false, message: 'Election not found' });
        }

        console.log('✅ Election found:', election.year, election.province);

        // ✅ FIXED: Check if election has ended using consistent date/time
        const currentDateTime = new Date();
        const electionDate = new Date(election.date);
        const [endHours, endMinutes] = election.endTime.split(':');
        const electionEndDateTime = new Date(electionDate);
        electionEndDateTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

        if (currentDateTime > electionEndDateTime) {
            return res.status(400).json({
                success: false,
                message: "Election has ended. You can't apply."
            });
        }

        const candidate = await Candidate.findOne({ user: userId });
        if (!candidate) {
            return res.status(404).json({
                success: false,
                message: 'Candidate details not found. Please complete your candidate profile.'
            });
        }

        if (!candidate.isVerified) {
            return res.status(400).json({
                success: false,
                message: 'Your candidate profile is pending verification. Please wait for admin approval before applying to elections.'
            });
        }

        if (election.candidates.includes(candidate._id)) {
            return res.status(400).json({
                success: false,
                message: 'You have already applied for this election.'
            });
        }

        election.candidates.push(candidate._id);
        await election.save();

        console.log('✅ Candidate applied successfully to provincial election');

        res.status(200).json({
            success: true,
            message: 'Applied successfully to provincial election',
            data: {
                election: {
                    year: election.year,
                    province: election.province
                },
                candidate: {
                    _id: candidate._id,
                    user: candidate.user
                }
            }
        });

    } catch (error) {
        console.error('❌ Provincial election apply error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error: ' + error.message
        });
    }
});

// ✅ FIXED: Enhanced voting endpoint for Provincial Election with consistent date/time
router.post('/:id/vote/:candidateId', async (req, res) => {
    const { voterId } = req.body;
    const { candidateId, id: electionId } = req.params;

    console.log('🗳️ Provincial voting request:', { electionId, candidateId, voterId });

    if (!mongoose.isValidObjectId(electionId) || !mongoose.isValidObjectId(candidateId) || !mongoose.isValidObjectId(voterId)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid IDs provided'
        });
    }

    try {
        const election = await ProvincialElection.findById(electionId).populate('candidates');
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

        // ✅ FIXED: Check if election is active using consistent date/time
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

        console.log('⏰ Provincial election time check:', {
            current: currentDateTime,
            start: electionStartDateTime,
            end: electionEndDateTime,
            startTime: election.startTime,
            endTime: election.endTime,
            province: election.province
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

        console.log('✅ Vote recorded successfully for provincial election');

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
                electionType: 'provincial',
                province: election.province
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
        console.error('❌ Provincial election voting error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error: ' + error.message
        });
    }
});

// ✅ FIXED: Get Provincial Election results with consistent date/time
router.get('/:id/results', async (req, res) => {
    try {
        console.log('📊 Fetching provincial election results:', req.params.id);

        const election = await ProvincialElection.findById(req.params.id)
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
                province: election.province,
                totalVotes: election.results.totalVotes,
                isCompleted: currentDateTime > electionEndDateTime
            },
            voteDistribution: election.results.voteDistribution,
            winner: isTie ? null : winner,
            isTie: isTie,
            totalCandidates: election.candidates.length,
            maxVotes: maxVotes
        };

        console.log('✅ Provincial election results calculated');

        res.status(200).json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('❌ Provincial election results error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching results: ' + error.message
        });
    }
});

// Delete an Election
router.delete('/:id', async (req, res) => {
    try {
        await Service.deleteById(req, res, ProvincialElection, name);
    } catch (error) {
        console.error('❌ Delete provincial election error:', error);
        res.status(500).json({
            success: false,
            message: "Server Error: " + error.message
        });
    }
});

module.exports = router;