const nodemailer = require('nodemailer');

// ✅ FIXED: createTransport (not createTransporter)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'thotakoushik69@gmail.com',
    pass: process.env.EMAIL_PASS || 'mdqp pwny gqnw vxxd'
  }
});

const emailService = {
  // Send vote confirmation email
  sendVoteConfirmation: async (user, election, candidate) => {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER || 'election-system@example.com',
        to: user.email,
        subject: '✅ Vote Confirmation - Election System',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .success-badge { background: #28a745; color: white; padding: 10px 20px; border-radius: 20px; display: inline-block; margin-bottom: 20px; }
              .info-box { background: white; border-left: 4px solid #007bff; padding: 15px; margin: 15px 0; border-radius: 4px; }
              .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🗳️ Vote Confirmation</h1>
                <p>Your vote has been successfully recorded</p>
              </div>
              <div class="content">
                <div class="success-badge">✅ VOTE CONFIRMED</div>

                <h2>Hello ${user.firstName} ${user.lastName},</h2>
                <p>Thank you for participating in the democratic process. Your vote has been securely recorded and confirmed.</p>

                <div class="info-box">
                  <h3>📊 Vote Details</h3>
                  <p><strong>Election:</strong> ${election.name || election.year} ${election.type || 'Election'}</p>
                  <p><strong>Candidate Voted:</strong> ${candidate.user?.firstName || candidate.firstName} ${candidate.user?.lastName || candidate.lastName || 'Unknown Candidate'}</p>
                  <p><strong>Time of Vote:</strong> ${new Date().toLocaleString()}</p>
                  <p><strong>Verification Method:</strong> Facial Recognition</p>
                </div>

                <div class="info-box">
                  <h3>🔒 Security Information</h3>
                  <p>• Your identity was verified using facial recognition technology</p>
                  <p>• Your vote is anonymous and secure</p>
                  <p>• This transaction has been logged for audit purposes</p>
                </div>

                <p><strong>Note:</strong> This is a confirmation that your vote has been counted. The results will be announced after the election period ends.</p>

                <p>If you have any questions or believe there is an error, please contact our support team immediately.</p>
              </div>
              <div class="footer">
                <p>Election Commission System</p>
                <p>This is an automated message. Please do not reply to this email.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log('✅ Vote confirmation email sent to:', user.email);

      return true;
    } catch (error) {
      console.error('❌ Failed to send vote confirmation email:', error);
      return false;
    }
  },

  // Send face registration confirmation
  sendFaceRegistrationConfirmation: async (user) => {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER || 'election-system@example.com',
        to: user.email,
        subject: '✅ Face Registration Successful - Election System',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .info-box { background: white; border-left: 4px solid #28a745; padding: 15px; margin: 15px 0; border-radius: 4px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>👤 Face Registration Complete</h1>
                <p>Your facial data has been successfully registered</p>
              </div>
              <div class="content">
                <h2>Hello ${user.firstName},</h2>
                <p>Your facial recognition data has been successfully registered in our election system.</p>

                <div class="info-box">
                  <h3>What's Next?</h3>
                  <p>• You can now vote using facial recognition</p>
                  <p>• Your face data is securely encrypted</p>
                  <p>• You'll need to verify your identity with facial recognition when voting</p>
                  <p>• Your data is protected and will only be used for verification purposes</p>
                </div>

                <p>Thank you for helping us make elections more secure and convenient.</p>

                <p><strong>Security Notice:</strong> Your facial data is stored as an encrypted mathematical representation and cannot be used to reconstruct your actual image.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log('✅ Face registration confirmation email sent to:', user.email);

      return true;
    } catch (error) {
      console.error('❌ Failed to send face registration email:', error);
      return false;
    }
  },

  // ✅ ADDED: Generic email function
  sendEmail: async (to, subject, html) => {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER || 'election-system@example.com',
        to,
        subject,
        html
      };

      await transporter.sendMail(mailOptions);
      console.log('✅ Email sent to:', to);
      return true;
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      return false;
    }
  }
};

module.exports = emailService;