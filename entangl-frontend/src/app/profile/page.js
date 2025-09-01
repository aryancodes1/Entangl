'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

const Icon = ({ d, className }) => (
  <svg className={`w-6 h-6 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={d}></path>
  </svg>
)

const ProfilePost = ({ content, timestamp, likes, comments }) => (
  <div className="border-b border-gray-800 p-4">
    <p className="text-white mb-3">{content}</p>
    <div className="flex items-center space-x-6 text-gray-500 text-sm">
      <span>{new Date(timestamp).toLocaleDateString()}</span>
      <button className="flex items-center space-x-1 hover:text-rose-500">
        <Icon d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" className="w-4 h-4" />
        <span>{likes}</span>
      </button>
      <button className="flex items-center space-x-1 hover:text-violet-400">
        <Icon d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" className="w-4 h-4" />
        <span>{comments}</span>
      </button>
    </div>
  </div>
)

export default function Profile() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('posts')
  const [followersCount] = useState(Math.floor(Math.random() * 1000) + 100)
  const [followingCount] = useState(Math.floor(Math.random() * 500) + 50)
  const [postsCount] = useState(Math.floor(Math.random() * 100) + 20)
  const [imageError, setImageError] = useState(false)

  // Mock posts data
  const [userPosts] = useState([
    {
      id: 1,
      content: "Just joined Entangl! Excited to connect with everyone here. 🚀",
      timestamp: new Date().toISOString(),
      likes: 15,
      comments: 3
    },
    {
      id: 2,
      content: "Working on some exciting new projects. Can't wait to share more details soon!",
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      likes: 28,
      comments: 7
    },
    {
      id: 3,
      content: "Beautiful sunset today! Sometimes you need to take a moment to appreciate the simple things in life. 🌅",
      timestamp: new Date(Date.now() - 172800000).toISOString(),
      likes: 42,
      comments: 12
    }
  ])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500 mx-auto"></div>
          <p className="mt-4">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) return null

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' })
  }

  return (
    <div className="bg-black text-white min-h-screen font-sans">
      <div className="container mx-auto flex justify-center">
        {/* Left Sidebar - simplified for profile page */}
        <aside className="hidden md:flex flex-col md:w-20 lg:w-72 p-2">
          <div className="p-3 mb-2">
            <Icon d="M12 21a9 9 0 100-18 9 9 0 000 18z" className="w-8 h-8 text-violet-500" />
          </div>
          <nav className="flex flex-col space-y-1">
            <Link href="/feed" className="flex items-center space-x-4 p-3 rounded-full text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
              <Icon d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              <span className="text-xl lg:inline hidden">Home</span>
            </Link>
            <Link href="/profile" className="flex items-center space-x-4 p-3 rounded-full text-white font-bold transition-colors">
              <Icon d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              <span className="text-xl lg:inline hidden">Profile</span>
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="w-full md:max-w-2xl border-x border-gray-800 min-h-screen">
          {/* Header */}
          <header className="sticky top-0 bg-black bg-opacity-70 backdrop-blur-md z-10 border-b border-gray-800 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button onClick={() => router.back()} className="p-2 hover:bg-gray-800 rounded-full">
                  <Icon d="M15 19l-7-7 7-7" />
                </button>
                <div>
                  <h1 className="text-xl font-bold">{session.user.name}</h1>
                  <p className="text-sm text-gray-500">{postsCount} posts</p>
                </div>
              </div>
              <Link href="/feed" className="bg-violet-500 text-white font-bold py-2 px-4 rounded-full hover:bg-violet-600 transition-colors">
                Go to Feed
              </Link>
            </div>
          </header>

          {/* Profile Section */}
          <div className="p-4">
            {/* Cover Photo Placeholder */}
            <div className="h-48 bg-gradient-to-r from-violet-900 to-purple-900 rounded-xl mb-4"></div>
            
            {/* Profile Info */}
            <div className="relative mb-6">
              {/* Profile Picture */}
              <div className="absolute -top-16 left-4">
                <div className="relative">
                  {session.user.image && !imageError ? (
                    <Image
                      src={session.user.image}
                      alt={session.user.name}
                      width={128}
                      height={128}
                      className="rounded-full border-4 border-black"
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <div className="w-32 h-32 bg-gray-700 rounded-full border-4 border-black flex items-center justify-center">
                      <Icon d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                </div>
              </div>

              {/* Edit Profile Button */}
              <div className="flex justify-end mb-4">
                <button 
                  onClick={handleSignOut}
                  className="border border-gray-600 text-white font-bold py-2 px-4 rounded-full hover:bg-gray-800 transition-colors"
                >
                  Sign Out
                </button>
              </div>

              {/* User Details */}
              <div className="mt-16">
                <h2 className="text-2xl font-bold">{session.user.name}</h2>
                <p className="text-gray-500">@{session.user.username}</p>
                <p className="text-gray-500 text-sm mt-1">
                  Joined {new Date(session.user.joinedDate || new Date()).toLocaleDateString('en-US', { 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </p>
                
                {/* Bio */}
                <p className="text-white mt-3">
                  Welcome to my Entangl profile! Excited to be part of this amazing community. 
                  Let's connect and share our experiences! ✨
                </p>

                {/* Stats */}
                <div className="flex space-x-6 mt-4 text-sm">
                  <button className="hover:underline">
                    <span className="font-bold text-white">{followingCount}</span>
                    <span className="text-gray-500 ml-1">Following</span>
                  </button>
                  <button className="hover:underline">
                    <span className="font-bold text-white">{followersCount}</span>
                    <span className="text-gray-500 ml-1">Followers</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-800">
              <nav className="flex">
                {['posts', 'replies', 'media', 'likes'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 text-center py-4 font-semibold capitalize relative ${
                      activeTab === tab
                        ? 'text-white'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {tab}
                    {activeTab === tab && (
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-violet-500 rounded-full"></div>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Posts Section */}
          <div>
            {activeTab === 'posts' && (
              <div>
                {userPosts.map((post) => (
                  <ProfilePost
                    key={post.id}
                    content={post.content}
                    timestamp={post.timestamp}
                    likes={post.likes}
                    comments={post.comments}
                  />
                ))}
              </div>
            )}
            {activeTab === 'replies' && (
              <div className="text-center text-gray-500 py-16">
                <p>No replies yet</p>
              </div>
            )}
            {activeTab === 'media' && (
              <div className="text-center text-gray-500 py-16">
                <p>No media yet</p>
              </div>
            )}
            {activeTab === 'likes' && (
              <div className="text-center text-gray-500 py-16">
                <p>No likes yet</p>
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar - simplified for profile */}
        <aside className="hidden lg:block w-96 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <h3 className="font-bold text-lg mb-3">User Info</h3>
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500">Email:</span> {session.user.email}</p>
              <p><span className="text-gray-500">Member since:</span> {new Date(session.user.joinedDate || new Date()).toLocaleDateString()}</p>
              <p><span className="text-gray-500">Posts:</span> {postsCount}</p>
              <p><span className="text-gray-500">Followers:</span> {followersCount}</p>
              <p><span className="text-gray-500">Following:</span> {followingCount}</p>
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom Navigation for Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 flex justify-around p-1 z-20">
        <Link href="/feed" className="p-2 text-gray-400 hover:text-white">
          <Icon d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </Link>
        <Link href="/profile" className="p-2 text-violet-400">
          <Icon d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </Link>
      </nav>
    </div>
  )
}
