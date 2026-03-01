const express = require('express');
const router = express.Router();
const Admin = require('../models/admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Import additional models for dashboard stats
const User = require('../models/user');
const Candidate = require('../models/candidate');
const Election = require('../models/election');
const PoliticalParty = require('../models/party');
const Complaint = require('../models/complaint');
const ReportFake = require('../models/reportFake');

// ✅ FIXED: Initialize default admin with environment variables
const initializeDefaultAdmin = async () => {
  try {
    const defaultAdminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'thotakoushik69@gmail.com';
    const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';

    const existingAdmin = await Admin.findOne({ email: defaultAdminEmail });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(defaultAdminPassword, 10);
      const defaultAdmin = new Admin({
        adminId: 'SUPER001',
        name: 'Koushik Thota',
        email: defaultAdminEmail,
        password: hashedPassword,
        phone: '+1234567890',
        role: 'superadmin',
        isActive: true
      });
      await defaultAdmin.save();
      console.log('✅ Default admin created:', defaultAdminEmail);
    } else {
      console.log('ℹ️ Default admin already exists:', defaultAdminEmail);
    }
  } catch (error) {
    console.error('❌ Error creating default admin:', error);
  }
};

// Call this function when server starts
initializeDefaultAdmin();

// ✅ FIXED: Get All Admins with better error handling
router.get('/', async (req, res) => {
  try {
    const admins = await Admin.find().select('-password');
    if (!admins || admins.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No Admins Found'
      });
    }
    res.status(200).json({
      success: true,
      message: 'Admins Retrieved Successfully',
      data: admins
    });
  } catch (error) {
    console.error('❌ Get admins error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error: ' + error.message
    });
  }
});

// ✅ FIXED: Get Admin by ID
router.get('/admin/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const admin = await Admin.findById(id).select('-password');
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin Not Found'
      });
    }
    res.status(200).json({
      success: true,
      message: 'Admin Retrieved Successfully',
      data: admin
    });
  } catch (error) {
    console.error('❌ Get admin by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error: ' + error.message
    });
  }
});

// ✅ FIXED: Add a New Admin with validation
router.post('/', async (req, res) => {
  const { adminId, name, email, password, phone, role } = req.body;

  // Validate inputs
  if (!adminId || !name || !email || !password || !phone) {
    return res.status(400).json({
      success: false,
      message: 'All fields (adminId, name, email, password, phone) are required'
    });
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address'
    });
  }

  try {
    // Check if email already exists
    const emailExists = await Admin.findOne({ email });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Check if adminId already exists
    const adminIdExists = await Admin.findOne({ adminId });
    if (adminIdExists) {
      return res.status(400).json({
        success: false,
        message: 'Admin ID already exists'
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new admin
    const newAdmin = new Admin({
      adminId,
      name,
      email,
      password: hashedPassword,
      phone,
      role: role || 'admin',
      isActive: true
    });

    // Save the new admin to the database
    await newAdmin.save();

    // Return admin without password
    const adminResponse = { ...newAdmin.toObject() };
    delete adminResponse.password;

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      data: adminResponse
    });
  } catch (error) {
    console.error('❌ Create admin error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error: ' + error.message
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
});

// ✅ FIXED: Login Admin with better security
router.post('/login', async (req, res) => {
  const privateKey = process.env.JWT_SECRET || process.env.SECRET_KEY || 'fallback-secret-key';
  const { email, password } = req.body;

  // Validate inputs
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required'
    });
  }

  try {
    // Check if email exists
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if admin is active
    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Admin account is deactivated. Please contact superadmin.'
      });
    }

    // Compare the entered password with the hashed password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Create a JWT token
    const payload = {
      adminId: admin.adminId,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      id: admin._id
    };

    const token = jwt.sign(payload, privateKey, { expiresIn: '24h' });

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Return the token in the response
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      admin: {
        id: admin._id,
        adminId: admin.adminId,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        lastLogin: admin.lastLogin
      }
    });
  } catch (error) {
    console.error('❌ Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// ✅ FIXED: Update an Admin
router.put('/admin/:id', async (req, res) => {
  const { id } = req.params;
  const { adminId, name, email, password, phone, role, isActive } = req.body;

  try {
    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin Not Found'
      });
    }

    // Prevent modification of superadmin role
    if (admin.role === 'superadmin' && role && role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot change superadmin role'
      });
    }

    // Update admin details
    if (adminId) admin.adminId = adminId;
    if (name) admin.name = name;
    if (email) admin.email = email;
    if (phone) admin.phone = phone;
    if (role) admin.role = role;
    if (typeof isActive !== 'undefined') admin.isActive = isActive;

    // Only hash password if it's provided
    if (password) {
      admin.password = await bcrypt.hash(password, 10);
    }

    admin.updatedAt = new Date();
    await admin.save();

    // Return admin without password
    const adminResponse = { ...admin.toObject() };
    delete adminResponse.password;

    res.status(200).json({
      success: true,
      message: 'Admin Updated Successfully',
      data: adminResponse
    });
  } catch (error) {
    console.error('❌ Update admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error: ' + error.message
    });
  }
});

// ✅ FIXED: Delete an Admin
router.delete('/admin/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin Not Found'
      });
    }

    // Prevent deletion of superadmin
    if (admin.role === 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete superadmin account'
      });
    }

    await Admin.findByIdAndDelete(id);
    res.status(200).json({
      success: true,
      message: 'Admin Deleted Successfully'
    });
  } catch (error) {
    console.error('❌ Delete admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error: ' + error.message
    });
  }
});

// ✅ FIXED: Admin Dashboard Statistics with error handling
router.get('/dashboard/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      totalCandidates,
      totalElections,
      totalParties,
      pendingVerifications,
      pendingComplaints,
      pendingFakeReports
    ] = await Promise.all([
      User.countDocuments(),
      Candidate.countDocuments(),
      Election.countDocuments(),
      PoliticalParty.countDocuments(),
      Candidate.countDocuments({ isVerified: false }),
      Complaint.countDocuments({ isReviewed: false }),
      ReportFake.countDocuments({ isReviewed: false })
    ]);

    const stats = {
      totalUsers,
      totalCandidates,
      totalElections,
      totalParties,
      pendingVerifications,
      pendingComplaints,
      pendingFakeReports
    };

    res.json({
      success: true,
      message: 'Dashboard stats retrieved successfully',
      data: stats
    });
  } catch (error) {
    console.error('❌ Admin dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics: ' + error.message
    });
  }
});

// ✅ FIXED: Check if user is admin
router.get('/check-admin/:email', async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email parameter is required'
      });
    }

    const admin = await Admin.findOne({ email, isActive: true });

    if (admin) {
      res.json({
        success: true,
        isAdmin: true,
        role: admin.role,
        name: admin.name,
        adminId: admin.adminId
      });
    } else {
      res.json({
        success: true,
        isAdmin: false,
        message: 'User is not an admin or account is inactive'
      });
    }
  } catch (error) {
    console.error('❌ Error checking admin status:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking admin status: ' + error.message
    });
  }
});

// ✅ NEW: Get admin profile by token
router.get('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const privateKey = process.env.JWT_SECRET || process.env.SECRET_KEY || 'fallback-secret-key';
    const decoded = jwt.verify(token, privateKey);

    const admin = await Admin.findOne({ email: decoded.email }).select('-password');

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    res.json({
      success: true,
      message: 'Admin profile retrieved successfully',
      data: admin
    });
  } catch (error) {
    console.error('❌ Get admin profile error:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error retrieving admin profile: ' + error.message
    });
  }
});

module.exports = router;