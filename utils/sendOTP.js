const sendEmail = require('./sendEmail');

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOTP = async (email, otp) => {
  const subject = 'KrushiMitra Password Reset OTP';
  const text = `Your KrushiMitra password reset OTP is ${otp}. This code will expire in 10 minutes.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a;">
      <div style="padding: 24px; border-radius: 16px; background: #f8fafc; border: 1px solid #e2e8f0;">
        <h2 style="margin: 0 0 12px; color: #166534;">KrushiMitra Password Reset</h2>
        <p style="margin: 0 0 16px;">Use the OTP below to reset your password.</p>
        <div style="margin: 20px 0; padding: 16px; border-radius: 12px; background: #ecfdf5; border: 1px solid #bbf7d0; text-align: center;">
          <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px; color: #166534;">${otp}</div>
        </div>
        <p style="margin: 0 0 8px;">This OTP will expire in 10 minutes.</p>
        <p style="margin: 0; color: #475569; font-size: 14px;">If you did not request this reset, you can safely ignore this email.</p>
      </div>
    </div>
  `;

  await sendEmail({
    to: email,
    subject,
    text,
    html
  });

  return { success: true, message: 'OTP sent successfully' };
};

module.exports = { generateOTP, sendOTP };
