const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/user');
const Candidate = require('../models/candidate');
const PoliticalParty = require('../models/party');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const multer = require('multer');
const cloudinaryStorage = require('../helpers/cloudinaryStorage');
const upload = multer({ storage: cloudinaryStorage });

const Service = require('../Services/GenericService')
const name = 'Candidate'

// Get all candidates - FIXED ROUTE
router.get('/', async (req, res) => {
    try {
        const result = await Candidate.find().populate('user').populate('party');
        if (result && result.length > 0) {
            res.status(200).json({ success: true, data: result, message: `All ${name} fetched successfully` })
        } else {
            res.status(404).json({ success: false, message: name + " not found!" })
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error: " + error.message })
    }
})

// Get Candidate By candidate ID - FIXED
router.get('/profile/:id', async (req, res) => {
    const id = req.params.id;

    try {
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ success: false, error: 'Invalid candidate ID format.' });
        }

        const candidate = await Candidate.findById(id).populate('user').populate('party');

        if (!candidate) {
            return res.status(404).json({ success: false, error: 'Candidate not found.' });
        }

        res.status(200).json({ success: true, data: candidate });
    } catch (error) {
        console.error('Error fetching candidate:', error.message);
        res.status(500).json({ success: false, error: 'An internal server error occurred. Please try again later.' });
    }
});

// Get Candidate By User id - FIXED
router.get('/user/profile/:id', async (req, res) => {
    const id = req.params.id;

    try {
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ success: false, error: 'Invalid user ID format.' });
        }

        const candidate = await Candidate.findOne({ user: id }).populate('user').populate('party');
        if (!candidate) {
            return res.status(404).json({ success: false, message: "Candidate not found" });
        }

        res.status(200).json({ success: true, data: candidate })
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error: " + error.message })
    }
})

// Get Candidates by political party and same district as user
router.get('/party/:partyid/:userid', async (req, res) => {
    try {
        const { partyid, userid } = req.params;

        const user = await User.findById(userid);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const party = await PoliticalParty.findById(partyid);
        if (!party) {
            return res.status(404).json({ success: false, message: 'Political Party not found' });
        }

        const candidates = await Candidate.find({ party: partyid })
            .populate({
                path: 'user',
                match: { district: user.district },
                select: 'firstName lastName profilePhoto district'
            });

        const filteredCandidates = candidates.filter(candidate => candidate.user !== null);

        return res.status(200).json({ success: true, candidates: filteredCandidates });

    } catch (error) {
        console.error('Error fetching candidates:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Delete an Candidate
router.delete('/:id', (req, res) => {
    Service.deleteById(req, res, Candidate, name).catch((error) => {
        res.status(500).send(error + " Server Error")
    })
})

// getCount
router.get('/get/count', (req, res) => {
    Service.getCount(res, Candidate, name).catch((error) => {
        res.status(500).send(error + " Server Error")
    })
})

// Update candidate details - FIXED VERSION
router.put('/:id', upload.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'nicFront', maxCount: 1 },
    { name: 'nicBack', maxCount: 1 },
    { name: 'realtimePhoto', maxCount: 1 }
]), async (req, res) => {
    try {
        console.log('Update candidate request body:', req.body);
        console.log('Update candidate request files:', req.files);

        const userId = req.params.id;

        // Find user first
        const userExist = await User.findById(userId);
        if (!userExist) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        let newPassword = userExist.passwordHash;
        if (req.body.password && req.body.password !== '') {
            newPassword = bcrypt.hashSync(req.body.password, 10);
        }

        // Handle file uploads
        const profilePhotoUrl = req.files?.profilePhoto ? req.files.profilePhoto[0].path : userExist.profilePhoto;
        const nicFrontUrl = req.files?.nicFront ? req.files.nicFront[0].path : userExist.nicFront;
        const nicBackUrl = req.files?.nicBack ? req.files.nicBack[0].path : userExist.nicBack;
        const realtimePhotoUrl = req.files?.realtimePhoto ? req.files.realtimePhoto[0].path : userExist.realtimePhoto;

        // Update user - SET isCandidate TO TRUE
        const user = await User.findByIdAndUpdate(
            userId,
            {
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                nic: req.body.nic,
                gender: req.body.gender,
                passwordHash: newPassword,
                email: req.body.email,
                phone: req.body.phone,
                addressline1: req.body.addressline1,
                addressline2: req.body.addressline2,
                city: req.body.city,
                district: req.body.district,
                province: req.body.province,
                isCandidate: true, // FORCE SET TO TRUE - This is the key fix!
                profilePhoto: profilePhotoUrl,
                nicFront: nicFrontUrl,
                nicBack: nicBackUrl,
                realtimePhoto: realtimePhotoUrl,
                photoUpdatedAt: new Date(),
                role: 'candidate' // Set role to candidate
            },
            { new: true }
        );

        if (!user) {
            return res.status(400).json({ success: false, message: 'The user cannot be updated!' });
        }

        // Find or create candidate
        let candidate = await Candidate.findOne({ user: userId });

        if (!candidate) {
            // Create new candidate if doesn't exist
            candidate = new Candidate({
                user: userId,
                skills: req.body.skills ? (Array.isArray(req.body.skills) ? req.body.skills : [req.body.skills]) : [],
                objectives: req.body.objectives ? (Array.isArray(req.body.objectives) ? req.body.objectives : [req.body.objectives]) : [],
                bio: req.body.bio || '',
                party: req.body.party || null,
                isVerified: false
            });
            await candidate.save();
        } else {
            // Update existing candidate
            candidate.skills = req.body.skills ? (Array.isArray(req.body.skills) ? req.body.skills : [req.body.skills]) : candidate.skills;
            candidate.objectives = req.body.objectives ? (Array.isArray(req.body.objectives) ? req.body.objectives : [req.body.objectives]) : candidate.objectives;
            candidate.bio = req.body.bio || candidate.bio;
            candidate.party = req.body.party || candidate.party;
            await candidate.save();
        }

        // Populate the candidate with user data for response
        const populatedCandidate = await Candidate.findById(candidate._id).populate('user').populate('party');

        res.status(200).json({
            success: true,
            message: 'Candidate profile updated successfully',
            data: {
                user: user,
                candidate: populatedCandidate
            }
        });

    } catch (error) {
        console.error('Update candidate error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred: ' + error.message
        });
    }
});

