'use client'

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navigation from '../../components/Navigation';
import PostCard from '../../components/PostCard';

export default function Explore() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const loginMethod = localStorage.getItem('loginMethod');

    if (status === 'unauthenticated' && !token) {
      router.push('/login');
      return;
    }

    // Set current user ID from stored user data
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    if (userData.id) {
      setCurrentUserId(userData.id);
    } else if (loginMethod === 'google' && session?.user?.id) {
      setCurrentUserId(session.user.id);
    }

    fetchData();
  }, [status, session, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.log('No token found for explore');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
      };

      // Fetch all posts
      const postsResponse = await fetch('http://localhost:8080/api/posts', {
        headers,
      });

      // Fetch all users
      const usersResponse = await fetch('http://localhost:8080/api/users', {
        headers,
      });

      if (postsResponse.ok) {
        const postsData = await postsResponse.json();
        setPosts(postsData);
      }

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.filter(user => user.id !== currentUserId));
        setFilteredUsers(usersData.filter(user => user.id !== currentUserId));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        alert('Please log in to follow users');
        return;
      }
      
      const response = await fetch('http://localhost:8080/api/follows', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ followingId: userId }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update user follow status in both arrays
        const updateUser = (user) => 
          user.id === userId 
            ? { ...user, isFollowing: data.isFollowing }
            : user;
        
        setUsers(prev => prev.map(updateUser));
        setFilteredUsers(prev => prev.map(updateUser));
        
        // Show feedback to user
        alert(data.isFollowing ? 'Following user!' : 'Unfollowed user');
      } else {
        const errorData = await response.json();
        console.error('Follow error:', errorData);
        alert('Error following user: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error following user:', error);
      alert('Error following user. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navigation />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold mb-6">Explore</h1>
        
        {/* Tabs */}
        <div className="flex space-x-8 mb-6 border-b border-gray-800">
          <button
            onClick={() => setActiveTab('posts')}
            className={`pb-4 px-2 font-medium transition-colors ${
              activeTab === 'posts' 
                ? 'text-violet-400 border-b-2 border-violet-400' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Posts
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-4 px-2 font-medium transition-colors ${
              activeTab === 'users' 
                ? 'text-violet-400 border-b-2 border-violet-400' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Users
          </button>
        </div>

        {/* Content */}
        {activeTab === 'posts' ? (
          <div className="max-w-2xl">
            {posts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">No posts available</p>
              </div>
            ) : (
              posts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={currentUserId}
                />
              ))
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-400">No users found</p>
              </div>
            ) : (
              users.map(user => (
                <div key={user.id} className="bg-gray-900 rounded-lg p-6">
                  <div className="flex items-center space-x-4 mb-4">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.displayName}
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white font-semibold text-lg">
                          {user.displayName?.[0] || user.username?.[0]}
                        </span>
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-white">
                        {user.displayName || user.username}
                      </h3>
                      <p className="text-gray-400 text-sm">@{user.username}</p>
                    </div>
                  </div>
                  
                  {user.bio && (
                    <p className="text-gray-300 text-sm mb-4 line-clamp-2">{user.bio}</p>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
                    <span>{user._count.posts} posts</span>
                    <span>{user._count.followers} followers</span>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={() => router.push(`/user/${user.id}`)}
                      className="flex-1 border border-gray-600 text-white py-2 rounded-full hover:border-gray-500 transition-colors"
                    >
                      View Profile
                    </button>
                    <button
                      onClick={() => handleFollow(user.id)}
                      className="flex-1 bg-violet-600 text-white py-2 rounded-full hover:bg-violet-700 transition-colors"
                    >
                      Follow
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
