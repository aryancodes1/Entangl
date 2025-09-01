import { NextResponse } from 'next/server';

// Use the same global store as send-otp
const otpStore = global.otpStore || new Map();
if (!global.otpStore) {
  global.otpStore = otpStore;
}

export async function POST(request) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    console.log(`Verifying OTP for: ${normalizedEmail}`);

    const storedData = otpStore.get(normalizedEmail);

    if (!storedData) {
      console.log(`No OTP found for ${normalizedEmail}`);
      return NextResponse.json({ error: 'OTP not found or expired. Please request a new one.' }, { status: 400 });
    }

    // Check if OTP is expired
    if (Date.now() > storedData.expiresAt) {
      console.log(`OTP expired for ${normalizedEmail}`);
      otpStore.delete(normalizedEmail);
      return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 400 });
    }

    // Check attempts limit
    if (storedData.attempts >= 3) {
      console.log(`Too many attempts for ${normalizedEmail}`);
      otpStore.delete(normalizedEmail);
      return NextResponse.json({ error: 'Too many failed attempts. Please request a new OTP.' }, { status: 400 });
    }

    // Verify OTP
    if (storedData.otp !== otp.toString()) {
      storedData.attempts += 1;
      otpStore.set(normalizedEmail, storedData);
      
      console.log(`Invalid OTP for ${normalizedEmail}. Attempts: ${storedData.attempts}`);
      
      return NextResponse.json({ 
        error: `Invalid OTP. ${3 - storedData.attempts} attempts remaining.` 
      }, { status: 400 });
    }

    // OTP verified successfully
    console.log(`OTP verified successfully for ${normalizedEmail}`);
    otpStore.delete(normalizedEmail);

    return NextResponse.json({ 
      message: 'Email verified successfully',
      verified: true,
      email: normalizedEmail
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
