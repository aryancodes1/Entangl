'use client'

import { useState } from 'react';

export default function PhoneVerification({ onVerificationComplete, onBack, context = 'signup' }) {
  const [step, setStep] = useState('phone'); // 'phone' or 'otp'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Helper functions defined early
  const handlePhoneSubmit = (e) => {
    e.preventDefault();
    sendOTP();
  };

  const handleOtpSubmit = (e) => {
    e.preventDefault();
    verifyOTP();
  };

  const sendOTP = async () => {
    if (!phoneNumber || phoneNumber.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('Sending OTP to:', phoneNumber);
      
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber }),
      });

      const data = await response.json();
      console.log('Send OTP response:', data);

      if (response.ok) {
        setStep('otp');
        setPhoneNumber(data.phoneNumber || phoneNumber); // Use formatted phone number
        
        setResendCooldown(60);
        const interval = setInterval(() => {
          setResendCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        // Success message
        alert('OTP sent successfully! Check your phone for the verification code.');
      } else {
        console.error('Send OTP failed:', data);
        setError(data.error || 'Failed to send OTP');
        
        // Show more specific error for Twilio issues
        if (data.code) {
          setError(`${data.error} (Code: ${data.code})`);
        }
      }
    } catch (error) {
      console.error('Network error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('Verifying OTP:', otp, 'for phone:', phoneNumber);
      
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber, otp }),
      });

      const data = await response.json();
      console.log('Verify OTP response:', data);

      if (response.ok) {
        // Store verification status in localStorage
        localStorage.setItem('phoneVerified', 'true');
        localStorage.setItem('verifiedPhone', data.phoneNumber || phoneNumber);
        
        alert('Phone number verified successfully!');
        onVerificationComplete(data.phoneNumber || phoneNumber);
      } else {
        console.error('Verify OTP failed:', data);
        setError(data.error || 'Invalid OTP');
      }
    } catch (error) {
      console.error('Network error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'phone') {
    return (
      <div className="space-y-6 text-center">
        <div>
          <h1 className="text-4xl font-bold">Verify your phone</h1>
          <p className="text-gray-400 mt-2">
            {context === 'login' 
              ? 'Phone verification is required to sign in' 
              : "We'll send you a code to verify your number"
            }
          </p>
        </div>
        
        <form onSubmit={handlePhoneSubmit} className="space-y-4 text-left">
          <input
            type="tel"
            placeholder="Phone number (e.g., +1234567890 or 1234567890)"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full px-4 py-3 border border-gray-700 rounded-md bg-black text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
            required
          />
          {error && (
            <div className="bg-red-900/20 border border-red-700 rounded-md p-3">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-violet-500 text-white font-bold py-2.5 rounded-full hover:bg-violet-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send OTP'}
          </button>
        </form>

        <button 
          onClick={onBack}
          className="text-violet-400 hover:underline text-sm"
        >
          {context === 'login' ? 'Back to sign in' : 'Back to sign up'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-center">
      <div>
        <h1 className="text-4xl font-bold">Enter verification code</h1>
        <p className="text-gray-400 mt-2">We sent a code to {phoneNumber}</p>
        <p className="text-gray-500 text-sm mt-1">Code expires in 10 minutes</p>
      </div>
      
      <form onSubmit={handleOtpSubmit} className="space-y-4 text-left">
        <input
          type="text"
          placeholder="6-digit code"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="w-full px-4 py-3 border border-gray-700 rounded-md bg-black text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 text-center text-2xl tracking-widest"
          maxLength={6}
          required
        />
        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-md p-3">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-violet-500 text-white font-bold py-2.5 rounded-full hover:bg-violet-600 transition-colors disabled:opacity-50"
        >
          {loading ? 'Verifying...' : 'Verify'}
        </button>
      </form>

      <div className="space-y-2">
        <button 
          onClick={() => setStep('phone')}
          className="text-violet-400 hover:underline text-sm block w-full"
        >
          Change phone number
        </button>
        <button 
          onClick={sendOTP}
          disabled={resendCooldown > 0 || loading}
          className="text-violet-400 hover:underline text-sm disabled:text-gray-500 disabled:cursor-not-allowed"
        >
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
        </button>
      </div>
    </div>
  );
}
