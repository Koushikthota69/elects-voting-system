const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

const emailService = {
  sendVoteConfirmation: async (user, election, candidate) => {
    try {
      await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: user.email,
        subject: 'Vote Confirmation - Election System',
        html: '<h1>Vote Confirmed</h1><p>Hello ' + user.firstName + ', your vote has been recorded successfully.</p><p>Election: ' + (election.name || 'Election') + '</p>'
      });
      console.log('Email sent to:', user.email);
      return true;
    } catch (error) {
      console.error('Email failed:', error);
      return false;
    }
  },
  sendFaceRegistrationConfirmation: async (user) => { return true; },
  sendEmail: async (to, subject, html) => { return true; }
};

module.exports = emailService;