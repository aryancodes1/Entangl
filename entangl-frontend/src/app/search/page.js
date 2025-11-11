'use client'

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Navigation from '../../components/Navigation';
import PostCard from '../../components/PostCard';
import Link from 'next/link';

function SearchContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [searchQuery, setSearchQuery] = useState(query);
  const [activeTab, setActiveTab] = useState('top');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    if (userData.id) {
      setCurrentUserId(userData.id);
    }

    if (query) {
      performSearch(query);
    } else {
      loadTrendingContent();
    }
  }, [query]);

  const performSearch = async (searchTerm) => {
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      // Search users and posts simultaneously
      const [usersResponse, postsResponse] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_NODE_BACKEND_URL}/api/users/search?q=${encodeURIComponent(searchTerm)}`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_NODE_BACKEND_URL}/api/posts/search?q=${encodeURIComponent(searchTerm)}`, { headers })
      ]);

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.filter(user => user.id !== currentUserId));
      }

      if (postsResponse.ok) {
        const postsData = await postsResponse.json();
        setPosts(postsData);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrendingContent = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      const [usersResponse, postsResponse] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_NODE_BACKEND_URL}/api/users?limit=10`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_NODE_BACKEND_URL}/api/posts?limit=20`, { headers })
      ]);

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.filter(user => user.id !== currentUserId));
      }

      if (postsResponse.ok) {
        const postsData = await postsResponse.json();
        setPosts(postsData);
      }
    } catch (error) {
      console.error('Error loading trending:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleSearchInputChange = async (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    if (value.length > 0) {
      setShowSuggestions(true);
      // Fetch suggestions
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_NODE_BACKEND_URL}/api/users/search?q=${encodeURIComponent(value)}&limit=5`, { headers });
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.filter(user => user.id !== currentUserId));
        }
      } catch (error) {
        console.error('Suggestions error:', error);
      }
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  };

  const handleFollow = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_NODE_BACKEND_URL}/api/follows`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ followingId: userId }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update user follow status
        setUsers(prev => prev.map(user => 
          user.id === userId 
            ? { ...user, isFollowing: data.isFollowing }
            : user
        ));
      }
    } catch (error) {
      console.error('Follow error:', error);
    }
  };

  const tabs = [
    { id: 'top', label: 'Top', icon: '⭐' },
    { id: 'latest', label: 'Latest', icon: '🕒' },
    { id: 'people', label: 'People', icon: '👥' },
    { id: 'photos', label: 'Photos', icon: '📸' },
    { id: 'videos', label: 'Videos', icon: '🎥' }
  ];

  const getFilteredContent = () => {
    switch (activeTab) {
      case 'people':
        return users;
      case 'photos':
        return posts.filter(post => post.imageUrl);
      case 'videos':
        return posts.filter(post => post.videoUrl);
      default:
        return { users: users.slice(0, 3), posts };
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <Navigation />
      
      <div className="lg:ml-64">
        <div className="max-w-2xl mx-auto border-x border-gray-200 dark:border-gray-800 min-h-screen">
          {/* Search Header */}
          <div className="sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 z-40">
            <div className="p-4">
              <div className="relative">
                <form onSubmit={handleSearch}>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search Entangl"
                      value={searchQuery}
                      onChange={handleSearchInputChange}
                      onFocus={() => searchQuery.length > 0 && setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      className="w-full bg-gray-100 dark:bg-gray-900 text-black dark:text-white placeholder-gray-500 rounded-full py-3 px-4 pl-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-black border border-transparent focus:border-blue-500"
                    />
                    <svg className="absolute left-4 top-3.5 h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          router.push('/search');
                        }}
                        className="absolute right-4 top-3.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </form>

                {/* Search Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg z-50 max-h-80 overflow-y-auto">
                    {suggestions.map(user => (
                      <Link
                        key={user.id}
                        href={`/user/${user.id}`}
                        className="flex items-center space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                      >
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.displayName} className="w-10 h-10 rounded-full" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <span className="text-white font-semibold">
                              {user.displayName?.[0] || user.username?.[0]}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-black dark:text-white truncate">
                            {user.displayName || user.username}
                          </p>
                          <p className="text-gray-500 text-sm truncate">@{user.username}</p>
                        </div>
                        {user.verified && (
                          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-2.284-1.525c-.33-.22-.418-.66-.196-.99.22-.33.66-.418.99-.196L10.436 14.7l3.852-5.778c.22-.33.66-.418.99-.196.33.22.418.66.196.99z"/>
                          </svg>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tabs */}
            {query && (
              <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-800">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-4 py-3 font-medium text-sm whitespace-nowrap transition-colors relative ${
                      activeTab === tab.id
                        ? 'text-black dark:text-white'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                    {activeTab === tab.id && (
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-blue-500 rounded-full"></div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search Results */}
          <div className="pb-16">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : !query ? (
              // Trending/Discover content when no search
              <div className="p-4">
                <h2 className="text-xl font-bold mb-4">Discover people</h2>
                <div className="space-y-3">
                  {users.slice(0, 5).map(user => (
                    <div key={user.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg transition-colors">
                      <Link href={`/user/${user.id}`} className="flex items-center space-x-3 flex-1">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.displayName} className="w-12 h-12 rounded-full" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <span className="text-white font-semibold">
                              {user.displayName?.[0] || user.username?.[0]}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-1">
                            <p className="font-semibold text-black dark:text-white truncate">
                              {user.displayName || user.username}
                            </p>
                            {user.verified && (
                              <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-2.284-1.525c-.33-.22-.418-.66-.196-.99.22-.33.66-.418.99-.196L10.436 14.7l3.852-5.778c.22-.33.66-.418.99-.196.33.22.418.66.196.99z"/>
                              </svg>
                            )}
                          </div>
                          <p className="text-gray-500 text-sm truncate">@{user.username}</p>
                          {user.bio && (
                            <p className="text-gray-600 dark:text-gray-400 text-sm truncate">{user.bio}</p>
                          )}
                        </div>
                      </Link>
                      <button
                        onClick={() => handleFollow(user.id)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          user.isFollowing
                            ? 'bg-gray-200 dark:bg-gray-800 text-black dark:text-white hover:bg-red-100 dark:hover:bg-red-900 hover:text-red-600'
                            : 'bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200'
                        }`}
                      >
                        {user.isFollowing ? 'Following' : 'Follow'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // Search results
              <>
                {activeTab === 'people' ? (
                  <div>
                    {users.length === 0 ? (
                      <div className="text-center py-12 px-4">
                        <p className="text-gray-500">No people found for "{query}"</p>
                      </div>
                    ) : (
                      users.map(user => (
                        <div key={user.id} className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                          <Link href={`/user/${user.id}`} className="flex items-center space-x-3 flex-1">
                            {user.avatar ? (
                              <img src={user.avatar} alt={user.displayName} className="w-12 h-12 rounded-full" />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <span className="text-white font-semibold">
                                  {user.displayName?.[0] || user.username?.[0]}
                                </span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-1">
                                <p className="font-semibold text-black dark:text-white truncate">
                                  {user.displayName || user.username}
                                </p>
                                {user.verified && (
                                  <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-2.284-1.525c-.33-.22-.418-.66-.196-.99.22-.33.66-.418.99-.196L10.436 14.7l3.852-5.778c.22-.33.66-.418.99-.196.33.22.418.66.196.99z"/>
                                  </svg>
                                )}
                              </div>
                              <p className="text-gray-500 text-sm truncate">@{user.username}</p>
                              {user.bio && (
                                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{user.bio}</p>
                              )}
                            </div>
                          </Link>
                          <button
                            onClick={() => handleFollow(user.id)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                              user.isFollowing
                                ? 'bg-gray-200 dark:bg-gray-800 text-black dark:text-white hover:bg-red-100 dark:hover:bg-red-900 hover:text-red-600'
                                : 'bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200'
                            }`}
                          >
                            {user.isFollowing ? 'Following' : 'Follow'}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  // Posts, photos, videos, etc.
                  <div>
                    {posts.length === 0 ? (
                      <div className="text-center py-12 px-4">
                        <p className="text-gray-500">No posts found for "{query}"</p>
                      </div>
                    ) : (
                      posts.map(post => (
                        <PostCard
                          key={post.id}
                          post={post}
                          currentUserId={currentUserId}
                          onDelete={() => {}}
                        />
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SearchLoading() {
  return (
    <div className="lg:ml-64">
      <div className="max-w-2xl mx-auto border-x border-gray-200 dark:border-gray-800 min-h-screen">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    </div>
  );
}

export default function Search() {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <Navigation />
      
      <Suspense fallback={<SearchLoading />}>
        <SearchContent />
      </Suspense>
    </div>
  );
}
