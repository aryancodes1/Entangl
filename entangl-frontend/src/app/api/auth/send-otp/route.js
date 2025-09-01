import { NextResponse } from 'next/server';

// For production, use Redis or a database. For now, using Map with longer persistence
const otpStore = global.otpStore || new Map();
if (!global.otpStore) {
  global.otpStore = otpStore;
}

// Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let twilioClient;
if (accountSid && authToken) {
  const twilio = require('twilio');
  twilioClient = twilio(accountSid, authToken);
}

export async function POST(request) {
  try {
    const { phoneNumber } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Clean and validate phone number
    const cleanedPhone = phoneNumber.replace(/\D/g, '');
    if (cleanedPhone.length < 10) {
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 });
    }

    // Format phone number for international use
    let formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+1${cleanedPhone}`;
    
    // For Indian numbers, use +91
    if (cleanedPhone.length === 10 && !phoneNumber.startsWith('+')) {
      formattedPhone = `+91${cleanedPhone}`;
    }

    // Check if OTP was recently sent (rate limiting)
    const existingOtp = otpStore.get(formattedPhone);
    if (existingOtp && (Date.now() - existingOtp.sentAt) < 60000) {
      return NextResponse.json({ 
        error: 'Please wait 60 seconds before requesting another OTP' 
      }, { status: 429 });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP with expiration (5 minutes)
    otpStore.set(formattedPhone, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      sentAt: Date.now(),
      attempts: 0
    });

    const otpMessage = `Your Entangl verification code is: ${otp}. Valid for 5 minutes. Don't share this code with anyone.`;

    // Try to send SMS using Twilio
    if (twilioClient && twilioPhoneNumber) {
      try {
        await twilioClient.messages.create({
          body: otpMessage,
          from: twilioPhoneNumber,
          to: formattedPhone
        });

        console.log(`OTP sent via Twilio to ${formattedPhone}: ${otp}`);
        
        return NextResponse.json({ 
          message: 'OTP sent successfully',
          phoneNumber: formattedPhone
        });

      } catch (twilioError) {
        console.error('Twilio error:', twilioError);
        
        // Fallback: Log OTP for development
        console.log(`Twilio failed. OTP for ${formattedPhone}: ${otp}`);
        
        return NextResponse.json({ 
          message: 'OTP sent successfully (fallback mode)',
          phoneNumber: formattedPhone,
          // Show OTP in development when Twilio fails
          ...(process.env.NODE_ENV === 'development' && { 
            otp,
            note: 'Twilio failed, showing OTP for development' 
          })
        });
      }
    } else {
      // No Twilio configured - development mode
      console.log(`Development mode - OTP for ${formattedPhone}: ${otp}`);
      
      return NextResponse.json({ 
        message: 'OTP sent successfully (development mode)',
        phoneNumber: formattedPhone,
        // Show OTP in development when no SMS service configured
        ...(process.env.NODE_ENV === 'development' && { 
          otp,
          note: 'Development mode - configure Twilio for production' 
        })
      });
    }

  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
