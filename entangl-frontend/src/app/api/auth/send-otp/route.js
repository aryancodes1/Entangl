import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// For production, use Redis or a database. For now, using Map
const otpStore = global.otpStore || new Map();
if (!global.otpStore) {
  global.otpStore = otpStore;
}

// Email configuration for OTP delivery
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false, // Use TLS
  auth: {
    user: process.env.SMTP_USER, // Your Gmail address
    pass: process.env.SMTP_PASS  // Your Gmail app password
  }
};

// Create transporter
let transporter;
try {
  if (emailConfig.auth.user && emailConfig.auth.pass) {
    transporter = nodemailer.createTransport(emailConfig);
  }
} catch (error) {
  console.error('Failed to create email transporter:', error);
}

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    console.log(`Processing OTP request for: ${normalizedEmail}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`SMTP configured: ${!!transporter}`);

    // Check if OTP was recently sent (rate limiting)
    const existingOtp = otpStore.get(normalizedEmail);
    if (existingOtp && (Date.now() - existingOtp.sentAt) < 60000) {
      return NextResponse.json({ 
        error: 'Please wait 60 seconds before requesting another OTP' 
      }, { status: 429 });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP with expiration (10 minutes)
    otpStore.set(normalizedEmail, {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      sentAt: Date.now(),
      attempts: 0
    });

    // Send email with OTP
    if (transporter) {
      try {
        const mailOptions = {
          from: {
            name: 'Entangl',
            address: process.env.SMTP_USER
          },
          to: normalizedEmail,
          subject: 'Your Entangl Verification Code',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">Entangl</h1>
              </div>
              <div style="padding: 30px; background-color: #f9f9f9;">
                <h2 style="color: #333; margin-bottom: 20px;">Email Verification</h2>
                <p style="color: #666; font-size: 16px; line-height: 1.5;">
                  Your verification code for Entangl is:
                </p>
                <div style="background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
                  <span style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px;">${otp}</span>
                </div>
                <p style="color: #666; font-size: 14px;">
                  This code will expire in 10 minutes. Please do not share this code with anyone.
                </p>
                <p style="color: #666; font-size: 14px;">
                  If you didn't request this code, please ignore this email.
                </p>
              </div>
              <div style="background: #333; color: white; text-align: center; padding: 15px; font-size: 12px;">
                © ${new Date().getFullYear()} Entangl. All rights reserved.
              </div>
            </div>
          `,
          text: `Your Entangl verification code is: ${otp}. This code expires in 10 minutes. Do not share this code with anyone.`
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ OTP email sent to ${normalizedEmail}`);

        return NextResponse.json({ 
          message: 'OTP sent successfully to your email',
          email: normalizedEmail
        });

      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        
        // Return success but with warning - OTP is still stored for verification
        return NextResponse.json({ 
          message: 'OTP generated but email delivery failed',
          email: normalizedEmail,
          warning: 'Email service unavailable. Check console for OTP.',
          devOtp: process.env.NODE_ENV === 'development' ? otp : undefined
        });
      }
    } else {
      console.log(`📧 Email transporter not configured. OTP: ${otp}`);
      
      return NextResponse.json({ 
        message: 'OTP generated (email service not configured)',
        email: normalizedEmail,
        warning: 'Email service not configured. Check console for OTP.',
        devOtp: process.env.NODE_ENV === 'development' ? otp : undefined
      });
    }

  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Contact support'
    }, { status: 500 });
  }
}
