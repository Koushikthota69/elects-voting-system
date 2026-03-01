const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// FIXED: Correct User model import
const User = require('../models/user').User;

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// DEBUG ROUTE: Find user by NIC
router.post('/find-user-by-nic', async (req, res) => {
  try {
    const { nic } = req.body; // CHANGED: nicNo to nic
    
    console.log('🔍 Searching for user with NIC:', nic);

    if (!nic) {
      return res.status(400).json({
        success: false,
        message: 'NIC number is required'
      });
    }

    const user = await User.findOne({ nic: nic.trim() }); // CHANGED: nicNumber to nic

    if (!user) {
      return res.json({
        success: false,
        message: 'No user found with this NIC'
      });
    }

    res.json({
      success: true,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        nic: user.nic, // CHANGED: nicNumber to nic
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Error finding user:', error);
    res.status(500).json({
      success: false,
      message: 'Error finding user: ' + error.message
    });
  }
});

// DEBUG ROUTE: Get all users
router.get('/all-users', async (req, res) => {
  try {
    const users = await User.find().select('email nic firstName lastName role isVerified'); // CHANGED: nicNumber to nic
    
    res.json({
      success: true,
      users: users,
      count: users.length
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users: ' + error.message
    });
  }
});

// POST /api/v1/passwords/forgotpassword
router.post('/forgotpassword', async (req, res) => {
  try {
    const { email, nic } = req.body; // CHANGED: nicNo to nic
    
    console.log('🔐 FORGOT PASSWORD REQUEST:', { 
      email: email, 
      nic: nic 
    });
    
    if (!email || !nic) {
      return res.status(400).json({
        success: false,
        message: 'Email and NIC number are required'
      });
    }

    // Clean the inputs
    const cleanEmail = email.toLowerCase().trim();
    const cleanNIC = nic.trim().toUpperCase(); // CHANGED: Make uppercase to match registration

    console.log('🔍 Searching for user:', { 
      cleanEmail, 
      cleanNIC 
    });

    // Find user by email AND NIC for verification
    const user = await User.findOne({ 
      email: cleanEmail,
      nic: cleanNIC // CHANGED: nicNumber to nic
    });
    
    if (!user) {
      // Debug: Check if user exists with email or NIC separately
      const userByEmail = await User.findOne({ email: cleanEmail });
      const userByNIC = await User.findOne({ nic: cleanNIC }); // CHANGED: nicNumber to nic
      
      console.log('❌ User not found. Debug info:', {
        userByEmail: userByEmail ? `Exists (NIC: ${userByEmail.nic})` : 'No user with this email', // CHANGED: nicNumber to nic
        userByNIC: userByNIC ? `Exists (Email: ${userByNIC.email})` : 'No user with this NIC'
      });
      
      return res.status(404).json({
        success: false,
        message: 'No account found with these credentials'
      });
    }

    console.log('✅ User found:', user.email);

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour

    // Save reset token to user
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    // Email content
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Password Reset Request - E-Voting System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
          <p>Hello ${user.firstName || 'User'},</p>
          <p>You requested a password reset for your E-Voting System account.</p>
          <p>Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 5px; display: inline-block; font-size: 16px;">
              Reset Password
            </a>
          </div>
          <p style="color: #666;">This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="margin: 20px 0;">
          <p style="color: #666; font-size: 12px; text-align: center;">
            E-Voting System Team<br>
            This is an automated message, please do not reply.
          </p>
        </div>
      `
    };

    // Send email
    await transporter.sendMail(mailOptions);
    
    console.log('✅ Password reset email sent to:', user.email);

    res.json({
      success: true,
      message: 'Password reset instructions have been sent to your email'
    });

  } catch (error) {
    console.error('❌ Error in forgot password:', error);
    
    // Handle email errors specifically
    if (error.code === 'EAUTH' || error.code === 'EENVELOPE') {
      return res.status(500).json({
        success: false,
        message: 'Email service configuration error. Please contact support.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message
    });
  }
});

// POST /api/v1/passwords/resetpassword
router.post('/resetpassword', async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;
    
    console.log('Reset password request received for token:', token?.substring(0, 10) + '...');
    
    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token, new password, and confirm password are required'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Find user by reset token and check expiry
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Hash new password - FIXED: Use passwordHash to match User model
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt); // CHANGED: password to passwordHash
    
    // Clear reset token
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();

    console.log('✅ Password reset successful for user:', user.email);

    res.json({
      success: true,
      message: 'Password has been reset successfully'
    });

  } catch (error) {
    console.error('❌ Error resetting password:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message
    });
  }
});

// TEMPORARY: Fix existing user data
router.post('/fix-user-data', async (req, res) => {
  try {
    const { email, nic } = req.body;
    
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user with correct field names
    user.nic = nic.trim().toUpperCase();
    user.role = user.role || 'voter';
    await user.save();

    res.json({
      success: true,
      message: 'User data fixed successfully',
      user: {
        email: user.email,
        nic: user.nic,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Error fixing user data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fixing user data: ' + error.message
    });
  }
});

module.exports = router;