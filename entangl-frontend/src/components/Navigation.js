'use client'

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';

export default function Navigation() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const loginMethod = localStorage.getItem('loginMethod');
    if (loginMethod === 'google' && session?.user) {
      setCurrentUser({
        id: session.user.id,
        name: session.user.name,
        username: session.user.email?.split('@')[0],
        image: session.user.image
      });
    } else {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.id) {
        setCurrentUser(user);
      }
    }

    // Fetch notification count
    if (currentUser?.id || session?.user?.id) {
      fetchNotificationCount();
    }

    // Listen for notification updates
    const handleNotificationUpdate = () => {
      fetchNotificationCount();
    };

    const handleNotificationsViewed = () => {
      setNotificationCount(0);
    };

    window.addEventListener('notificationCountChanged', handleNotificationUpdate);
    window.addEventListener('notificationsViewed', handleNotificationsViewed);

    return () => {
      window.removeEventListener('notificationCountChanged', handleNotificationUpdate);
      window.removeEventListener('notificationsViewed', handleNotificationsViewed);
    };
  }, [session, currentUser?.id]);

  const fetchNotificationCount = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_NODE_BACKEND_URL}/api/follows/requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const requests = await response.json();
        setNotificationCount(requests.length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery(''); // Clear after search
    }
  };

  const handleLogout = async () => {
    try {
      const loginMethod = localStorage.getItem('loginMethod');
      
      // Clear localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('phoneVerified');
      localStorage.removeItem('verifiedPhone');
      localStorage.removeItem('loginMethod');
      
      // If logged in via Google, sign out from NextAuth
      if (loginMethod === 'google' && session) {
        await signOut({ 
          callbackUrl: '/login',
          redirect: false 
        });
      }
      
      // Force redirect
      window.location.href = '/login';
      
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/login';
    }
  };

  const navItems = [
    { href: '/feed', icon: 'home', label: 'Home' },
    { href: '/explore', icon: 'explore', label: 'Explore' },
    { href: '/notifications', icon: 'notifications', label: 'Notifications', hasNotification: notificationCount > 0 },
    { href: '/messages', icon: 'messages', label: 'Messages' },
    { href: '/profile', icon: 'profile', label: 'Profile' }
  ];

  const getIcon = (iconName, isActive) => {
    const className = `w-7 h-7 ${isActive ? 'text-white' : 'text-gray-300'}`;
    
    switch (iconName) {
      case 'home':
        return (
          <svg className={className} fill={isActive ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isActive ? 0 : 2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        );
      case 'explore':
        return (
          <svg className={className} fill={isActive ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isActive ? 0 : 2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        );
      case 'notifications':
        return (
          <svg className={className} fill={isActive ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isActive ? 0 : 2} d="M15 17h5l-5-5h5l-5-5H9l3 5-3 5h6z" />
          </svg>
        );
      case 'messages':
        return (
          <svg className={className} fill={isActive ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isActive ? 0 : 2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      case 'profile':
        return (
          <svg className={className} fill={isActive ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isActive ? 0 : 2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex">
      {/* Sidebar Navigation */}
      <div className="fixed left-0 top-0 h-full w-64 bg-black border-r border-gray-800 p-4 hidden lg:block">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <Link href="/feed" className="text-2xl font-bold text-white hover:text-violet-400 transition-colors mb-8">
            Entangl
          </Link>

          {/* Navigation Items */}
          <nav className="flex-1">
            <ul className="space-y-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center space-x-4 px-4 py-3 rounded-full text-xl transition-colors hover:bg-gray-900 relative ${
                        isActive ? 'font-bold' : 'font-normal'
                      }`}
                    >
                      {getIcon(item.icon, isActive)}
                      <span className={isActive ? 'text-white' : 'text-gray-300'}>
                        {item.label}
                      </span>
                      {item.hasNotification && (
                        <div className="absolute top-2 left-7 w-2 h-2 bg-red-500 rounded-full"></div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Post Button */}
            <button
              onClick={() => router.push('/compose')}
              className="w-full mt-6 bg-blue-500 text-white font-bold py-3 rounded-full hover:bg-blue-600 transition-colors"
            >
              Post
            </button>
          </nav>

          {/* User Profile */}
          {currentUser && (
            <div className="mt-auto">
              <div className="flex items-center justify-between p-3 rounded-full hover:bg-gray-900 transition-colors cursor-pointer">
                <div className="flex items-center space-x-3">
                  {currentUser.image || currentUser.avatar ? (
                    <img
                      src={currentUser.image || currentUser.avatar}
                      alt={currentUser.displayName || currentUser.name}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                      <span className="text-white font-semibold">
                        {(currentUser.displayName || currentUser.name)?.[0] || currentUser.username?.[0]}
                      </span>
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-bold text-white text-sm">
                      {currentUser.displayName || currentUser.name || currentUser.username}
                    </p>
                    <p className="text-gray-500 text-sm">@{currentUser.username}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="fixed top-0 left-0 right-0 bg-black/80 backdrop-blur-md border-b border-gray-800 z-50 lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Mobile Menu Button */}
          <button className="text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Logo */}
          <Link href="/feed" className="text-xl font-bold text-white">
            Entangl
          </Link>

          {/* Profile Button */}
          <Link href="/profile">
            {currentUser?.image ? (
              <img
                src={currentUser.image}
                alt="Profile"
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <span className="text-white text-sm font-semibold">
                  {currentUser?.name?.[0] || 'U'}
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-3">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <input
                type="text"
                placeholder="Search Entangl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-900 text-white placeholder-gray-500 rounded-full py-2 px-4 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </form>
        </div>
      </div>

      {/* Bottom Mobile Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 lg:hidden">
        <div className="flex justify-around py-2">
          {navItems.slice(0, 4).map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center py-2 px-3 relative"
              >
                {getIcon(item.icon, isActive)}
                {item.hasNotification && (
                  <div className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full"></div>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
