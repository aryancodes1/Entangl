'use client'

import { useState } from 'react';

export default function PhoneVerification({ onVerificationComplete, onBack, context = 'signup' }) {
  const [step, setStep] = useState('phone'); // 'phone' or 'otp'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [devOtp, setDevOtp] = useState(''); // For development mode

  const sendOTP = async () => {
    if (!phoneNumber || phoneNumber.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    setError('');
    setDevOtp('');

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep('otp');
        setPhoneNumber(data.phoneNumber || phoneNumber); // Use formatted phone number
        
        // Show OTP in development mode
        if (data.otp) {
          setDevOtp(data.otp);
        }
        
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
      } else {
        setError(data.error || 'Failed to send OTP');
      }
    } catch (error) {
      setError('Network error. Please try again.');
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
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber, otp }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store verification status in localStorage
        localStorage.setItem('phoneVerified', 'true');
        localStorage.setItem('verifiedPhone', data.phoneNumber || phoneNumber);
        onVerificationComplete(data.phoneNumber || phoneNumber);
      } else {
        setError(data.error || 'Invalid OTP');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSubmit = (e) => {
    e.preventDefault();
    sendOTP();
  };

  const handleOtpSubmit = (e) => {
    e.preventDefault();
    verifyOTP();
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
          {error && <p className="text-red-500 text-sm">{error}</p>}
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
      </div>
      
      {devOtp && (
        <div className="bg-yellow-900 border border-yellow-700 rounded-md p-3 text-sm">
          <p className="text-yellow-300">Development Mode - Your OTP: <strong>{devOtp}</strong></p>
        </div>
      )}
      
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
        {error && <p className="text-red-500 text-sm">{error}</p>}
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
