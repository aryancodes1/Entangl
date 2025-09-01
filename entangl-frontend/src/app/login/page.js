'use client'

import Link from 'next/link';
import { signIn, getSession, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import EmailVerification from '../../components/EmailVerification';

export default function LogIn() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState(null);
  const [formData, setFormData] = useState({
    identifier: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const session = await getSession();
      const token = localStorage.getItem('token');
      
      // If user is already authenticated via session or token, redirect to profile
      if (session || token) {
        router.push('/profile');
      }
    };
    checkSession();

    // Check if email is already verified
    const emailVerified = localStorage.getItem('emailVerified');
    const email = localStorage.getItem('verifiedEmail');
    if (emailVerified === 'true' && email) {
      setVerifiedEmail(email);
    }
  }, [router]);

  useEffect(() => {
    // Clear any existing auth state when visiting login page
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      const loginMethod = localStorage.getItem('loginMethod');
      
      console.log('Login page auth check:', { hasSession: !!session, hasToken: !!token, loginMethod, status });
      
      // If user is already authenticated and not being redirected, go to feed
      if ((token && loginMethod === 'manual') || (session && status === 'authenticated')) {
        console.log('User already authenticated, redirecting to feed');
        router.push('/feed');
        return;
      }
      
      // Clear any stale auth data only if not authenticated
      if (status !== 'loading' && !session && !token) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('loginMethod');
        localStorage.removeItem('emailVerified');
        localStorage.removeItem('verifiedEmail');
      }
    }
  }, [session, status, router]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleManualLogin = async (e) => {
    e.preventDefault();
    
    // Check if email is verified
    const emailVerified = localStorage.getItem('emailVerified');
    if (emailVerified !== 'true') {
      setShowEmailVerification(true);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      // Check if the response is actually JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response. Please check if the backend is running.');
      }

      const data = await response.json();

      if (response.ok) {
        // Store token and redirect
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('loginMethod', 'manual');
        
        router.push('/profile');
      } else {
        setErrors({ general: data.error || 'Login failed' });
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error.message.includes('non-JSON response')) {
        setErrors({ general: 'Backend server is not responding correctly. Please check if the server is running on http://localhost:8080' });
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setErrors({ general: 'Cannot connect to server. Please check if the backend is running on http://localhost:8080' });
      } else if (error.message.includes('404')) {
        setErrors({ general: 'Login endpoint not found. Please verify your backend API endpoints.' });
      } else if (error.name === 'TypeError' && (error.message.includes('CORS') || error.message.includes('blocked'))) {
        setErrors({ general: 'CORS error: Backend server needs to allow requests from this domain. Check your backend CORS configuration.' });
      } else if (error.message.includes('CORB') || error.message.includes('Cross-Origin')) {
        setErrors({ general: 'Cross-origin request blocked. Please configure CORS on your backend server.' });
      } else {
        setErrors({ general: 'Login failed. Please try again. If the issue persists, check if your backend server is configured correctly.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    // Check if email is verified
    const emailVerified = localStorage.getItem('emailVerified');
    if (emailVerified !== 'true') {
      setShowEmailVerification(true);
      return;
    }
    
    localStorage.setItem('loginMethod', 'google');
    signIn('google', { callbackUrl: '/profile' });
  };

  const handleEmailVerificationComplete = (email) => {
    setVerifiedEmail(email);
    setShowEmailVerification(false);
    // Automatically proceed to Google sign in after email verification
    localStorage.setItem('loginMethod', 'google');
    signIn('google', { callbackUrl: '/profile' });
  };

  const handleBackToLogin = () => {
    setShowEmailVerification(false);
  };

  if (showEmailVerification) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white font-sans">
        <div className="w-full max-w-sm p-4">
          <EmailVerification 
            onVerificationComplete={handleEmailVerificationComplete}
            onBack={handleBackToLogin}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white font-sans">
      <div className="w-full max-w-sm p-4">
        <div className="space-y-6 text-center">
          <h1 className="text-4xl font-bold">Sign in to Entangl</h1>
          
          {verifiedEmail && (
            <div className="bg-green-900 border border-green-700 rounded-md p-3 text-sm">
              <p className="text-green-300">✓ Email verified: {verifiedEmail}</p>
            </div>
          )}

          {!verifiedEmail && (
            <div className="bg-yellow-900 border border-yellow-700 rounded-md p-3 text-sm">
              <p className="text-yellow-300">⚠️ Email verification required to sign in</p>
            </div>
          )}
          
          <button 
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-2 bg-white text-black font-semibold py-2 rounded-full hover:bg-gray-200 transition-colors text-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 488 512"><path d="M488 261.8C488 403.3 381.5 512 244 512 109.8 512 0 402.2 0 261.8 0 120.5 109.8 8.4 244 8.4c77.3 0 143.3 30.1 191.4 78.4l-77.9 77.9C325.8 134.8 289.1 112 244 112c-66.3 0-120.3 54-120.3 120.3s54 120.3 120.3 120.3c75.3 0 104.2-52.5 108.7-79.3H244V202h151.1c2.1 11.1 3.4 22.5 3.4 34.9z"/></svg>
            {verifiedEmail ? 'Continue with Google' : 'Verify Email & Sign in with Google'}
          </button>

          <div className="flex items-center justify-center space-x-2">
            <div className="h-px bg-gray-700 w-full"></div>
            <span className="text-gray-400 font-semibold text-sm">or</span>
            <div className="h-px bg-gray-700 w-full"></div>
          </div>

          {errors.general && (
            <div className="bg-red-900 border border-red-700 rounded-md p-3 text-sm">
              <p className="text-red-300">{errors.general}</p>
            </div>
          )}

          <form onSubmit={handleManualLogin} className="space-y-4 text-left">
            <input
              type="text"
              name="identifier"
              placeholder="Username or email"
              value={formData.identifier}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-700 rounded-md bg-black text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
              disabled={!verifiedEmail}
              required
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-700 rounded-md bg-black text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
              disabled={!verifiedEmail}
              required
            />
            <button
              type="submit"
              disabled={!verifiedEmail || loading}
              className="w-full bg-violet-500 text-white font-bold py-2.5 rounded-full hover:bg-violet-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : (verifiedEmail ? 'Log in' : 'Verify Email First')}
            </button>
            <div className="text-center pt-2">
                <Link href="/password-reset" className="text-sm text-violet-400 hover:underline">
                    Forgot password?
                </Link>
            </div>
          </form>
        </div>
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Don't have an account?{' '}
            <Link href="/signup" className="text-violet-400 hover:underline">
              Sign up
            </Link>
          </p>
          {verifiedEmail && (
            <button 
              onClick={() => {
                localStorage.removeItem('emailVerified');
                localStorage.removeItem('verifiedEmail');
                setVerifiedEmail(null);
              }}
              className="text-violet-400 hover:underline text-xs mt-2 block w-full"
            >
              Use different email address
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

