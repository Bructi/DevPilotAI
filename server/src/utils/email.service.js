const nodemailer = require('nodemailer');

let transporter = null;

// Initialize the email transporter
const initTransporter = async () => {
  if (transporter) return transporter;

  // Use SMTP credentials from environment if available
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_PORT == 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log('📧 Using production SMTP settings.');
  } else {
    // Fallback to ethereal for testing
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('📧 Using ethereal email for testing. Check console for links to preview emails.');
  }

  return transporter;
};

// Send an email
const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const t = await initTransporter();
    
    const info = await t.sendMail({
      from: process.env.SMTP_FROM || '"DevPilot AI" <noreply@devpilotai.com>',
      to,
      subject,
      text,
      html,
    });

    console.log(`Email sent to ${to}: ${info.messageId}`);
    
    if (info.messageId && !process.env.SMTP_HOST) {
      console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }

    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email');
  }
};

module.exports = {
  sendEmail,
};
