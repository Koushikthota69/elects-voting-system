const express = require('express');
const router = express.Router();

// ✅ FIXED IMPORTS - No curly braces
const User = require('../models/user');
const Candidate = require('../models/candidate');
const PoliticalParty = require('../models/party');

const multer = require('multer');
const cloudinaryStorage = require('../helpers/cloudinaryStorage');
const upload = multer({ storage: cloudinaryStorage });

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ✅ ADD DEBUG MIDDLEWARE
router.use((req, res, next) => {
  console.log('🔍 Models check in users route:');
  console.log('   User:', User && typeof User.findOne === 'function' ? '✅ OK' : '❌ BROKEN');
  console.log('   Candidate:', Candidate && typeof Candidate.findOne === 'function' ? '✅ OK' : '❌ BROKEN');
  console.log('   PoliticalParty:', PoliticalParty && typeof PoliticalParty.findById === 'function' ? '✅ OK' : '❌ BROKEN');
  next();
});

// ✅ TEST ROUTE - Add this temporarily
router.get('/test-models', async (req, res) => {
  try {
    const models = {
      User: {
        defined: !!User,
        hasFindOne: User && typeof User.findOne === 'function',
        count: await User.countDocuments()
      },
      Candidate: {
        defined: !!Candidate,
        hasFindOne: Candidate && typeof Candidate.findOne === 'function',
        count: await Candidate.countDocuments()
      },
      PoliticalParty: {
        defined: !!PoliticalParty,
        hasFindById: PoliticalParty && typeof PoliticalParty.findById === 'function',
        count: await PoliticalParty.countDocuments(),
        sample: await PoliticalParty.findOne()
      }
    };

    res.json({ success: true, models });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// ✅ GET all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('-passwordHash');
    res.json({ success: true, users });
  } catch (err) {
    console.error("❌ Error fetching users:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ GET profile by ID
router.get('/profile/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    console.error("❌ Profile error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ USER LOGIN
router.post('/login', async (req, res) => {
  try {
    const { nic, password } = req.body;

    if (!nic || !password) {
      return res.status(400).json({ success: false, message: 'NIC and password are required' });
    }

    // Find user by NIC (case insensitive)
    const user = await User.findOne({
      nic: { $regex: new RegExp(`^${nic}$`, 'i') }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(400).json({ success: false, message: 'Invalid password' });
    }

    // Generate token
    const token = jwt.sign(
      {
        userId: user._id,
        isCandidate: user.isCandidate,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Return user data (without password)
    const userResponse = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      nic: user.nic,
      email: user.email,
      isCandidate: user.isCandidate,
      profilePhoto: user.profilePhoto
    };

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userResponse
    });

  } catch (err) {
    console.error("❌ Login error:", err.message);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// ✅ REGISTER USER - FIXED VERSION
router.post('/register', upload.fields([
  { name: 'profilePhoto', maxCount: 1 },
  { name: 'nicFront', maxCount: 1 },
  { name: 'nicBack', maxCount: 1 },
  { name: 'realtimePhoto', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('🔍 Starting user registration...');

    const {
      firstName, lastName, nic, email, gender, password, phone,
      addressline1, addressline2, city, district, province,
      isCandidate, skills, objectives, bio, party
    } = req.body;

    // ✅ Check if models are working
    if (!User || !User.findOne) {
      console.error('❌ User model is broken');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error: User model not loaded'
      });
    }

    if (!PoliticalParty || typeof PoliticalParty.findById !== 'function') {
      console.error('❌ PoliticalParty model is broken');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error: PoliticalParty model not loaded'
      });
    }

    // ✅ Uploaded file paths
    const profilePhotoUrl = req.files?.profilePhoto?.[0]?.path || '';
    const nicFrontUrl = req.files?.nicFront?.[0]?.path || '';
    const nicBackUrl = req.files?.nicBack?.[0]?.path || '';
    const realtimePhotoUrl = req.files?.realtimePhoto?.[0]?.path || '';

    // ✅ Required Fields Check
    const required = [
      { f: firstName, n: 'First Name' },
      { f: lastName, n: 'Last Name' },
      { f: nic, n: 'NIC' },
      { f: gender, n: 'Gender' },
      { f: password, n: 'Password' },
      { f: phone, n: 'Phone' },
      { f: city, n: 'City' },
      { f: district, n: 'District' },
      { f: province, n: 'Province' }
    ];
    const missing = required.filter(r => !r.f);
    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: `Missing fields: ${missing.map(m => m.n).join(', ')}`
      });
    }

    // ✅ Check if NIC already exists
    const existingUser = await User.findOne({
      nic: { $regex: new RegExp(`^${nic}$`, 'i') }
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'This NIC is already registered!'
      });
    }

    // ✅ Check if email already exists
    if (email) {
      const existingEmail = await User.findOne({
        email: { $regex: new RegExp(`^${email}$`, 'i') }
      });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'This email is already registered!'
        });
      }
    }

    // ✅ Save user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      firstName,
      lastName,
      nic: nic.toUpperCase(),
      email,
      gender,
      passwordHash: hashedPassword,
      phone,
      addressline1,
      addressline2,
      city,
      district,
      province,
      profilePhoto: profilePhotoUrl,
      nicFront: nicFrontUrl,
      nicBack: nicBackUrl,
      realtimePhoto: realtimePhotoUrl,
      isCandidate: isCandidate === 'true' || isCandidate === true
    });

    await user.save();
    console.log('✅ User saved successfully:', user._id);

    // ✅ If user is a candidate AND party is provided, save candidate data
    if (user.isCandidate && party && party.trim() !== '') {
      console.log('🔍 Creating candidate record with party:', party);

      try {
        // Validate party exists
        const validParty = await PoliticalParty.findById(party);
        if (!validParty) {
          console.warn('⚠️ Invalid party ID provided, creating candidate without party');
          // Continue without party
        }

        const candidate = new Candidate({
          user: user._id,
          skills: skills ? (typeof skills === 'string' ? skills.split(',').map(s => s.trim()) : skills) : [],
          objectives: objectives ? (typeof objectives === 'string' ? objectives.split(',').map(s => s.trim()) : objectives) : [],
          bio: bio || '',
          party: validParty ? party : null
        });

        await candidate.save();
        console.log('✅ Candidate record created successfully');

      } catch (candidateError) {
        console.error('❌ Error creating candidate record:', candidateError.message);
        // Don't fail registration if candidate creation fails
      }
    } else if (user.isCandidate) {
      // Create candidate without party
      console.log('🔍 Creating candidate record without party');
      try {
        const candidate = new Candidate({
          user: user._id,
          skills: skills ? (typeof skills === 'string' ? skills.split(',').map(s => s.trim()) : skills) : [],
          objectives: objectives ? (typeof objectives === 'string' ? objectives.split(',').map(s => s.trim()) : objectives) : [],
          bio: bio || ''
        });
        await candidate.save();
        console.log('✅ Candidate record created successfully (no party)');
      } catch (candidateError) {
        console.error('❌ Error creating candidate record:', candidateError.message);
      }
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        nic: user.nic,
        email: user.email,
        isCandidate: user.isCandidate
      }
    });

  } catch (err) {
    console.error("❌ Registration error:", err.message);
    console.error("❌ Full error stack:", err);
    res.status(500).json({
      success: false,
      message: 'Server error during registration: ' + err.message
    });
  }
});

// ✅ UPDATE USER PHOTO
router.put('/updatephoto/:id', upload.single('realtimePhoto'), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        realtimePhoto: req.file ? req.file.path : undefined,
        photoUpdatedAt: new Date()
      },
      { new: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Photo updated successfully',
      user
    });
  } catch (err) {
    console.error("❌ Update photo error:", err.message);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

module.exports = router;