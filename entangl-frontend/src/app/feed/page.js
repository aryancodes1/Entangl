'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeTab, setActiveTab] = useState('for-you'); // 'for-you' or 'following'

  // Define fetchPosts before useEffect
  const fetchPosts = useCallback(async (pageNum = 1, reset = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const token = localStorage.getItem('token');
      const loginMethod = localStorage.getItem('loginMethod');
      
      console.log('fetchPosts called:', { hasToken: !!token, loginMethod, hasSession: !!session });

      // For Google login, we might not have a token but we have session
      if (!token && loginMethod === 'google' && !session) {
        console.log('Google login but no session available yet');
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      // If manual login but no token, can't proceed
      if (!token && loginMethod === 'manual') {
        console.log('Manual login but no token found');
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      const headers = {};
      
      // Add Authorization header only if we have a token
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const endpoint = activeTab === 'following' 
        ? `${process.env.NEXT_PUBLIC_NODE_BACKEND_URL}/api/posts/feed?page=${pageNum}&limit=10`
        : `${process.env.NEXT_PUBLIC_NODE_BACKEND_URL}/api/posts?page=${pageNum}&limit=10`;

      const response = await fetch(endpoint, {
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        
        if (reset || pageNum === 1) {
          setPosts(data);
        } else {
          setPosts(prev => [...prev, ...data]);
        }
        
        setHasMore(data.length === 10);
        setPage(pageNum);
      } else {
        console.error('Failed to fetch posts:', response.status);
        setPosts([]); // Clear posts on error
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [session, activeTab]);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      const loginMethod = localStorage.getItem('loginMethod');
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      
      console.log('Feed auth check:', { 
        hasToken: !!token, 
        loginMethod, 
        hasUserData: !!userData.id,
        sessionStatus: status,
        hasSession: !!session 
      });

      // For Google login, store user data and token from session
      if (loginMethod === 'google' && session?.user && !token) {
        if (session.user.dbToken && session.user.id) {
          console.log('Storing Google user data in localStorage');
          localStorage.setItem('token', session.user.dbToken);
          localStorage.setItem('user', JSON.stringify({
            id: session.user.id,
            email: session.user.email,
            username: session.user.username,
            displayName: session.user.name,
            avatar: session.user.image,
            verified: true
          }));
          
          // Refresh to use the new token
          window.location.reload();
          return;
        }
      }

      // Check authentication by any method
      const isAuthenticated = (
        (loginMethod === 'manual' && token && userData.id) ||
        (loginMethod === 'google' && session && status === 'authenticated') ||
        (status === 'authenticated' && session)
      );

      if (status === 'loading') {
        console.log('Session loading, waiting...');
        return;
      }

      if (!isAuthenticated) {
        console.log('Not authenticated, redirecting to login');
        router.push('/login');
        return;
      }

      // Set current user ID for posts
      if (userData.id) {
        setCurrentUserId(userData.id);
      } else if (session?.user?.id) {
        setCurrentUserId(session.user.id);
      }

      // Fetch posts
      fetchPosts(1, true);
    };

    checkAuth();
  }, [status, session, router, fetchPosts]);

  const handlePostCreated = (newPost) => {
    setPosts((prev) => [newPost, ...prev]);
  };

  const handlePostDeleted = (postId) => {
    setPosts((prev) => prev.filter((post) => post.id !== postId));
  };

  const handleCommentCreated = (postId) => {
    setPosts(prevPosts =>
      prevPosts.map(p =>
        p.id === postId
          ? { ...p, _count: { ...p._count, comments: (p._count.comments || 0) + 1 } }
          : p
      )
    );
  };

  const loadMore = () => {
    if (hasMore && !loadingMore) {
      fetchPosts(page + 1);
    }
  };

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop 
          >= document.documentElement.offsetHeight - 1000) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [page, hasMore, loadingMore, loadMore]);

  const handleTabChange = (tab) => {
    if (tab !== activeTab) {
      setActiveTab(tab);
      setPage(1);
      setPosts([]);
      setHasMore(true);
      // fetchPosts will be triggered by the useEffect watching activeTab
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

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <Navigation />
      
      <div className="lg:ml-64">
        <div className="max-w-2xl mx-auto border-x border-gray-200 dark:border-gray-800 min-h-screen">
          {/* Header */}
          <div className="sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 z-40">
            <div className="px-4 py-3">
              <h1 className="text-xl font-bold">Home</h1>
            </div>
            
            <div className="flex border-b border-gray-200 dark:border-gray-800">
              <button 
                onClick={() => handleTabChange('for-you')}
                className={`flex-1 text-center py-4 font-medium transition-colors ${
                  activeTab === 'for-you' 
                    ? 'text-black dark:text-white border-b-2 border-blue-500' 
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                For you
              </button>
              <button 
                onClick={() => handleTabChange('following')}
                className={`flex-1 text-center py-4 font-medium transition-colors ${
                  activeTab === 'following' 
                    ? 'text-black dark:text-white border-b-2 border-blue-500' 
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Following
              </button>
            </div>
          </div>

          {/* Create Post */}
          <CreatePost onPostCreated={handlePostCreated} />

          {/* Posts Feed with Infinite Scroll */}
          <div>
            {posts.length === 0 && !loading ? (
              <div className="text-center py-12 px-4">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-3xl font-bold mb-2">
                  {activeTab === 'following' ? 'Your feed is empty' : 'Welcome to Entangl!'}
                </h3>
                <p className="text-gray-500 mb-6 text-lg">
                  {activeTab === 'following' 
                    ? "Posts from people you follow will show up here." 
                    : "This is the best place to see what's happening in your world."}
                </p>
                <button
                  onClick={() => router.push('/explore')}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-full font-bold text-lg transition-colors"
                >
                  Find people to follow
                </button>
              </div>
            ) : (
              <>
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUserId={currentUserId}
                    onDelete={handlePostDeleted}
                    onComment={() => handleCommentCreated(post.id)}
                  />
                ))}
                
                {/* Loading More Indicator */}
                {loadingMore && (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                )}
                
                {/* End of Posts Indicator */}
                {!hasMore && posts.length > 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>You've seen all the latest posts!</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile bottom navigation spacing */}
      <div className="h-16 lg:hidden"></div>
    </div>
  );
}
