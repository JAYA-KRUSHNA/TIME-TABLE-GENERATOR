import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

try {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 5000,  // 5 second connection timeout
      socketTimeout: 5000,      // 5 second socket timeout
      greetingTimeout: 5000,    // 5 second greeting timeout
    });
  }
} catch (e) {
  console.warn('SMTP transport creation failed:', e);
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOTPEmail(to: string, otp: string, name: string) {
  // Always log OTP to console for development/demo
  console.log(`\n📧 OTP for ${to}: ${otp}\n`);

  if (!transporter) {
    console.warn('SMTP not configured — OTP logged to console only');
    return;
  }

  const mailOptions = {
    from: `"OptiSchedule" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Your OptiSchedule Verification Code',
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 500px; margin: 0 auto; background: linear-gradient(135deg, #0f172a, #1e1b4b); padding: 40px; border-radius: 16px;">
        <h1 style="color: #818cf8; font-size: 28px; text-align: center; margin-bottom: 8px;">OptiSchedule</h1>
        <p style="color: #94a3b8; text-align: center; font-size: 14px; margin-bottom: 30px;">AI Powered Academic Timetable Generator</p>
        <div style="background: rgba(255,255,255,0.05); padding: 30px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
          <p style="color: #e2e8f0; font-size: 16px;">Hello <strong>${name}</strong>,</p>
          <p style="color: #94a3b8; font-size: 14px;">Your verification code is:</p>
          <div style="text-align: center; margin: 24px 0;">
            <span style="font-size: 36px; font-weight: 700; letter-spacing: 12px; color: #818cf8; background: rgba(129,140,248,0.1); padding: 16px 32px; border-radius: 12px; display: inline-block;">${otp}</span>
          </div>
          <p style="color: #64748b; font-size: 13px; text-align: center;">This code expires in <strong style="color: #e2e8f0;">5 minutes</strong>.</p>
        </div>
        <p style="color: #475569; font-size: 12px; text-align: center; margin-top: 24px;">If you didn't request this code, please ignore this email.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent to ${to}`);
  } catch (error) {
    console.error(`❌ Failed to send OTP email to ${to}:`, error);
    // Don't throw — OTP is saved in DB and logged to console
  }
}

export async function sendPasswordResetEmail(to: string, resetLink: string, name: string) {
  console.log(`\n🔑 Password reset link for ${to}: ${resetLink}\n`);

  if (!transporter) {
    console.warn('SMTP not configured — reset link logged to console only');
    return;
  }

  const mailOptions = {
    from: `"OptiSchedule" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Reset Your OptiSchedule Password',
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 500px; margin: 0 auto; background: linear-gradient(135deg, #0f172a, #1e1b4b); padding: 40px; border-radius: 16px;">
        <h1 style="color: #818cf8; font-size: 28px; text-align: center; margin-bottom: 8px;">OptiSchedule</h1>
        <p style="color: #94a3b8; text-align: center; font-size: 14px; margin-bottom: 30px;">Password Reset Request</p>
        <div style="background: rgba(255,255,255,0.05); padding: 30px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
          <p style="color: #e2e8f0; font-size: 16px;">Hello <strong>${name}</strong>,</p>
          <p style="color: #94a3b8; font-size: 14px;">Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${resetLink}" style="background: linear-gradient(135deg, #6366f1, #818cf8); color: white; padding: 14px 40px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">Reset Password</a>
          </div>
          <p style="color: #64748b; font-size: 13px; text-align: center;">This link expires in <strong style="color: #e2e8f0;">15 minutes</strong>.</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error(`❌ Failed to send reset email to ${to}:`, error);
  }
}
