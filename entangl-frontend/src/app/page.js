'use client'

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const session = await getSession();
      const token = localStorage.getItem('token');
      
      if (session || token) {
        router.push('/profile');
      } else {
        setLoading(false);
      }
    };
    
    checkSession();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white font-sans">
      <div className="w-full max-w-md p-8 text-center">
        <div className="space-y-8">
          <div>
            <h1 className="text-6xl font-bold mb-4">Entangl</h1>
            <p className="text-xl text-gray-300">Connect, Share, Discover</p>
          </div>
          
          <div className="space-y-4">
            <Link
              href="/signup"
              className="block w-full bg-violet-500 text-white font-bold py-3 rounded-full hover:bg-violet-600 transition-colors"
            >
              Sign up
            </Link>
            
            <Link
              href="/login"
              className="block w-full border border-gray-700 text-white font-bold py-3 rounded-full hover:bg-gray-900 transition-colors"
            >
              Log in
            </Link>
          </div>
          
          <div className="pt-8">
            <p className="text-sm text-gray-500">
              Join Entangl today and start connecting with others.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
