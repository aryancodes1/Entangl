'use client'

import { useState } from 'react';

export default function EmailVerification({ onVerificationComplete, onBack, context = 'signup' }) {
  const [step, setStep] = useState('email'); // 'email' or 'otp'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    sendOTP();
  };

  const handleOtpSubmit = (e) => {
    e.preventDefault();
    verifyOTP();
  };

  const sendOTP = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('Sending OTP to:', email);
      
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      console.log('Send OTP response:', data);

      if (response.ok) {
        setStep('otp');
        setEmail(data.email || email);
        
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
        
        // Show appropriate success message
        if (data.warning) {
          alert(`${data.message}. ${data.warning}`);
        } else {
          alert('OTP sent successfully! Check your email for the verification code.');
        }
      } else {
        console.error('Send OTP failed:', data);
        setError(data.error || 'Failed to send OTP');
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
      console.log('Verifying OTP:', otp, 'for email:', email);
      
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();
      console.log('Verify OTP response:', data);

      if (response.ok) {
        // Store verification status in localStorage
        localStorage.setItem('emailVerified', 'true');
        localStorage.setItem('verifiedEmail', data.email || email);
        
        alert('Email verified successfully!');
        onVerificationComplete(data.email || email);
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

  if (step === 'email') {
    return (
      <div className="space-y-6 text-center">
        <div>
          <h1 className="text-4xl font-bold">Verify your email</h1>
          <p className="text-gray-400 mt-2">
            {context === 'login' 
              ? 'Email verification is required to sign in' 
              : "We'll send you a code to verify your email"
            }
          </p>
          <div className="mt-3 p-3 bg-blue-900/20 border border-blue-700 rounded-md">
            <p className="text-blue-300 text-sm">
              📧 Real verification email will be sent to your inbox
            </p>
          </div>
        </div>
        
        <form onSubmit={handleEmailSubmit} className="space-y-4 text-left">
          <input
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border border-gray-700 rounded-md bg-black text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
            required
          />
          <div className="text-xs text-gray-400">
            <p>• Enter your real email address</p>
            <p>• You will receive an email with a 6-digit code</p>
            <p>• Check your spam folder if you don't see it</p>
          </div>
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
            {loading ? 'Sending Email...' : 'Send OTP'}
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
        <p className="text-gray-400 mt-2">We sent a code to {email}</p>
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
          onClick={() => setStep('email')}
          className="text-violet-400 hover:underline text-sm block w-full"
        >
          Change email address
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
