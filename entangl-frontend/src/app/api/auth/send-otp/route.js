import { NextResponse } from 'next/server';

// For production, use Redis or a database. For now, using Map with longer persistence
const otpStore = global.otpStore || new Map();
if (!global.otpStore) {
  global.otpStore = otpStore;
}

// Twilio configuration - PRODUCTION MODE
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
    let formattedPhone;
    if (phoneNumber.startsWith('+')) {
      formattedPhone = phoneNumber;
    } else if (cleanedPhone.length === 10) {
      // Assume US number
      formattedPhone = `+1${cleanedPhone}`;
    } else if (cleanedPhone.length === 11 && cleanedPhone.startsWith('1')) {
      formattedPhone = `+${cleanedPhone}`;
    } else {
      formattedPhone = `+${cleanedPhone}`;
    }

    console.log(`Processing OTP request for: ${formattedPhone}`);

    // Check if OTP was recently sent (rate limiting)
    const existingOtp = otpStore.get(formattedPhone);
    if (existingOtp && (Date.now() - existingOtp.sentAt) < 60000) {
      return NextResponse.json({ 
        error: 'Please wait 60 seconds before requesting another OTP' 
      }, { status: 429 });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP with expiration (10 minutes)
    otpStore.set(formattedPhone, {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      sentAt: Date.now(),
      attempts: 0
    });

    const otpMessage = `Your Entangl verification code is: ${otp}. This code will expire in 10 minutes. Don't share this code with anyone.`;

    // Validate Twilio configuration
    if (!twilioClient || !twilioPhoneNumber) {
      console.error('Twilio not configured properly:', {
        hasClient: !!twilioClient,
        hasPhoneNumber: !!twilioPhoneNumber,
        accountSid: accountSid ? 'Set' : 'Missing',
        authToken: authToken ? 'Set' : 'Missing'
      });
      
      return NextResponse.json({ 
        error: 'SMS service not configured. Please contact support.',
        details: 'Twilio configuration missing'
      }, { status: 500 });
    }

    try {
      console.log(`Sending SMS to ${formattedPhone} from ${twilioPhoneNumber}`);
      
      const message = await twilioClient.messages.create({
        body: otpMessage,
        from: twilioPhoneNumber,
        to: formattedPhone
      });

      console.log(`OTP sent successfully via Twilio:`, {
        messageSid: message.sid,
        to: formattedPhone,
        status: message.status
      });
      
      return NextResponse.json({ 
        message: 'OTP sent successfully',
        phoneNumber: formattedPhone,
        messageSid: message.sid
      });

    } catch (twilioError) {
      console.error('Twilio error details:', {
        code: twilioError.code,
        message: twilioError.message,
        status: twilioError.status,
        details: twilioError.details
      });
      
      // Handle specific Twilio errors
      let errorMessage = 'Failed to send OTP';
      
      switch (twilioError.code) {
        case 21211:
          errorMessage = 'Invalid phone number format';
          break;
        case 21408:
          errorMessage = 'Permission to send SMS has not been enabled for this region';
          break;
        case 21614:
          errorMessage = 'Phone number is not a valid mobile number';
          break;
        case 21610:
          errorMessage = 'Phone number is not verified (Trial account limitation)';
          break;
        case 20003:
          errorMessage = 'Authentication failed - check Twilio credentials';
          break;
        case 21606:
          errorMessage = 'Phone number is not a valid mobile number';
          break;
        default:
          errorMessage = `Twilio error: ${twilioError.message}`;
      }
      
      // Clean up stored OTP since sending failed
      otpStore.delete(formattedPhone);
      
      return NextResponse.json({ 
        error: errorMessage,
        code: twilioError.code,
        details: twilioError.message
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
