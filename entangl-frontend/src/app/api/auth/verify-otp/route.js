import { NextResponse } from 'next/server';

// Use the same global store as send-otp
const otpStore = global.otpStore || new Map();
if (!global.otpStore) {
  global.otpStore = otpStore;
}

export async function POST(request) {
  try {
    const { phoneNumber, otp } = await request.json();

    if (!phoneNumber || !otp) {
      return NextResponse.json({ error: 'Phone number and OTP are required' }, { status: 400 });
    }

    // Clean and format phone number same as send-otp
    const cleanedPhone = phoneNumber.replace(/\D/g, '');
    let formattedPhone;
    
    if (phoneNumber.startsWith('+')) {
      formattedPhone = phoneNumber;
    } else if (cleanedPhone.length === 10) {
      formattedPhone = `+1${cleanedPhone}`;
    } else if (cleanedPhone.length === 11 && cleanedPhone.startsWith('1')) {
      formattedPhone = `+${cleanedPhone}`;
    } else {
      formattedPhone = `+${cleanedPhone}`;
    }

    console.log(`Verifying OTP for: ${formattedPhone}`);

    const storedData = otpStore.get(formattedPhone);

    if (!storedData) {
      console.log(`No OTP found for ${formattedPhone}`);
      return NextResponse.json({ error: 'OTP not found or expired. Please request a new one.' }, { status: 400 });
    }

    // Check if OTP is expired
    if (Date.now() > storedData.expiresAt) {
      console.log(`OTP expired for ${formattedPhone}`);
      otpStore.delete(formattedPhone);
      return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 400 });
    }

    // Check attempts limit
    if (storedData.attempts >= 3) {
      console.log(`Too many attempts for ${formattedPhone}`);
      otpStore.delete(formattedPhone);
      return NextResponse.json({ error: 'Too many failed attempts. Please request a new OTP.' }, { status: 400 });
    }

    // Verify OTP
    if (storedData.otp !== otp.toString()) {
      storedData.attempts += 1;
      otpStore.set(formattedPhone, storedData);
      
      console.log(`Invalid OTP for ${formattedPhone}. Attempts: ${storedData.attempts}`);
      
      return NextResponse.json({ 
        error: `Invalid OTP. ${3 - storedData.attempts} attempts remaining.` 
      }, { status: 400 });
    }

    // OTP verified successfully
    console.log(`OTP verified successfully for ${formattedPhone}`);
    otpStore.delete(formattedPhone);

    return NextResponse.json({ 
      message: 'Phone number verified successfully',
      verified: true,
      phoneNumber: formattedPhone
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
