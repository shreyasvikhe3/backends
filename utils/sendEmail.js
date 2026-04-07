const nodemailer = require('nodemailer');

const getTransporter = () => {
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = Number(process.env.EMAIL_PORT || 587);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD;

  if (!user || !pass) {
    throw new Error('Email service is not configured. Set EMAIL_USER and EMAIL_PASS in backend/.env');
  }

  if (pass.includes('your_') || pass.includes('app_password')) {
    throw new Error('EMAIL_PASS still uses the placeholder value. Replace it with your real Gmail App Password');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass
    }
  });
};

const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const transporter = getTransporter();

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      text,
      html
    });
  } catch (error) {
    if (error.code === 'EAUTH') {
      throw new Error('Email login failed. Check EMAIL_USER and use a valid Gmail App Password in EMAIL_PASS');
    }

    if (error.code === 'ESOCKET' || error.code === 'ECONNECTION') {
      throw new Error('Could not connect to the email server. Check EMAIL_HOST, EMAIL_PORT, and internet access');
    }

    throw error;
  }
};

module.exports = sendEmail;
