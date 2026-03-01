const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { User } = require("../models/user.js");
const express = require("express");

const router = express.Router();

// Create email transporter
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

router.post("/forgotpassword", async (req, res) => {
  const { nicNo, email } = req.body;

  if (!nicNo || !email) {
    return res.status(400).json({ success: false, message: "NIC number and email are required" });
  }

  try {
    // Check if user exists (case insensitive)
    const user = await User.findOne({ 
      nic: { $regex: new RegExp(`^${nicNo}$`, 'i') },
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found with provided NIC and email." });
    }

    // Generate token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    // Email options
    const mailOptions = {
      from: process.env.EMAIL,
      to: user.email,
      subject: "Password Recovery - Online Voting System",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2E86AB;">Password Recovery</h2>
          <p>Hello ${user.firstName},</p>
          <p>You requested to reset your password. Click the link below to reset it:</p>
          <a href="${process.env.FRONTEND_URL}/setpassword?token=${token}" 
             style="background-color: #2E86AB; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: "Recovery email sent successfully. Please check your inbox." });
    
  } catch (err) {
    console.error("Password recovery error:", err);
    res.status(500).json({ success: false, message: "Server error during password recovery" });
  }
});

router.post("/reset", async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ success: false, message: "Token and new password are required" });
  }
  
  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the user by ID
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Hash the new password and update
    const hashedPassword = await bcrypt.hash(password, 10);
    user.passwordHash = hashedPassword;
    await user.save();

    res.status(200).json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(400).json({ success: false, message: "Invalid token" });
    } else if (err.name === 'TokenExpiredError') {
      return res.status(400).json({ success: false, message: "Token expired" });
    } else {
      console.error("Password reset error:", err);
      return res.status(500).json({ success: false, message: "Server error during password reset" });
    }
  }
});

module.exports = router;