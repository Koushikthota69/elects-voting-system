const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// ✅ FIXED: Import models directly instead of mongoose.model()
const ParlimentaryElection = require('../models/ParlimentaryElection');
const Candidate = require('../models/candidate');
const User = require('../models/user');

const Service = require('../Services/GenericService');
const name = 'parlimentaryElection';


// Get All Parliamentary Elections
router.get('/', async (req, res) => {
    try {
        const elections = await ParlimentaryElection.find().sort({ date: -1 });

        res.status(200).json({
            success: true,
            data: elections
        });

    } catch (error) {

        console.error('❌ Get parliamentary elections error:', error);

        res.status(500).json({
            success: false,
            message: "Server Error: " + error.message
        });
    }
});


// Get Parliamentary Election By ID
router.get('/:id', async (req, res) => {

    try {

        const election = await ParlimentaryElection.findById(req.params.id);

        if (!election) {
            return res.status(404).json({
                success: false,
                message: "Election not found"
            });
        }

        res.status(200).json({
            success: true,
            data: election
        });

    } catch (error) {

        console.error('❌ Get parliamentary election by ID error:', error);

        res.status(500).json({
            success: false,
            message: "Server Error: " + error.message
        });
    }
});


// Get Election with candidates details
router.get('/election/:id', async (req, res) => {

    try {

        const election = await ParlimentaryElection.findById(req.params.id)
            .populate({
                path: 'candidates',
                populate: {
                    path: 'user',
                    model: 'User',
                    select: 'firstName lastName profilePhoto email'
                }
            });

        if (!election) {
            return res.status(404).json({
                success: false,
                message: "Election not found"
            });
        }

        res.status(200).json({
            success: true,
            data: election
        });

    } catch (error) {

        console.error('❌ Get parliamentary election with candidates error:', error);

        res.status(500).json({
            success: false,
            message: "Server Error: " + error.message
        });
    }
});


// Create Parliamentary Election
router.post('/', async (req, res) => {

    console.log('📥 Received parliamentary election creation request:', req.body);

    const { year, date, startTime, endTime, description, rules } = req.body;

    if (!year || !date || !startTime || !endTime || !description) {

        return res.status(400).json({
            success: false,
            message: "Please fill all required fields"
        });
    }

    try {

        const electionDate = new Date(date);

        if (isNaN(electionDate.getTime())) {

            return res.status(400).json({
                success: false,
                message: "Invalid date format"
            });
        }

        const newElection = new ParlimentaryElection({

            year: year.toString().trim(),

            date: date,

            startTime: startTime,

            endTime: endTime,

            description: description.trim(),

            rules: rules ? rules.trim() : '',

            candidates: [],

            results: {
                totalVotes: 0,
                voteDistribution: []
            },

            isCompleted: false
        });

        const savedElection = await newElection.save();

        console.log('✅ Parliamentary election created:', savedElection._id);

        res.status(201).json({
            success: true,
            message: "Parliamentary election created successfully",
            data: savedElection
        });

    } catch (error) {

        console.error('❌ Creation error:', error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


// Update Parliamentary Election
router.put('/:id', async (req, res) => {

    const { year, date, startTime, endTime, description, rules } = req.body;

    try {

        const election = await ParlimentaryElection.findById(req.params.id);

        if (!election) {

            return res.status(404).json({
                success: false,
                message: "Election not found"
            });
        }

        const updatedElection =
            await ParlimentaryElection.findByIdAndUpdate(

                req.params.id,

                {
                    year,
                    date,
                    startTime,
                    endTime,
                    description,
                    rules
                },

                { new: true, runValidators: true }
            );

        res.status(200).json({
            success: true,
            message: "Election updated successfully",
            data: updatedElection
        });

    } catch (error) {

        console.error('❌ Update error:', error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


// Apply for Parliamentary Election
router.post('/:id/apply', async (req, res) => {

    try {

        const userId = req.body.userId;

        if (!userId) {

            return res.status(400).json({
                success: false,
                message: "User ID required"
            });
        }

        const user = await User.findById(userId);

        if (!user) {

            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (!user.isCandidate) {

            return res.status(403).json({
                success: false,
                message: "Not registered as candidate"
            });
        }

        const election = await ParlimentaryElection.findById(req.params.id);

        const candidate = await Candidate.findOne({ user: userId });

        if (!candidate) {

            return res.status(404).json({
                success: false,
                message: "Candidate profile not found"
            });
        }

        if (election.candidates.includes(candidate._id)) {

            return res.status(400).json({
                success: false,
                message: "Already applied"
            });
        }

        election.candidates.push(candidate._id);

        await election.save();

        res.status(200).json({
            success: true,
            message: "Applied successfully"
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


// Vote
router.post('/:id/vote/:candidateId', async (req, res) => {

    const { voterId } = req.body;

    try {

        const election =
            await ParlimentaryElection.findById(req.params.id);

        if (!election) {

            return res.status(404).json({
                success: false,
                message: "Election not found"
            });
        }

        const alreadyVoted =
            election.results.voteDistribution.some(v =>
                v.voters.includes(voterId)
            );

        if (alreadyVoted) {

            return res.status(400).json({
                success: false,
                message: "Already voted"
            });
        }

        let vote =
            election.results.voteDistribution.find(
                v => v.candidateId == req.params.candidateId
            );

        if (vote) {

            vote.votes++;

            vote.voters.push(voterId);

        } else {

            election.results.voteDistribution.push({

                candidateId: req.params.candidateId,

                votes: 1,

                voters: [voterId]
            });
        }

        election.results.totalVotes++;

        await election.save();

        res.status(200).json({
            success: true,
            message: "Vote recorded"
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


// Get Results
router.get('/:id/results', async (req, res) => {

    try {

        const election =
            await ParlimentaryElection.findById(req.params.id)
                .populate('results.voteDistribution.candidateId');

        res.status(200).json({
            success: true,
            data: election.results
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


// Delete Election
router.delete('/:id', async (req, res) => {

    try {

        await Service.deleteById(
            req,
            res,
            ParlimentaryElection,
            name
        );

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


module.exports = router;