// Register as candidate - NEW ROUTE
router.post('/register', upload.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'nicFront', maxCount: 1 },
    { name: 'nicBack', maxCount: 1 },
    { name: 'realtimePhoto', maxCount: 1 }
]), async (req, res) => {
    try {
        const { userId, firstName, lastName, nic, gender, email, phone, addressline1, addressline2, city, district, province, skills, objectives, bio, party } = req.body;

        console.log('Candidate registration request:', req.body);
        console.log('Candidate registration files:', req.files);

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if already a candidate
        const existingCandidate = await Candidate.findOne({ user: userId });
        if (existingCandidate) {
            return res.status(400).json({
                success: false,
                message: 'User is already a candidate'
            });
        }

        // Handle file uploads
        const profilePhotoUrl = req.files?.profilePhoto ? req.files.profilePhoto[0].path : user.profilePhoto;
        const nicFrontUrl = req.files?.nicFront ? req.files.nicFront[0].path : user.nicFront;
        const nicBackUrl = req.files?.nicBack ? req.files.nicBack[0].path : user.nicBack;
        const realtimePhotoUrl = req.files?.realtimePhoto ? req.files.realtimePhoto[0].path : user.realtimePhoto;

        // Create new candidate
        const newCandidate = new Candidate({
            user: userId,
            skills: skills ? (Array.isArray(skills) ? skills : [skills]) : [],
            objectives: objectives ? (Array.isArray(objectives) ? objectives : [objectives]) : [],
            bio: bio || '',
            party: party || null,
            isVerified: false
        });

        await newCandidate.save();

        // Update user's candidate status
        user.isCandidate = true;
        user.role = 'candidate';
        user.firstName = firstName || user.firstName;
        user.lastName = lastName || user.lastName;
        user.nic = nic || user.nic;
        user.gender = gender || user.gender;
        user.email = email || user.email;
        user.phone = phone || user.phone;
        user.addressline1 = addressline1 || user.addressline1;
        user.addressline2 = addressline2 || user.addressline2;
        user.city = city || user.city;
        user.district = district || user.district;
        user.province = province || user.province;
        user.profilePhoto = profilePhotoUrl;
        user.nicFront = nicFrontUrl;
        user.nicBack = nicBackUrl;
        user.realtimePhoto = realtimePhotoUrl;
        user.photoUpdatedAt = new Date();
        await user.save();

        // Populate the candidate for response
        const populatedCandidate = await Candidate.findById(newCandidate._id).populate('user').populate('party');

        res.status(201).json({
            success: true,
            message: 'Successfully registered as candidate',
            data: {
                user: user,
                candidate: populatedCandidate
            }
        });

    } catch (error) {
        console.error('Candidate registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
});

// Emergency route to force candidate status
router.post('/force-candidate/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;

        // Update user
        const user = await User.findByIdAndUpdate(
            userId,
            {
                isCandidate: true,
                role: 'candidate'
            },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Create candidate if doesn't exist
        let candidate = await Candidate.findOne({ user: userId });
        if (!candidate) {
            candidate = new Candidate({
                user: userId,
                skills: ['General'],
                objectives: ['Serve the people'],
                bio: 'Candidate profile',
                isVerified: false
            });
            await candidate.save();
        }

        res.json({
            success: true,
            message: 'Forced candidate status to true',
            user: user,
            candidate: candidate
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Endpoint to vote for candidate
router.post('/:id/vote', async (req, res) => {
    const { userId, electionId } = req.body;

    if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(electionId)) {
        return res.status(400).json({ success: false, message: 'Invalid Candidate Id, User Id, or Election Id' });
    }

    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
        return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    // Check if the user has already voted in this election
    const alreadyVoted = await Candidate.findOne({
        votes: { $elemMatch: { voter: userId, election: electionId } }
    });

    if (alreadyVoted) {
        return res.status(400).json({ success: false, message: 'You have already voted in this election' });
    }

    // Add user vote
    candidate.votes.push({
        voter: userId,
        election: electionId,
        votedAt: new Date()
    });
    await candidate.save();

    res.status(200).json({ success: true, message: 'Vote cast successfully', data: candidate });
});

// Get pending verifications
router.get('/pending-verifications', async (req, res) => {
    try {
        const pendingUsers = await Candidate.find({ isVerified: false })
            .populate('user', 'firstName lastName email phone profilePhoto nicFront nicBack realtimePhoto')
            .populate('party', 'name');

        res.status(200).json({ success: true, users: pendingUsers });
    } catch (error) {
        console.error('Error fetching pending verifications:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// ✅ UPDATED: Fix candidate verification to handle both user and candidate updates
router.put('/verify/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { isVerified } = req.body;

        console.log('🔍 Verifying candidate for user:', userId, 'Status:', isVerified);

        // Find candidate by user ID
        const candidate = await Candidate.findOne({ user: userId }).populate('user');

        if (!candidate) {
            console.log('❌ Candidate not found for user:', userId);
            return res.status(404).json({
                success: false,
                message: 'Candidate not found for this user'
            });
        }

        console.log('✅ Candidate found:', candidate._id);
        console.log('📊 Current candidate verification:', candidate.isVerified);
        console.log('📊 Current user verification:', candidate.user?.isVerified);

        // Update candidate verification
        candidate.isVerified = isVerified;
        candidate.verifiedAt = isVerified ? new Date() : null;
        await candidate.save();

        // Also update user verification status
        if (candidate.user) {
            const user = await User.findById(userId);
            if (user) {
                user.isVerified = isVerified;
                await user.save();
                console.log('✅ User verification updated to:', user.isVerified);
            }
        }

        console.log('✅ Candidate verification updated to:', candidate.isVerified);

        // Populate the updated candidate for response
        const updatedCandidate = await Candidate.findOne({ user: userId })
            .populate('user')
            .populate('party');

        res.status(200).json({
            success: true,
            message: `Candidate ${isVerified ? 'approved' : 'rejected'} successfully`,
            data: updatedCandidate
        });

    } catch (error) {
        console.error('❌ Error updating verification status:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error: ' + error.message
        });
    }
});

// ✅ ADDED: Alternative route that accepts candidate ID (for backward compatibility)
router.put('/verify-by-candidate/:candidateId', async (req, res) => {
    try {
        const { candidateId } = req.params;
        const { isVerified } = req.body;

        console.log('🔍 Verifying candidate by candidate ID:', candidateId);

        const candidate = await Candidate.findById(candidateId).populate('user');

        if (!candidate) {
            return res.status(404).json({
                success: false,
                message: 'Candidate not found'
            });
        }

        // Update candidate verification
        candidate.isVerified = isVerified;
        candidate.verifiedAt = isVerified ? new Date() : null;
        await candidate.save();

        // Also update user verification status
        if (candidate.user) {
            const user = await User.findById(candidate.user._id);
            if (user) {
                user.isVerified = isVerified;
                await user.save();
            }
        }

        const updatedCandidate = await Candidate.findById(candidateId)
            .populate('user')
            .populate('party');

        res.status(200).json({
            success: true,
            message: `Candidate ${isVerified ? 'approved' : 'rejected'} successfully`,
            data: updatedCandidate
        });

    } catch (error) {
        console.error('Error updating verification status:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Route to get the count of pending verifications for candidates
router.get('/get/pendingcandidates/count', async (req, res) => {
    try {
        const pendingUsersCount = await Candidate.countDocuments({ isVerified: false });
        res.status(200).json({ success: true, count: pendingUsersCount });
    } catch (error) {
        console.error('Error fetching pending verifications count:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// ✅ ADDED: Fix missing candidate record for user
router.post('/fix-missing-candidate/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Check if candidate already exists
        const existingCandidate = await Candidate.findOne({ user: userId });
        if (existingCandidate) {
            return res.status(400).json({
                success: false,
                message: 'Candidate record already exists',
                candidate: existingCandidate
            });
        }

        // Create new candidate record
        const newCandidate = new Candidate({
            user: userId,
            skills: ['General'],
            objectives: ['Serve the community'],
            bio: 'Candidate profile',
            isVerified: true // Auto-verify since they were marked as candidate
        });

        await newCandidate.save();

        // Update user role if needed
        if (user.role !== 'candidate') {
            user.role = 'candidate';
            await user.save();
        }

        const populatedCandidate = await Candidate.findById(newCandidate._id).populate('user').populate('party');

        res.status(201).json({
            success: true,
            message: 'Candidate record created successfully',
            data: populatedCandidate
        });

    } catch (error) {
        console.error('Error fixing candidate record:', error);
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
});

// ✅ ADDED: Fix user status (if user shouldn't be candidate)
router.post('/fix-user-status/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;

        const user = await User.findByIdAndUpdate(
            userId,
            {
                isCandidate: false,
                role: 'voter'
            },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({
            success: true,
            message: 'User status updated to voter',
            user: user
        });

    } catch (error) {
        console.error('Error fixing user status:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ✅ ADDED: Fix all inconsistent users (bulk fix)
router.get('/fix-all-inconsistent-candidates', async (req, res) => {
    try {
        // Find users marked as candidates but missing candidate records
        const users = await User.find({ isCandidate: true });
        const fixedUsers = [];
        const errors = [];

        for (const user of users) {
            const candidate = await Candidate.findOne({ user: user._id });
            if (!candidate) {
                try {
                    // Create candidate record
                    const newCandidate = new Candidate({
                        user: user._id,
                        skills: ['General'],
                        objectives: ['Serve the community'],
                        bio: 'Candidate profile',
                        isVerified: true
                    });
                    await newCandidate.save();
                    fixedUsers.push(user._id);
                } catch (error) {
                    errors.push({ user: user._id, error: error.message });
                }
            }
        }

        res.json({
            success: true,
            message: `Fixed ${fixedUsers.length} users, ${errors.length} errors`,
            fixedUsers,
            errors
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;