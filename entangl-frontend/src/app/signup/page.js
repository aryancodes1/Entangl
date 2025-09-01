'use client'

import Link from 'next/link';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import PhoneVerification from '../../components/PhoneVerification';

export default function SignUp() {
  const router = useRouter();
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    username: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [usernameChecking, setUsernameChecking] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const session = await getSession();
      if (session) {
        router.push('/profile');
      }
    };
    checkSession();

    // Check if phone is already verified
    const phoneVerified = localStorage.getItem('phoneVerified');
    const phone = localStorage.getItem('verifiedPhone');
    if (phoneVerified === 'true' && phone) {
      setVerifiedPhone(phone);
    }
  }, [router]);

  const checkUsername = async (username) => {
    if (!username || username.length < 3) return;
    
    setUsernameChecking(true);
    try {
      const response = await fetch('http://localhost:8080/api/auth/check-username', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      });
      const data = await response.json();
      
      if (!data.available) {
        setErrors(prev => ({ ...prev, username: 'Username is already taken' }));
      } else {
        setErrors(prev => ({ ...prev, username: '' }));
      }
    } catch (error) {
      console.error('Username check failed:', error);
    } finally {
      setUsernameChecking(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Check username availability
    if (name === 'username') {
      const timeoutId = setTimeout(() => checkUsername(value), 500);
      return () => clearTimeout(timeoutId);
    }
  };

  const handleManualSignup = async (e) => {
    e.preventDefault();
    
    // Check if phone is verified
    const phoneVerified = localStorage.getItem('phoneVerified');
    if (phoneVerified !== 'true') {
      setShowPhoneVerification(true);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8080/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          username: formData.username,
          displayName: formData.fullName,
          password: formData.password,
          phone: verifiedPhone
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store token and redirect
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        router.push('/profile');
      } else {
        setErrors({ general: data.error });
      }
    } catch (error) {
      setErrors({ general: 'Signup failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      
      // Store that we're using Google login
      localStorage.setItem('loginMethod', 'google');
      
      const result = await signIn('google', { 
        redirect: false,
        callbackUrl: '/feed'
      });
      
      if (result?.error) {
        console.error('Google sign in error:', result.error);
        setError('Google sign in failed. Please try again.');
        localStorage.removeItem('loginMethod');
      } else if (result?.ok) {
        console.log('Google sign in successful, redirecting...');
        router.push('/feed');
      }
    } catch (error) {
      console.error('Google sign in error:', error);
      setError('Google sign in failed. Please try again.');
      localStorage.removeItem('loginMethod');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneVerificationComplete = (phoneNumber) => {
    setVerifiedPhone(phoneNumber);
    setShowPhoneVerification(false);
  };

  const handleBackToSignup = () => {
    setShowPhoneVerification(false);
  };

  if (showPhoneVerification) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white font-sans">
        <div className="w-full max-w-sm p-4">
          <PhoneVerification 
            onVerificationComplete={handlePhoneVerificationComplete}
            onBack={handleBackToSignup}
            context="signup"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white font-sans">
      <div className="w-full max-w-sm p-4">
        <div className="space-y-6 text-center">
          <h1 className="text-4xl font-bold">Create your account</h1>
          
          {verifiedPhone && (
            <div className="bg-green-900 border border-green-700 rounded-md p-3 text-sm">
              <p className="text-green-300">✓ Phone verified: {verifiedPhone}</p>
            </div>
          )}

          {!verifiedPhone && (
            <div className="bg-yellow-900 border border-yellow-700 rounded-md p-3 text-sm">
              <p className="text-yellow-300">⚠️ Phone verification required to sign up</p>
            </div>
          )}
          
          <div className="pt-2">
            <button 
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-2 bg-white text-black font-semibold py-2 rounded-full hover:bg-gray-200 transition-colors text-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 488 512"><path d="M488 261.8C488 403.3 381.5 512 244 512 109.8 512 0 402.2 0 261.8 0 120.5 109.8 8.4 244 8.4c77.3 0 143.3 30.1 191.4 78.4l-77.9 77.9C325.8 134.8 289.1 112 244 112c-66.3 0-120.3 54-120.3 120.3s54 120.3 120.3 120.3c75.3 0 104.2-52.5 108.7-79.3H244V202h151.1c2.1 11.1 3.4 22.5 3.4 34.9z"/></svg>
              {verifiedPhone ? 'Continue with Google' : 'Verify Phone & Sign up with Google'}
            </button>
            <div className="flex items-center justify-center space-x-2 my-4">
              <div className="h-px bg-gray-700 w-full"></div>
              <span className="text-gray-400 font-semibold text-sm">or</span>
              <div className="h-px bg-gray-700 w-full"></div>
            </div>
          </div>

          {errors.general && (
            <div className="bg-red-900 border border-red-700 rounded-md p-3 text-sm">
              <p className="text-red-300">{errors.general}</p>
            </div>
          )}

          <form onSubmit={handleManualSignup} className="space-y-4 text-left">
            <div>
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-700 rounded-md bg-black text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                disabled={!verifiedPhone}
                required
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>
            
            <div>
              <input
                type="text"
                name="fullName"
                placeholder="Full Name"
                value={formData.fullName}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-700 rounded-md bg-black text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                disabled={!verifiedPhone}
                required
              />
              {errors.fullName && <p className="text-red-400 text-xs mt-1">{errors.fullName}</p>}
            </div>
            
            <div>
              <input
                type="text"
                name="username"
                placeholder="Username"
                value={formData.username}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-700 rounded-md bg-black text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                disabled={!verifiedPhone}
                required
              />
              {usernameChecking && <p className="text-gray-400 text-xs mt-1">Checking availability...</p>}
              {errors.username && <p className="text-red-400 text-xs mt-1">{errors.username}</p>}
            </div>
            
            <div>
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-700 rounded-md bg-black text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                disabled={!verifiedPhone}
                required
                minLength={6}
              />
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
            </div>
            
            <p className="text-xs text-gray-500 text-center pt-2 pb-1">
              By signing up, you agree to our Terms, Privacy Policy and Cookies Policy.
            </p>
            <button
              type="submit"
              disabled={!verifiedPhone || loading || usernameChecking || errors.username}
              className="w-full bg-violet-500 text-white font-bold py-2.5 rounded-full hover:bg-violet-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Account...' : (verifiedPhone ? 'Sign up' : 'Verify Phone First')}
            </button>
          </form>
        </div>
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Have an account?{' '}
            <Link href="/login" className="text-violet-400 hover:underline">
              Log in
            </Link>
          </p>
          {verifiedPhone && (
            <button 
              onClick={() => {
                localStorage.removeItem('phoneVerified');
                localStorage.removeItem('verifiedPhone');
                setVerifiedPhone(null);
              }}
              className="text-violet-400 hover:underline text-xs mt-2 block w-full"
            >
              Use different phone number
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

