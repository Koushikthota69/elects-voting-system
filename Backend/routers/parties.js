const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// ✅ FIXED IMPORTS - Remove curly braces for default exports
const PoliticalParty = require('../models/party');
// Remove Candidate import since it's not used in this file and causes circular dependency

const multer = require('multer');
const cloudinaryStorage = require('../helpers/cloudinaryStorage');
const upload = multer({ storage: cloudinaryStorage });

// ✅ ADD DEBUG MIDDLEWARE
router.use((req, res, next) => {
  console.log('🔍 Parties route - PoliticalParty model:',
    PoliticalParty && typeof PoliticalParty.find === 'function' ? '✅ OK' : '❌ BROKEN');
  next();
});

// Get all parties
router.get('/', async (req, res) => {
    try {
        const parties = await PoliticalParty.find();
        res.status(200).json({ success: true, parties });
    } catch (error) {
        console.error('Error fetching parties:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Get all names of parties
router.get('/party', async (req, res) => {
    try {
        const parties = await PoliticalParty.find();
        res.status(200).json({ success: true, data: parties });
    } catch (error) {
        console.error('Error fetching parties:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Get party by ID
router.get('/:id', async (req, res) => {
    try {
        const party = await PoliticalParty.findById(req.params.id).populate('leader candidates electionsParticipated.election');
        if (!party) {
            return res.status(404).json({ success: false, message: 'Party not found' });
        }
        res.status(200).json({ success: true, party });
    } catch (error) {
        console.error('Error fetching party:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Create a new party
router.post('/', upload.single('logo'), async (req, res) => {
    try {
        console.log('Request body:', req.body);
        console.log('Request file:', req.file);

        const {
            name,
            abbreviation,
            leader,
            foundingDate,
            headquarters,
            contactDetails,
            website
        } = req.body;

        // Check for missing required fields
        if (!name || !abbreviation || !foundingDate || !headquarters || !contactDetails) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields: name, abbreviation, foundingDate, headquarters, contactDetails'
            });
        }

        // Logo is optional - use file if provided, otherwise null
        const logoUrl = req.file ? req.file.path : null;

        // Validate leader is a valid ObjectId if provided
        let validLeader = null;
        if (leader && leader.trim() !== '') {
            if (!mongoose.Types.ObjectId.isValid(leader)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid leader ID format. Leader must be a valid candidate ID.'
                });
            }
            validLeader = leader;
        }

        // Parse JSON strings
        let headquartersObj, contactDetailsObj;
        try {
            headquartersObj = JSON.parse(headquarters);
            contactDetailsObj = JSON.parse(contactDetails);
        } catch (parseError) {
            return res.status(400).json({
                success: false,
                message: 'Invalid headquarters or contactDetails format. Must be valid JSON.'
            });
        }

        const newParty = new PoliticalParty({
            name,
            abbreviation,
            logo: logoUrl,
            foundingDate,
            headquarters: headquartersObj,
            contactDetails: contactDetailsObj,
            website: website || ''
        });

        // Only add leader if it's a valid ObjectId
        if (validLeader) {
            newParty.leader = validLeader;
        }

        await newParty.save();

        res.status(201).json({
            success: true,
            message: 'Political Party created successfully',
            party: newParty
        });
    } catch (error) {
        console.error('Error creating party:', error);

        // Handle specific Mongoose validation errors
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors
            });
        }

        // Handle duplicate key errors
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Party with this name or abbreviation already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Internal server error: ' + error.message
        });
    }
});

// Update a party
router.put('/:id', upload.single('logo'), async (req, res) => {
    try {
        const { name, abbreviation, leader, foundingDate, headquarters, contactDetails, website } = req.body;

        // Validate leader is a valid ObjectId if provided
        let validLeader = null;
        if (leader && leader.trim() !== '') {
            if (!mongoose.Types.ObjectId.isValid(leader)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid leader ID format. Leader must be a valid candidate ID.'
                });
            }
            validLeader = leader;
        }

        const updatedFields = {
            name,
            abbreviation,
            foundingDate,
            website,
        };

        // Only update leader if it's a valid ObjectId
        if (validLeader) {
            updatedFields.leader = validLeader;
        } else if (leader === '') {
            // If empty string is sent, remove the leader
            updatedFields.leader = null;
        }

        // Parse JSON strings if provided
        if (headquarters) {
            try {
                updatedFields.headquarters = JSON.parse(headquarters);
            } catch (parseError) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid headquarters format. Must be valid JSON.'
                });
            }
        }

        if (contactDetails) {
            try {
                updatedFields.contactDetails = JSON.parse(contactDetails);
            } catch (parseError) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid contactDetails format. Must be valid JSON.'
                });
            }
        }

        if (req.file) {
            updatedFields.logo = req.file.path;
        }

        const updatedParty = await PoliticalParty.findByIdAndUpdate(
            req.params.id,
            { $set: updatedFields },
            { new: true, runValidators: true }
        );

        if (!updatedParty) {
            return res.status(404).json({ success: false, message: 'Party not found' });
        }

        res.status(200).json({ success: true, message: 'Political Party updated successfully', party: updatedParty });
    } catch (error) {
        console.error('Error updating party:', error);

        // Handle specific Mongoose validation errors
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors
            });
        }

        // Handle duplicate key errors
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Party with this name or abbreviation already exists'
            });
        }

        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Delete a party
router.delete('/:id', async (req, res) => {
    try {
        const deletedParty = await PoliticalParty.findByIdAndDelete(req.params.id);

        if (!deletedParty) {
            return res.status(404).json({ success: false, message: 'Party not found' });
        }

        res.status(200).json({ success: true, message: 'Political Party deleted successfully' });
    } catch (error) {
        console.error('Error deleting party:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

module.exports = router;