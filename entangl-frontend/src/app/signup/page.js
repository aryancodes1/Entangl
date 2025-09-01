'use client'

import Link from 'next/link';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SignUp() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const session = await getSession();
      if (session) {
        router.push('/profile');
      }
    };
    checkSession();
  }, [router]);

  const handleGoogleSignUp = () => {
    signIn('google', { callbackUrl: '/profile' });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white font-sans">
      <div className="w-full max-w-sm p-4">
        <div className="space-y-6 text-center">
          <h1 className="text-4xl font-bold">Create your account</h1>
          
          <div className="pt-2">
            <button 
              onClick={handleGoogleSignUp}
              className="w-full flex items-center justify-center gap-2 bg-white text-black font-semibold py-2 rounded-full hover:bg-gray-200 transition-colors text-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 488 512"><path d="M488 261.8C488 403.3 381.5 512 244 512 109.8 512 0 402.2 0 261.8 0 120.5 109.8 8.4 244 8.4c77.3 0 143.3 30.1 191.4 78.4l-77.9 77.9C325.8 134.8 289.1 112 244 112c-66.3 0-120.3 54-120.3 120.3s54 120.3 120.3 120.3c75.3 0 104.2-52.5 108.7-79.3H244V202h151.1c2.1 11.1 3.4 22.5 3.4 34.9z"/></svg>
              Sign up with Google
            </button>
            <div className="flex items-center justify-center space-x-2 my-4">
              <div className="h-px bg-gray-700 w-full"></div>
              <span className="text-gray-400 font-semibold text-sm">or</span>
              <div className="h-px bg-gray-700 w-full"></div>
            </div>
          </div>
          <form className="space-y-4 text-left">
            <input
              type="email"
              placeholder="Email"
              className="w-full px-4 py-3 border border-gray-700 rounded-md bg-black text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
            />
            <input
              type="text"
              placeholder="Full Name"
              className="w-full px-4 py-3 border border-gray-700 rounded-md bg-black text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
            />
            <input
              type="text"
              placeholder="Username"
              className="w-full px-4 py-3 border border-gray-700 rounded-md bg-black text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full px-4 py-3 border border-gray-700 rounded-md bg-black text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
            />
            <p className="text-xs text-gray-500 text-center pt-2 pb-1">
              By signing up, you agree to our Terms, Privacy Policy and Cookies Policy.
            </p>
            <button
              type="submit"
              className="w-full bg-violet-500 text-white font-bold py-2.5 rounded-full hover:bg-violet-600 transition-colors disabled:opacity-50"
            >
              Sign up
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
        </div>
      </div>
    </div>
  );
}

