// Nodemailer transporter — Gmail SMTP via App Password
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Verify SMTP connection at startup — logs exact error to Render logs
transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP verify failed:', error);
  } else {
    console.log('SMTP server is ready to send emails');
  }
});

export default transporter;
