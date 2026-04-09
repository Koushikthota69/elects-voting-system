const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,     // your gmail
    pass: process.env.GMAIL_APP_PASSWORD  // 16-char app password
  }
});

const emailService = {
  sendVoteConfirmation: async (user, election, candidate) => {
    try {
      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: user.email,
        subject: 'Vote Confirmation - Election System',
        html: `
          <h1>Vote Confirmed ✅</h1>
          <p>Hello ${user.firstName}, your vote has been recorded.</p>
          <p>Election: ${election.name || 'Election'}</p>
        `
      });
      console.log('Email sent to:', user.email);
      return true;
    } catch (error) {
      console.error('Email failed:', error);
      return false;
    }
  },

  sendBulkEmails: async (users, election) => {
    const results = await Promise.allSettled(
      users.map(user =>
        transporter.sendMail({
          from: process.env.GMAIL_USER,
          to: user.email,
          subject: 'Vote Confirmation - Election System',
          html: `
            <h1>Vote Confirmed ✅</h1>
            <p>Hello ${user.firstName}, your vote has been recorded.</p>
            <p>Election: ${election.name || 'Election'}</p>
          `
        })
      )
    );

    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        console.log(`✅ Sent to: ${users[i].email}`);
      } else {
        console.error(`❌ Failed: ${users[i].email}`, result.reason);
      }
    });
  },

  sendFaceRegistrationConfirmation: async (user) => { return true; },
  sendEmail: async (to, subject, html) => { return true; }
};

module.exports = emailService;