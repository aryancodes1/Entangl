'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function PostCard({ post, onLike, onComment, onDelete, currentUserId, showPrivacyMessage = false }) {
  // Handle case where we want to show privacy message instead of post
  if (showPrivacyMessage) {
    return (
      <div className="border-b border-gray-200 dark:border-gray-800 px-4 py-8 text-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              This account is private
            </h3>
            <p className="text-gray-500 max-w-sm">
              Follow this account to see their posts and activity.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Return null if no post data and not showing privacy message
  if (!post) {
    return null;
  }

  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [likesCount, setLikesCount] = useState(post.likes || 0);
  const [commentsCount, setCommentsCount] = useState(post.comments || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [prediction, setPrediction] = useState(post.prediction ? { 
    isFake: post.prediction === 'fake', 
    confidence: post.confidence,
    explanation: post.factCheckDetails?.explanation,
    facts_found: post.factCheckDetails?.facts_found || [],
    inaccuracies: post.factCheckDetails?.inaccuracies || [],
    missing_context: post.factCheckDetails?.missing_context,
    sources: post.factCheckDetails?.sources || []
  } : null);
  const [showFactCheckDetails, setShowFactCheckDetails] = useState(false);
  
  // New fact-checking states
  const [newsFactCheck, setNewsFactCheck] = useState(null);
  const [loadingNewsFactCheck, setLoadingNewsFactCheck] = useState(false);
  const [showNewsFactCheck, setShowNewsFactCheck] = useState(false);

  const handleDeleteComment = async (commentId) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${process.env.NEXT_PUBLIC_NODE_BACKEND_URL}/api/comments/${commentId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          setComments(prev => prev.filter(c => c.id !== commentId));
          setCommentsCount(prev => prev - 1);
        } else {
          alert('Failed to delete comment.');
        }
      } catch (error) {
        console.error('Error deleting comment:', error);
      }
    }
  };

  const handleLike = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_NODE_BACKEND_URL}/api/posts/${post.id}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIsLiked(data.isLiked);
        setLikesCount(prev => data.isLiked ? prev + 1 : prev - 1);
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const fetchComments = async () => {
    if (comments.length > 0) return; // Already loaded
    
    setLoadingComments(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_NODE_BACKEND_URL}/api/comments/post/${post.id}`);
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_NODE_BACKEND_URL}/api/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newComment,
          postId: post.id
        }),
      });

      if (response.ok) {
        const newCommentData = await response.json();
        setComments(prev => [newCommentData, ...prev]);
        setCommentsCount(prev => prev + 1);
        setNewComment('');
        onComment?.(post.id);
      }
    } catch (error) {
      console.error('Error commenting:', error);
    }
  };

  const handleCommentsClick = () => {
    setShowComments(!showComments);
    if (!showComments) {
      fetchComments();
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Delete this post?')) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${process.env.NEXT_PUBLIC_NODE_BACKEND_URL}/api/posts/${post.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          onDelete?.(post.id);
        }
      } catch (error) {
        console.error('Error deleting post:', error);
      }
    }
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const postDate = new Date(date);
    const diffInSeconds = Math.floor((now - postDate) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return postDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // New fact-checking function
  const handleNewsFactCheck = async () => {
    if (!post.content || !post.content.trim()) return;
    
    setLoadingNewsFactCheck(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_NEWS_BACKEND}/fact-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          claim: post.content.trim()
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setNewsFactCheck(data);
        setShowNewsFactCheck(true);
      } else {
        console.error('Failed to fact-check post');
      }
    } catch (error) {
      console.error('Error fact-checking post:', error);
    } finally {
      setLoadingNewsFactCheck(false);
    }
  };

  return (
    <article className="border-b border-gray-200 dark:border-gray-800 px-4 py-3 hover:bg-gray-50 hover:dark:bg-gray-950/30 transition-colors cursor-pointer">
      <div className="flex space-x-3">
        <Link href={`/user/${post.author.id}`} className="flex-shrink-0">
          {post.author.avatar ? (
            <img
              src={post.author.avatar}
              alt={post.author.displayName}
              className="w-10 h-10 rounded-full hover:opacity-90 transition-opacity"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center hover:opacity-90 transition-opacity">
              <span className="text-white font-semibold">
                {post.author.displayName?.[0] || post.author.username?.[0]}
              </span>
            </div>
          )}
        </Link>

        <div className="flex-1 min-w-0">
          {/* Author info and menu */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1 min-w-0">
              <Link
                href={`/user/${post.author.id}`}
                className="font-bold text-gray-900 dark:text-white hover:underline truncate"
              >
                {post.author.displayName || post.author.username}
              </Link>
              
              {post.author.verified && (
                <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-2.284-1.525c-.33-.22-.418-.66-.196-.99.22-.33.66-.418.99-.196L10.436 14.7l3.852-5.778c.22-.33.66-.418.99-.196.33.22.418.66.196.99z"/>
                </svg>
              )}

              <span className="text-gray-500 truncate">@{post.author.username}</span>
              <span className="text-gray-500">·</span>
              <time className="text-gray-500 text-sm hover:underline flex-shrink-0">
                {formatTimeAgo(post.createdAt)}
              </time>
            </div>

            {/* Dropdown menu for own posts */}
            {currentUserId === post.author.id && (
              <div className="relative ml-auto">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDropdown(!showDropdown);
                  }}
                  className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                  </svg>
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete();
                        setShowDropdown(false);
                      }}
                      className="w-full px-4 py-3 text-left text-red-600 hover:bg-gray-50 dark:hover:bg-gray-900 first:rounded-t-xl last:rounded-b-xl transition-colors flex items-center space-x-3"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="mt-1">
            {post.content && post.content.trim() && (
              <div>
                <p className="text-gray-900 dark:text-white text-[15px] leading-5 whitespace-pre-wrap break-words">
                  {post.content}
                </p>
                
                {/* Fact-check button for text content */}
                <div className="mt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNewsFactCheck();
                    }}
                    disabled={loadingNewsFactCheck}
                    className="flex items-center space-x-1 text-xs text-blue-500 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loadingNewsFactCheck ? (
                      <>
                        <div className="animate-spin w-3 h-3 border border-blue-500 border-t-transparent rounded-full"></div>
                        <span>Checking facts...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Fact-check this claim</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Hashtags */}
            {post.hashtags && post.hashtags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {post.hashtags.map(hashtag => (
                  <Link key={hashtag.name} href={`/explore?q=%23${hashtag.name}`} className="text-blue-500 hover:underline">
                    #{hashtag.name}
                  </Link>
                ))}
              </div>
            )}

            {/* Image */}
            {post.imageUrl && (
              <div className={`${(post.content && post.content.trim()) || (post.hashtags && post.hashtags.length > 0) ? 'mt-3' : ''} rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700`}>
                <img
                  src={post.imageUrl}
                  alt="Post media"
                  className="w-full max-h-[500px] object-cover"
                  loading="lazy"
                  onError={(e) => {
                    console.error('Failed to load image:', post.imageUrl);
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* Video */}
            {post.videoUrl && (
              <div className={`${(post.content && post.content.trim()) || (post.hashtags && post.hashtags.length > 0) ? 'mt-3' : ''} rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700`}>
                <video
                  src={post.videoUrl}
                  controls
                  className="w-full max-h-[500px] object-cover"
                  preload="metadata"
                  onError={(e) => {
                    console.error('Failed to load video:', post.videoUrl);
                    e.target.style.display = 'none';
                  }}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            )}

            {/* Authenticity Status */}
            {prediction && (post.imageUrl || post.videoUrl) && (
              <div className={`mt-3 p-3 rounded-lg border ${
                prediction.isFake 
                  ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                  : prediction.confidence < 0.7
                  ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                  : 'bg-green-500/10 border-green-500/30 text-green-400'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      {prediction.isFake 
                        ? <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-4a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                        : prediction.confidence < 0.7
                        ? <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-4a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                        : <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      }
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">
                        {post.videoUrl && post.factCheckDetails?.type === 'video_deepfake_analysis'
                          ? (prediction.isFake ? 'Potential Deepfake Detected' : 'Video Appears Authentic')
                          : post.imageUrl && post.factCheckDetails?.type === 'image_deepfake_analysis'
                          ? (prediction.isFake ? 'Potential Deepfake Detected' : 'Image Appears Authentic')
                          : (prediction.isFake 
                            ? 'Potentially Misleading' 
                            : prediction.confidence < 0.4
                            ? 'Uncertain Authenticity'
                            : 'Appears Authentic')
                        }
                        <span className="font-normal opacity-80 ml-1">
                          ({((prediction.confidence || 0) * 100).toFixed(0)}% confidence)
                        </span>
                      </p>
                      {prediction.explanation && (
                        <p className="text-xs opacity-80 mt-1 line-clamp-2">
                          {prediction.explanation.slice(0, 100)}...
                        </p>
                      )}
                      {post.factCheckDetails?.type === 'video_deepfake_analysis' && (
                        <p className="text-xs opacity-80 mt-1">
                          Analyzed {post.factCheckDetails.faces_analyzed} faces • {post.factCheckDetails.seconds_analyzed}s clip
                          {post.factCheckDetails.quantum_enhanced && ' • Quantum Enhanced'}
                        </p>
                      )}
                      {post.factCheckDetails?.type === 'image_deepfake_analysis' && (
                        <p className="text-xs opacity-80 mt-1">
                          Found {post.factCheckDetails.faces_found} faces
                          {post.factCheckDetails.quantum_enhanced && ' • Quantum Enhanced'}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {(prediction.explanation || prediction.facts_found?.length > 0 || prediction.sources?.length > 0) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowFactCheckDetails(!showFactCheckDetails);
                      }}
                      className="ml-2 text-xs opacity-80 hover:opacity-100 transition-opacity flex items-center space-x-1"
                    >
                      <span>{showFactCheckDetails ? 'Hide' : 'Details'}</span>
                      <svg className={`w-4 h-4 transition-transform ${showFactCheckDetails ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  )}
                </div>
                
                {/* Detailed fact-check information */}
                {showFactCheckDetails && (
                  <div className="mt-3 pt-3 border-t border-current/20 text-xs space-y-2">
                    {prediction.explanation && (
                      <div>
                        <p className="font-semibold mb-1">Analysis:</p>
                        <p className="opacity-90">{prediction.explanation}</p>
                      </div>
                    )}
                    
                    {post.factCheckDetails?.type === 'video_deepfake_analysis' && (
                      <div>
                        <p className="font-semibold mb-1">Video Analysis Details:</p>
                        <ul className="list-disc list-inside opacity-90 space-y-1">
                          <li>Faces analyzed: {post.factCheckDetails.faces_analyzed}</li>
                          <li>Video duration analyzed: {post.factCheckDetails.seconds_analyzed} seconds</li>
                          <li>Processing: {post.factCheckDetails.quantum_enhanced ? 'Quantum Enhanced' : 'Standard'}</li>
                          {post.factCheckDetails.error && (
                            <li className="text-red-400">Note: {post.factCheckDetails.error}</li>
                          )}
                        </ul>
                      </div>
                    )}
                    
                    {post.factCheckDetails?.type === 'image_deepfake_analysis' && (
                      <div>
                        <p className="font-semibold mb-1">Image Analysis Details:</p>
                        <ul className="list-disc list-inside opacity-90 space-y-1">
                          <li>Faces found: {post.factCheckDetails.faces_found}</li>
                          <li>Processing: {post.factCheckDetails.quantum_enhanced ? 'Quantum Enhanced' : 'Standard'}</li>
                          {post.factCheckDetails.error && (
                            <li className="text-red-400">Note: {post.factCheckDetails.error}</li>
                          )}
                        </ul>
                      </div>
                    )}
                    
                    {prediction.facts_found?.length > 0 && (
                      <div>
                        <p className="font-semibold mb-1">Facts Found:</p>
                        <ul className="list-disc list-inside opacity-90 space-y-1">
                          {prediction.facts_found.slice(0, 3).map((fact, index) => (
                            <li key={index}>{fact}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {prediction.inaccuracies?.length > 0 && (
                      <div>
                        <p className="font-semibold mb-1 text-red-400">Potential Issues:</p>
                        <ul className="list-disc list-inside opacity-90 space-y-1">
                          {prediction.inaccuracies.slice(0, 3).map((inaccuracy, index) => (
                            <li key={index}>{inaccuracy}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {prediction.missing_context && (
                      <div>
                        <p className="font-semibold mb-1">Missing Context:</p>
                        <p className="opacity-90">{prediction.missing_context}</p>
                      </div>
                    )}
                    
                    {prediction.sources?.length > 0 && (
                      <div>
                        <p className="font-semibold mb-1">Sources Checked:</p>
                        <div className="space-y-1">
                          {prediction.sources.slice(0, 2).map((source, index) => (
                            <a 
                              key={index} 
                              href={source} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="block opacity-90 hover:opacity-100 underline truncate"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {new URL(source).hostname}
                            </a>
                          ))}
                          {prediction.sources.length > 2 && (
                            <p className="opacity-70">+{prediction.sources.length - 2} more sources</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* News Fact-Check Results */}
            {newsFactCheck && showNewsFactCheck && (
              <div className={`mt-3 p-3 rounded-lg border ${
                newsFactCheck.verdict === 'true' 
                  ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                  : newsFactCheck.verdict === 'false'
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      {newsFactCheck.verdict === 'true'
                        ? <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        : newsFactCheck.verdict === 'false'
                        ? <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        : <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-4a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                      }
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">
                        Fact-Check: {newsFactCheck.verdict === 'true' ? 'True' : newsFactCheck.verdict === 'false' ? 'False' : 'Uncertain'}
                        <span className="font-normal opacity-80 ml-1">
                          ({((newsFactCheck.confidence || 0) * 100).toFixed(0)}% confidence)
                        </span>
                      </p>
                      {newsFactCheck.explanation && (
                        <p className="text-xs opacity-80 mt-1 line-clamp-2">
                          {newsFactCheck.explanation.slice(0, 150)}...
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {newsFactCheck.sources && newsFactCheck.sources.length > 0 && (
                      <span className="text-xs opacity-70">{newsFactCheck.sources.length} sources</span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowNewsFactCheck(false);
                      }}
                      className="text-xs opacity-80 hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {/* Show sources if available */}
                {newsFactCheck.sources && newsFactCheck.sources.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-current/20">
                    <p className="text-xs font-semibold mb-2">Sources:</p>
                    <div className="space-y-1">
                      {newsFactCheck.sources.slice(0, 3).map((source, index) => (
                        <a
                          key={index}
                          href={source.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-xs opacity-90 hover:opacity-100 underline truncate"
                          onClick={(e) => e.stopPropagation()}
                          title={source.title}
                        >
                          {source.title} - {source.source}
                        </a>
                      ))}
                      {newsFactCheck.sources.length > 3 && (
                        <p className="text-xs opacity-70">+{newsFactCheck.sources.length - 3} more sources</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between mt-3 max-w-md">
              {/* Reply */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCommentsClick();
                }}
                className="flex items-center space-x-2 text-gray-500 hover:text-blue-500 transition-colors group"
              >
                <div className="p-2 rounded-full group-hover:bg-blue-500/10 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                {commentsCount > 0 && (
                  <span className="text-sm">{commentsCount}</span>
                )}
              </button>

              {/* Retweet */}
              <button className="flex items-center space-x-2 text-gray-500 hover:text-green-500 transition-colors group">
                <div className="p-2 rounded-full group-hover:bg-green-500/10 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
              </button>

              {/* Like */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleLike();
                }}
                className={`flex items-center space-x-2 transition-colors group ${
                  isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                }`}
              >
                <div className={`p-2 rounded-full transition-colors ${
                  isLiked ? 'group-hover:bg-red-500/20' : 'group-hover:bg-red-500/10'
                }`}>
                  <svg className="w-5 h-5" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                {likesCount > 0 && (
                  <span className="text-sm">{likesCount}</span>
                )}
              </button>

              {/* Share */}
              <button className="flex items-center space-x-2 text-gray-500 hover:text-blue-500 transition-colors group">
                <div className="p-2 rounded-full group-hover:bg-blue-500/10 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                </div>
              </button>
            </div>

            {/* Comments Section */}
            {showComments && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                {/* Add Comment */}
                <form onSubmit={handleComment} className="flex space-x-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                    Y
                  </div>
                  <div className="flex-1">
                    <div className="flex items-end space-x-2">
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Post your reply"
                        className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 border-b border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:outline-none py-2"
                      />
                      {newComment.trim() && (
                        <button
                          type="submit"
                          className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-bold hover:bg-blue-600 transition-colors"
                        >
                          Reply
                        </button>
                      )}
                    </div>
                  </div>
                </form>

                {/* Comments List */}
                {loadingComments ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {comments.map(comment => (
                      <div key={comment.id} className="flex space-x-3">
                        <Link href={`/user/${comment.user.id}`} className="flex-shrink-0">
                          {comment.user.avatar ? (
                            <img
                              src={comment.user.avatar}
                              alt={comment.user.displayName}
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                              <span className="text-white text-sm font-semibold">
                                {comment.user.displayName?.[0] || comment.user.username?.[0]}
                              </span>
                            </div>
                          )}
                        </Link>
                        <div className="flex-1 min-w-0 flex justify-between items-start">
                          <div>
                            <div className="flex items-center space-x-1">
                              <Link href={`/user/${comment.user.id}`} className="font-bold text-gray-900 dark:text-white hover:underline text-sm truncate">
                                {comment.user.displayName || comment.user.username}
                              </Link>
                              <span className="text-gray-500 text-sm truncate">@{comment.user.username}</span>
                              <span className="text-gray-500 text-sm">·</span>
                              <span className="text-gray-500 text-sm">{formatTimeAgo(comment.createdAt)}</span>
                            </div>
                            <p className="text-gray-900 dark:text-white text-sm mt-0.5">{comment.content}</p>
                          </div>
                          {(currentUserId === comment.user.id || currentUserId === post.author.id) && (
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors flex-shrink-0 ml-2"
                              title="Delete comment"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
