'use client'

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '../../../components/Navigation';
import PostCard from '../../../components/PostCard';

export default function UserProfile({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const userId = resolvedParams.id;
  const [userData, setUserData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [followStatus, setFollowStatus] = useState('none'); // 'none', 'pending', 'following', 'self'
  const [canViewPosts, setCanViewPosts] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (currentUser.id) {
      setCurrentUserId(currentUser.id);
      setIsOwnProfile(currentUser.id === userId);
    }
    
    fetchUserData();
  }, [userId]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      // Fetch user profile data
      const userResponse = await fetch(`http://localhost:8080/api/users/${userId}`, { headers });
      
      if (!userResponse.ok) {
        throw new Error('User not found');
      }

      const user = await userResponse.json();
      setUserData(user);

      // Check follow status if not own profile
      if (currentUserId && currentUserId !== userId && token) {
        try {
          const followResponse = await fetch(`http://localhost:8080/api/follows/status/${userId}`, { headers });
          if (followResponse.ok) {
            const followData = await followResponse.json();
            setFollowStatus(followData.status || 'none');
            setCanViewPosts(followData.status === 'following' || followData.canViewPosts);
          }
        } catch (followError) {
          console.error('Error checking follow status:', followError);
        }
      } else if (currentUserId === userId) {
        // Own profile - can view posts
        setFollowStatus('self');
        setCanViewPosts(true);
      }

      // Fetch posts only if user can view them
      if (isOwnProfile || canViewPosts) {
        await fetchUserPosts();
      }

    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setCanViewPosts(false);
        return;
      }

      const response = await fetch(`http://localhost:8080/api/follows/status/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.status === 'self') {
          setFollowStatus('self');
          setCanViewPosts(true);
        } else if (data.status === 'following') {
          setFollowStatus('following');
          setCanViewPosts(true);
        } else if (data.status === 'pending') {
          setFollowStatus('pending');
          setCanViewPosts(false);
        } else {
          setFollowStatus('none');
          setCanViewPosts(false);
        }
      }
    } catch (error) {
      console.error('Error checking follow status:', error);
      setCanViewPosts(false);
    }
  };

  const fetchUserPosts = async () => {
    if (!canViewPosts) {
      setPosts([]);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8080/api/posts?userId=${userId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (response.ok) {
        const postsData = await response.json();
        setPosts(postsData);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchUserData();
      checkFollowStatus();
    }
  }, [userId]);

  useEffect(() => {
    if (userId && canViewPosts) {
      fetchUserPosts();
    } else {
      setPosts([]);
    }
  }, [userId, canViewPosts]);

  const handleFollowRequest = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        alert('Please log in to follow users');
        return;
      }

      const response = await fetch('http://localhost:8080/api/follows/request', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ followingId: userId }),
      });

      if (response.ok) {
        const data = await response.json();
        setFollowStatus(data.status);
        
        if (data.status === 'following') {
          setCanViewPosts(true);
          alert('Now following user!');
        } else if (data.status === 'pending') {
          setCanViewPosts(false);
          alert('Follow request sent! Waiting for approval.');
        } else if (data.status === 'none') {
          setCanViewPosts(false);
          alert('Follow request cancelled');
        }
      }
    } catch (error) {
      console.error('Follow request error:', error);
      alert('Error sending follow request. Please try again.');
    }
  };

  const getFollowButtonText = () => {
    switch (followStatus) {
      case 'following':
        return 'Following';
      case 'pending':
        return 'Requested';
      case 'self':
        return null; // Don't show button for own profile
      default:
        return 'Follow';
    }
  };

  const getFollowButtonStyle = () => {
    switch (followStatus) {
      case 'following':
        return 'bg-gray-200 dark:bg-gray-800 text-black dark:text-white hover:bg-red-100 dark:hover:bg-red-900 hover:text-red-600 border border-gray-300 dark:border-gray-600';
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 cursor-not-allowed border border-yellow-300';
      case 'none':
      default:
        return 'bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 border border-black dark:border-white';
    }
  };

  if (loading) {
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

  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
        <Navigation />
        <div className="lg:ml-64">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-6 max-w-md">
              <p className="text-red-300">{error}</p>
            </div>
            <button
              onClick={() => router.back()}
              className="bg-blue-500 text-white px-6 py-2 rounded-full hover:bg-blue-600 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!userData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <Navigation />
      
      <div className="lg:ml-64">
        <div className="max-w-2xl mx-auto border-x border-gray-200 dark:border-gray-800 min-h-screen">
          {/* Header */}
          <div className="sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 p-4 flex items-center space-x-4 z-50">
            <button 
              onClick={() => router.back()} 
              className="text-gray-400 hover:text-black dark:hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold">
                {userData.displayName || userData.username}
              </h1>
              <p className="text-sm text-gray-500">
                {canViewPosts || isOwnProfile ? `${posts.length} Posts` : 'Posts are private'}
              </p>
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
                  {userData.avatar ? (
                    <img
                      src={userData.avatar}
                      alt="Profile"
                      className="w-32 h-32 rounded-full border-4 border-white dark:border-black bg-gray-200 dark:bg-gray-800"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full border-4 border-white dark:border-black bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <span className="text-4xl font-bold text-white">
                        {userData.displayName?.[0] || userData.username?.[0] || '?'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="mt-16">
                  {/* Follow Button */}
                  {followStatus !== 'self' && (
                    <button
                      onClick={handleFollowRequest}
                      className={`px-6 py-2 rounded-full font-medium transition-colors ${
                        followStatus === 'following' 
                          ? 'bg-gray-200 dark:bg-gray-800 text-black dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700'
                          : followStatus === 'pending'
                          ? 'bg-gray-200 dark:bg-gray-800 text-black dark:text-white'
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                      disabled={followStatus === 'pending'}
                    >
                      {getFollowButtonText()}
                    </button>
                  )}
                </div>
              </div>

              {/* User Info */}
              <div className="mt-4 space-y-3">
                <div>
                  <h2 className="text-xl font-bold">
                    {userData.displayName || userData.username}
                  </h2>
                  <p className="text-gray-500">@{userData.username}</p>
                </div>

                {userData.bio && (
                  <p className="text-black dark:text-white">{userData.bio}</p>
                )}

                <div className="flex items-center space-x-4 text-gray-500 text-sm">
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    <span>Joined {userData.createdAt ? new Date(userData.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Recently'}</span>
                  </div>
                </div>

                <div className="flex space-x-6">
                  <span>
                    <span className="font-bold text-black dark:text-white">
                      {userData?._count?.following || 0}
                    </span>
                    <span className="text-gray-500 ml-1">Following</span>
                  </span>
                  <span>
                    <span className="font-bold text-black dark:text-white">
                      {userData?._count?.followers || 0}
                    </span>
                    <span className="text-gray-500 ml-1">Followers</span>
                  </span>
                </div>
              </div>
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

            {/* Content */}
            <div className="min-h-[400px]">
              {activeTab === 'posts' && (
                <>
                  {!canViewPosts && !isOwnProfile ? (
                    <PostCard showPrivacyMessage={true} />
                  ) : posts.length === 0 ? (
                    <div className="text-center py-12 px-4">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <h3 className="text-2xl font-bold mb-2 text-black dark:text-white">
                        {isOwnProfile ? "You haven't posted anything yet" : "No posts yet"}
                      </h3>
                      <p className="text-gray-500">
                        {isOwnProfile ? "When you post something, it'll show up here." : "When they post something, it'll show up here."}
                      </p>
                    </div>
                  ) : (
                    <div>
                      {posts.map(post => (
                        <PostCard
                          key={post.id}
                          post={post}
                          currentUserId={currentUserId}
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
                    {!canViewPosts && !isOwnProfile ? (
                      "Follow this account to see their activity."
                    ) : (
                      <>
                        {activeTab === 'replies' && "When they reply to someone, it'll show up here."}
                        {activeTab === 'media' && "When they post photos or videos, they'll show up here."}
                        {activeTab === 'likes' && "When they like a post, it'll show up here."}
                      </>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile bottom navigation spacing */}
      <div className="h-16 lg:hidden"></div>
    </div>
  );
}
