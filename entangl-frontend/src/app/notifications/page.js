'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '../../components/Navigation';
import Link from 'next/link';

export default function Notifications() {
  const router = useRouter();
  const [followRequests, setFollowRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFollowRequests();
    
    // Clear notification indicator when page is visited
    return () => {
      // Trigger a refresh of notification count in Navigation component
      window.dispatchEvent(new CustomEvent('notificationsViewed'));
    };
  }, []);

  const fetchFollowRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_NODE_BACKEND_URL}/api/follows/requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setFollowRequests(data);
      }
    } catch (error) {
      console.error('Error fetching follow requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_NODE_BACKEND_URL}/api/follows/requests/${requestId}/accept`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Follow request accepted:', data);
        
        // Remove the request from the list
        setFollowRequests(prev => prev.filter(req => req.id !== requestId));
        
        // Update notification count
        window.dispatchEvent(new CustomEvent('notificationCountChanged'));
        
        alert('Follow request accepted!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error accepting request:', errorData);
        alert('Error accepting request: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error accepting request:', error);
      alert('Error accepting request. Please try again.');
    }
  };

  const handleDeclineRequest = async (requestId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_NODE_BACKEND_URL}/api/follows/requests/${requestId}/decline`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        // Remove the request from the list
        setFollowRequests(prev => prev.filter(req => req.id !== requestId));
        
        // Update notification count
        window.dispatchEvent(new CustomEvent('notificationCountChanged'));
        
        alert('Follow request declined');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error declining request:', errorData);
        alert('Error declining request: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error declining request:', error);
      alert('Error declining request. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <Navigation />
      
      <div className="lg:ml-64">
        <div className="max-w-2xl mx-auto border-x border-gray-200 dark:border-gray-800 min-h-screen">
          {/* Header */}
          <div className="sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 p-4 z-40">
            <h1 className="text-xl font-bold">Notifications</h1>
          </div>

          {/* Content */}
          <div>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : followRequests.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5-5h5l-5-5H9l3 5-3 5h6z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2">No notifications yet</h3>
                <p className="text-gray-500">When someone follows you or likes your posts, you'll see it here.</p>
              </div>
            ) : (
              <div>
                <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                  <h2 className="font-semibold text-lg">Follow Requests</h2>
                </div>
                {followRequests.map(request => (
                  <div key={request.id} className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                    <Link href={`/user/${request.follower.id}`} className="flex items-center space-x-3 flex-1">
                      {request.follower.avatar ? (
                        <img src={request.follower.avatar} alt={request.follower.displayName} className="w-12 h-12 rounded-full" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <span className="text-white font-semibold">
                            {request.follower.displayName?.[0] || request.follower.username?.[0]}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-semibold">{request.follower.displayName || request.follower.username}</p>
                        <p className="text-gray-500 text-sm">@{request.follower.username} wants to follow you</p>
                      </div>
                    </Link>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleAcceptRequest(request.id)}
                        className="bg-blue-500 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-blue-600 transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleDeclineRequest(request.id)}
                        className="bg-gray-200 dark:bg-gray-800 text-black dark:text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
