'use client'

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navigation from '../../components/Navigation';
import CreatePost from '../../components/CreatePost';
import PostCard from '../../components/PostCard';

export default function Feed() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const loginMethod = localStorage.getItem('loginMethod');

    if (status === 'unauthenticated' && !token) {
      router.push('/login');
      return;
    }

    // Set current user ID
    if (loginMethod === 'google' && session?.user) {
      setCurrentUserId(session.user.id);
    } else if (token) {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      setCurrentUserId(user.id);
    }

    fetchPosts();
  }, [status, session, router]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) return;

      const response = await fetch('http://localhost:8080/api/posts/feed', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostCreated = (newPost) => {
    setPosts(prev => [newPost, ...prev]);
  };

  const handlePostDeleted = (postId) => {
    setPosts(prev => prev.filter(post => post.id !== postId));
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
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <Navigation />
      
      {/* Main Content with proper spacing for sidebar */}
      <div className="lg:ml-64">
        <div className="max-w-2xl mx-auto border-x border-gray-200 dark:border-gray-800 min-h-screen">
          {/* Header */}
          <div className="sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 z-40">
            <div className="px-4 py-3">
              <h1 className="text-xl font-bold">Home</h1>
            </div>
            
            {/* Tab switcher for "For you" and "Following" */}
            <div className="flex">
              <button className="flex-1 text-center py-4 font-medium border-b-2 border-blue-500 text-black dark:text-white">
                For you
              </button>
              <button className="flex-1 text-center py-4 font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                Following
              </button>
            </div>
          </div>

          <CreatePost onPostCreated={handlePostCreated} />
          
          {posts.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold mb-2">Welcome to Entangl!</h3>
              <p className="text-gray-500 mb-6 text-lg">This is the best place to see what's happening in your world.</p>
              <button
                onClick={() => router.push('/explore')}
                className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-full font-bold text-lg transition-colors"
              >
                Find people to follow
              </button>
            </div>
          ) : (
            <div>
              {posts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={currentUserId}
                  onDelete={handlePostDeleted}
                  onComment={() => {}}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add spacing for mobile bottom nav */}
      <div className="h-16 lg:hidden"></div>
    </div>
  );
}
