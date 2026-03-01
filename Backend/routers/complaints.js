const express = require('express');
const router = express.Router();
const Complaint = require('../models/complaint');
const User = require('../models/user');
const Candidate = require('../models/candidate');

const multer = require('multer');
const cloudinaryStorage = require('../helpers/cloudinaryStorage');
const uploadFile = multer({ storage: cloudinaryStorage });

// ✅ FIXED: Get complaints by user ID
router.get('/comp/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        console.log('🔍 Fetching complaints for user ID:', userId);

        // Find candidate by user ID
        const candidate = await Candidate.findOne({ user: userId });
        if (!candidate) {
            return res.status(200).json({
                success: true,
                data: [],
                message: 'No candidate found for this user'
            });
        }

        // Get complaints against this candidate
        const complaints = await Complaint.find({
            candidate: candidate._id
        })
        .populate('user', 'firstName lastName email profilePhoto')
        .populate('candidate', 'user')
        .sort({ createdAt: -1 });

        console.log(`✅ Found ${complaints.length} complaints for candidate ${candidate._id}`);

        res.status(200).json({
            success: true,
            data: complaints,
            count: complaints.length
        });

    } catch (error) {
        console.error('❌ Error fetching complaints:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching complaints: ' + error.message
        });
    }
});

// ✅ FIXED: Get complaints filed by user
router.get('/comp/owner/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;

        const complaints = await Complaint.find({
            user: userId
        })
        .populate('candidate', 'user')
        .populate('user', 'firstName lastName email profilePhoto')
        .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: complaints,
            count: complaints.length
        });

    } catch (error) {
        console.error('Error fetching user complaints:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching user complaints'
        });
    }
});

// ✅ FIXED: Get reviewed complaints by user ID
router.get('/comp/reviewed/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;

        // Find candidate by user ID
        const candidate = await Candidate.findOne({ user: userId });
        if (!candidate) {
            return res.status(200).json({
                success: true,
                data: [],
                message: 'No candidate found for this user'
            });
        }

        const complaints = await Complaint.find({
            candidate: candidate._id,
            isReviewed: true
        })
        .populate('user', 'firstName lastName email profilePhoto')
        .populate('candidate', 'user')
        .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: complaints,
            count: complaints.length
        });

    } catch (error) {
        console.error('Error fetching reviewed complaints:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching reviewed complaints'
        });
    }
});

// ✅ FIXED: Create a new complaint
router.post('/', uploadFile.array('proofs', 5), async (req, res) => {
    try {
        const { user, candidate, title, description } = req.body;
        const proofFiles = req.files ? req.files.map(file => file.path) : [];

        // Validate required fields
        if (!title || !description || !user || !candidate) {
            return res.status(400).json({
                success: false,
                message: 'Title, description, user, and candidate are required'
            });
        }

        const complaint = new Complaint({
            user,
            candidate,
            title,
            description,
            proofs: proofFiles
        });

        const savedComplaint = await complaint.save();

        // Populate the saved complaint
        await savedComplaint.populate('user', 'firstName lastName email profilePhoto');
        await savedComplaint.populate('candidate', 'user');

        res.status(201).json({
            success: true,
            message: 'Complaint submitted successfully',
            data: savedComplaint
        });

    } catch (error) {
        console.error('Error creating complaint:', error);
        res.status(500).json({
            success: false,
            message: 'Server error creating complaint: ' + error.message
        });
    }
});

// ✅ FIXED: Get all complaints (for admin)
router.get('/', async (req, res) => {
    try {
        const complaints = await Complaint.find()
            .populate('user', 'firstName lastName email profilePhoto')
            .populate('candidate', 'user')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: complaints,
            count: complaints.length
        });

    } catch (error) {
        console.error('Error fetching all complaints:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching complaints'
        });
    }
});

// ✅ FIXED: Get pending review complaints (for admin)
router.get('/show/pending-reviews', async (req, res) => {
    try {
        const complaints = await Complaint.find({ isReviewed: false })
            .populate('user', 'firstName lastName email profilePhoto')
            .populate('candidate', 'user')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: complaints,
            count: complaints.length
        });

    } catch (error) {
        console.error('Error fetching pending complaints:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching pending complaints'
        });
    }
});

// ✅ FIXED: Update complaint status
router.put('/review/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { isReviewed, reviewComments } = req.body;

        const complaint = await Complaint.findByIdAndUpdate(
            id,
            {
                isReviewed: isReviewed !== undefined ? isReviewed : false,
                reviewComments: reviewComments || '',
                reviewedAt: isReviewed ? new Date() : null
            },
            { new: true }
        )
        .populate('user', 'firstName lastName email profilePhoto')
        .populate('candidate', 'user');

        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        res.status(200).json({
            success: true,
            message: `Complaint ${isReviewed ? 'reviewed' : 'pending'}`,
            data: complaint
        });

    } catch (error) {
        console.error('Error updating complaint:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating complaint'
        });
    }
});

// ✅ FIXED: Delete complaint
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const complaint = await Complaint.findByIdAndDelete(id);

        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Complaint deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting complaint:', error);
        res.status(500).json({
            success: false,
            message: 'Server error deleting complaint'
        });
    }
});

// ✅ FIXED: Get pending verifications count
router.get('/get/pendingverifications/count', async (req, res) => {
    try {
        const pendingComplaintsCount = await Complaint.countDocuments({ isReviewed: false });
        res.status(200).json({
            success: true,
            count: pendingComplaintsCount
        });
    } catch (error) {
        console.error('Error fetching pending verifications count:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;