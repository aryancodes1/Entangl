'use client'

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navigation from '../../components/Navigation';
import PostCard from '../../components/PostCard';

export default function Profile() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: '',
    bio: '',
    avatar: ''
  });
  const [activeTab, setActiveTab] = useState('posts');
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const handleUserData = async () => {
    try {
      setLoading(true);
      const loginMethod = localStorage.getItem('loginMethod');
      const token = localStorage.getItem('token');
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');

      console.log('handleUserData called:', {
        loginMethod,
        hasToken: !!token,
        hasSession: !!session
      });

      // Always fetch fresh data from API if we have token and user ID
      if (token && storedUser.id) {
        try {
          const response = await fetch(`http://localhost:8080/api/users/${storedUser.id}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const freshUserData = await response.json();
            setUserData({
              ...freshUserData,
              loginMethod: loginMethod || 'manual'
            });
            
            // Update localStorage with fresh data
            localStorage.setItem('user', JSON.stringify({
              ...storedUser,
              ...freshUserData
            }));
            return;
          } else {
            console.error('Failed to fetch fresh user data:', response.status);
          }
        } catch (apiError) {
          console.error('API fetch error:', apiError);
        }
      }

      // Fallback to stored data if API fails
      if (storedUser.id && token) {
        setUserData({
          ...storedUser,
          loginMethod: loginMethod || 'manual'
        });
        return;
      }

      // For Google login with session but no stored data
      if (loginMethod === 'google' && session?.user) {
        // Check if session has database token
        if (session.user.dbToken && session.user.id) {
          console.log('Storing Google user data from session');
          localStorage.setItem('token', session.user.dbToken);
          localStorage.setItem('user', JSON.stringify({
            id: session.user.id,
            email: session.user.email,
            username: session.user.username,
            displayName: session.user.name,
            avatar: session.user.image,
            verified: true
          }));
          
          setUserData({
            id: session.user.id,
            email: session.user.email,
            username: session.user.username,
            displayName: session.user.name,
            avatar: session.user.image,
            verified: true,
            loginMethod: 'google'
          });
          return;
        }
        
        // Fallback for Google users without database token
        setUserData({
          firstName: session.user.name?.split(' ')[0] || '',
          lastName: session.user.name?.split(' ').slice(1).join(' ') || '',
          email: session.user.email,
          username: session.user.email?.split('@')[0] || '',
          profileImage: session.user.image,
          loginMethod: 'google'
        });
      } 
      // For manual login with token
      else if (loginMethod === 'manual' && token) {
        await fetchUserDataFromDB();
      }
      else {
        throw new Error('No valid authentication found');
      }
    } catch (error) {
      setError('Failed to load user data');
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDataFromDB = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      if (!token || !user.id) {
        throw new Error('No token or user ID found');
      }

      // Fetch user profile with counts
      const response = await fetch(`http://localhost:8080/api/users/${user.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserData({
          ...data,
          loginMethod: 'manual'
        });
        
        // Update localStorage with fresh data
        localStorage.setItem('user', JSON.stringify({
          ...user,
          ...data
        }));
      } else {
        throw new Error(`HTTP ${response.status}`);
      }

    } catch (error) {
      setError(error.message);
    }
  };

  const fetchUserPosts = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      if (!user.id) return;

      const response = await fetch(`http://localhost:8080/api/posts?userId=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const postsData = await response.json();
        setPosts(postsData);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  const handleEditProfile = () => {
    setEditForm({
      displayName: userData?.displayName || '',
      bio: userData?.bio || '',
      avatar: userData?.avatar || ''
    });
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');

      const response = await fetch(`http://localhost:8080/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUserData({ ...userData, ...updatedUser });
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      const loginMethod = localStorage.getItem('loginMethod');
      
      console.log('Logging out with method:', loginMethod);
      
      // Clear localStorage first
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('phoneVerified');
      localStorage.removeItem('verifiedPhone');
      localStorage.removeItem('loginMethod');
      
      // Clear user data immediately
      setUserData(null);
      setShowLogoutMenu(false);
      
      // If logged in via Google, sign out from NextAuth
      if (loginMethod === 'google' && session) {
        await signOut({ 
          callbackUrl: '/login',
          redirect: false // Prevent automatic redirect
        });
      }
      
      // Manual redirect to login page
      window.location.href = '/login';
      
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect even if logout fails
      window.location.href = '/login';
    }
  };

  useEffect(() => {
    // Don't run until NextAuth session status is determined
    if (status === 'loading') {
      console.log('NextAuth session loading...');
      return;
    }

    console.log('Auth check:', { 
      status, 
      hasSession: !!session, 
      authChecked,
      loginMethod: localStorage.getItem('loginMethod'),
      hasToken: !!localStorage.getItem('token')
    });

    // Mark that we've checked auth at least once
    if (!authChecked) {
      setAuthChecked(true);
    }

    const token = localStorage.getItem('token');
    const loginMethod = localStorage.getItem('loginMethod');

    // Check if user is authenticated by any method
    const isAuthenticated = (
      (status === 'authenticated' && session) || 
      (loginMethod === 'manual' && token) ||
      (loginMethod === 'google' && session)
    );

    console.log('Is authenticated:', isAuthenticated);

    if (!isAuthenticated && authChecked) {
      console.log('Not authenticated, redirecting to login...');
      router.push('/login');
      return;
    }

    if (isAuthenticated) {
      console.log('Authenticated, loading user data...');
      handleUserData();
      fetchUserPosts();
    }

  }, [status, session, authChecked, router]);

  // Prevent rendering until auth is properly checked
  if (status === 'loading' || !authChecked) {
    return (
      <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
        <Navigation />
        <div className="lg:ml-64">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navigation />
        <div className="lg:ml-64">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navigation />
        <div className="lg:ml-64">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-6 max-w-md">
              <p className="text-red-300">{error}</p>
            </div>
            <button
              onClick={handleUserData}
              className="bg-blue-500 text-white px-6 py-2 rounded-full hover:bg-blue-600 transition-colors mr-4"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <Navigation />
      
      <div className="lg:ml-64">
        <div className="max-w-2xl mx-auto border-x border-gray-200 dark:border-gray-800 min-h-screen">
          {/* Header with Logout */}
          <div className="sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between z-50">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => router.push('/feed')} 
                className="text-gray-400 hover:text-black dark:hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold">
                  {userData?.displayName || userData?.firstName || userData?.username}
                </h1>
                <p className="text-sm text-gray-500">{posts.length} Posts</p>
              </div>
            </div>

            {/* Logout Menu */}
            <div className="relative">
              <button
                onClick={() => setShowLogoutMenu(!showLogoutMenu)}
                className="p-2 text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>

              {showLogoutMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50">
                  <button
                    onClick={handleLogout}
                    disabled={loading}
                    className="w-full px-4 py-3 text-left text-red-600 hover:bg-gray-50 dark:hover:bg-gray-800 first:rounded-t-xl last:rounded-b-xl transition-colors flex items-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>{loading ? 'Logging out...' : `Log out @${userData?.username}`}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Profile Section */}
          <div>
            {/* Cover Image */}
            <div className="h-48 bg-gradient-to-r from-blue-500 to-purple-600 relative">
              <div className="absolute inset-0 bg-black/20"></div>
            </div>

            {/* Profile Info */}
            <div className="px-4 pb-4">
              <div className="flex justify-between items-start -mt-16 relative z-10">
                {/* Profile Picture */}
                <div className="relative">
                  {userData?.profileImage || userData?.avatar ? (
                    <img
                      src={userData.profileImage || userData.avatar}
                      alt="Profile"
                      className="w-32 h-32 rounded-full border-4 border-white dark:border-black bg-gray-200 dark:bg-gray-800"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full border-4 border-white dark:border-black bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <span className="text-4xl font-bold text-white">
                        {userData?.displayName?.[0] || userData?.firstName?.[0] || userData?.username?.[0] || '?'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="mt-16">
                  {userData?.loginMethod === 'manual' && !isEditing && (
                    <button
                      onClick={handleEditProfile}
                      className="border border-gray-300 dark:border-gray-600 text-black dark:text-white px-6 py-2 rounded-full font-medium hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                    >
                      Edit profile
                    </button>
                  )}
                </div>
              </div>

              {/* Edit Profile Form */}
              {isEditing && (
                <div className="mt-6 bg-gray-900 rounded-lg p-4 border border-gray-700">
                  <h3 className="text-lg font-semibold mb-4">Edit Profile</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={editForm.displayName}
                        onChange={(e) => setEditForm({...editForm, displayName: e.target.value})}
                        className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Bio
                      </label>
                      <textarea
                        value={editForm.bio}
                        onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                        rows={3}
                        className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        placeholder="Tell us about yourself"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Avatar URL
                      </label>
                      <input
                        type="url"
                        value={editForm.avatar}
                        onChange={(e) => setEditForm({...editForm, avatar: e.target.value})}
                        className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://example.com/avatar.jpg"
                      />
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={handleSaveProfile}
                        className="bg-blue-500 text-white px-6 py-2 rounded-full font-medium hover:bg-blue-600 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="border border-gray-600 text-white px-6 py-2 rounded-full font-medium hover:bg-gray-900 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* User Info */}
              {!isEditing && (
                <div className="mt-4 space-y-3">
                  <div>
                    <h2 className="text-xl font-bold">
                      {userData?.displayName || `${userData?.firstName} ${userData?.lastName}`.trim() || userData?.username}
                    </h2>
                    {userData?.username && (
                      <p className="text-gray-500">@{userData.username}</p>
                    )}
                  </div>

                  {userData?.bio && (
                    <p className="text-black dark:text-white">{userData.bio}</p>
                  )}

                  <div className="flex items-center space-x-4 text-gray-500 text-sm">
                    <div className="flex items-center space-x-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                      <span>Joined {userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Recently'}</span>
                    </div>
                  </div>

                  <div className="flex space-x-6">
                    <button className="hover:underline">
                      <span className="font-bold text-black dark:text-white">
                        {userData?._count?.following || 0}
                      </span>
                      <span className="text-gray-500 ml-1">Following</span>
                    </button>
                    <button className="hover:underline">
                      <span className="font-bold text-black dark:text-white">
                        {userData?._count?.followers || 0}
                      </span>
                      <span className="text-gray-500 ml-1">Followers</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="border-t border-gray-200 dark:border-gray-800">
              <div className="flex">
                {['Posts', 'Replies', 'Media', 'Likes'].map((tab) => (
                  <button 
                    key={tab}
                    onClick={() => setActiveTab(tab.toLowerCase())}
                    className={`flex-1 py-4 text-center font-medium transition-colors relative ${
                      activeTab === tab.toLowerCase() 
                        ? 'text-black dark:text-white' 
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    {tab}
                    {activeTab === tab.toLowerCase() && (
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-blue-500 rounded-full"></div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Content with Scrolling */}
            <div className="min-h-[400px] max-h-screen overflow-y-auto">
              {activeTab === 'posts' && (
                <>
                  {posts.length === 0 ? (
                    <div className="text-center py-12 px-4">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <h3 className="text-2xl font-bold mb-2 text-black dark:text-white">You haven't posted anything yet</h3>
                      <p className="text-gray-500 mb-4">When you post something, it'll show up here.</p>
                      <button 
                        onClick={() => router.push('/feed')}
                        className="bg-blue-500 text-white px-6 py-2 rounded-full font-medium hover:bg-blue-600 transition-colors"
                      >
                        Post something
                      </button>
                    </div>
                  ) : (
                    <div>
                      {posts.map(post => (
                        <PostCard
                          key={post.id}
                          post={post}
                          currentUserId={userData?.id}
                          onDelete={(postId) => setPosts(prev => prev.filter(p => p.id !== postId))}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeTab !== 'posts' && (
                <div className="text-center py-12 px-4">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-black dark:text-white">Nothing to see here — yet</h3>
                  <p className="text-gray-500">
                    {activeTab === 'replies' && "When you reply to someone, it'll show up here."}
                    {activeTab === 'media' && "When you post photos or videos, they'll show up here."}
                    {activeTab === 'likes' && "When you like a post, it'll show up here."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile bottom navigation spacing */}
      <div className="h-16 lg:hidden"></div>

      {/* Click outside to close menu */}
      {showLogoutMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowLogoutMenu(false)}
        ></div>
      )}
    </div>
  );
}