'use client'

import { useState, useRef } from 'react';

export default function CreatePost({ onPostCreated }) {
  const [content, setContent] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Content, 2: Hashtags, 3: Finalize
  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('Image size should be less than 5MB');
        return;
      }
      
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImageToCloudinary = async (file) => {
    // For now, create a local object URL for testing
    // In production, you would upload to Cloudinary or another service
    return URL.createObjectURL(file);
  };

  const handleNext = () => {
    if (step === 1 && (!content.trim() && !imageFile)) {
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!content.trim() && !imageFile) {
      return;
    }

    setLoading(true);
    try {
      let imageUrl = null;
      
      // Upload image if present
      if (imageFile) {
        imageUrl = await uploadImageToCloudinary(imageFile);
      }

      // Check authentication - try to get token first
      let token = localStorage.getItem('token');
      const loginMethod = localStorage.getItem('loginMethod');
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      
      console.log('Post creation auth check:', { 
        hasToken: !!token, 
        loginMethod, 
        hasUserData: !!userData.id 
      });

      // All users now need a token (stored from database)
      if (!token) {
        alert('Please log in to create a post');
        setLoading(false);
        return;
      }

      // Ensure we have user data
      if (!userData.id) {
        alert('User data not found. Please log in again.');
        setLoading(false);
        return;
      }

      const postData = {
        content: content.trim() || null,
        imageUrl: imageUrl,
        hashtags: hashtags.trim(),
      };

      console.log('Sending post data:', postData);

      const response = await fetch('http://localhost:8080/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(postData),
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const newPost = await response.json();
        setContent('');
        setHashtags('');
        setImageFile(null);
        setImagePreview('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        onPostCreated?.(newPost);
      } else {
        let errorMessage = 'Unknown error';
        try {
          const errorData = await response.json();
          console.error('Error creating post:', errorData);
          
          // Handle authentication errors specifically
          if (response.status === 401 || response.status === 403) {
            errorMessage = 'Please log in again to create posts';
            // Clear invalid auth data
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
          } else {
            errorMessage = errorData.error || errorData.message || `HTTP ${response.status}`;
          }
        } catch (parseError) {
          console.error('Could not parse error response:', parseError);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        alert('Error creating post: ' + errorMessage);
      }
    } catch (error) {
      console.error('Network error creating post:', error);
      alert('Network error creating post. Please check your connection and try again.');
    } finally {
      setLoading(false);
      setStep(1); // Reset to first step
    }
  };

  const characterLimit = 280;
  const remainingChars = characterLimit - content.length;
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="border-b border-gray-200 dark:border-gray-800 px-4 py-3">
      {step > 1 && (
        <div className="flex items-center mb-2">
          <button onClick={handleBack} className="p-2 rounded-full hover:bg-gray-800">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h2 className="text-xl font-bold text-white ml-4">
            {step === 2 ? 'Add Hashtags' : 'Create Post'}
          </h2>
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="flex space-x-3">
          {/* User Avatar */}
          <div className="flex-shrink-0">
            {currentUser.avatar ? (
              <img
                src={currentUser.avatar}
                alt="Your avatar"
                className="w-12 h-12 rounded-full"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-semibold text-lg">
                  {(currentUser.displayName || currentUser.username)?.[0]?.toUpperCase() || 'Y'}
                </span>
              </div>
            )}
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            {step === 1 && (
              <>
                <div className="mb-3">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="What's happening?"
                    rows={3}
                    className="w-full bg-transparent text-white placeholder-gray-500 resize-none focus:outline-none text-xl leading-6 border-none"
                    maxLength={characterLimit}
                    style={{
                      fontSize: '20px',
                      lineHeight: '24px',
                      fontWeight: '400'
                    }}
                  />
                </div>

                {/* Image Preview */}
                {imagePreview && (
                  <div className="mb-3 relative rounded-2xl overflow-hidden border border-gray-700">
                    <img
                      src={imagePreview}
                      alt="Upload preview"
                      className="w-full max-h-80 object-cover"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-1.5 hover:bg-black/90 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </>
            )}

            {step === 2 && (
              <div className="mb-3">
                <textarea
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  placeholder="Add hashtags... #entangl #social"
                  rows={3}
                  className="w-full bg-transparent text-white placeholder-gray-500 resize-none focus:outline-none text-xl leading-6 border-none"
                  style={{
                    fontSize: '20px',
                    lineHeight: '24px',
                    fontWeight: '400'
                  }}
                />
              </div>
            )}

            {step === 3 && (
              <>
                <div className="mb-3">
                  <textarea
                    value={content}
                    readOnly
                    rows={3}
                    className="w-full bg-transparent text-white placeholder-gray-500 resize-none focus:outline-none text-xl leading-6 border-none"
                    maxLength={characterLimit}
                    style={{
                      fontSize: '20px',
                      lineHeight: '24px',
                      fontWeight: '400'
                    }}
                  />
                </div>

                {imagePreview && (
                  <div className="mb-3 relative rounded-2xl overflow-hidden border border-gray-700">
                    <img
                      src={imagePreview}
                      alt="Upload preview"
                      className="w-full max-h-80 object-cover"
                    />
                  </div>
                )}

                {hashtags && (
                  <div className="mb-3">
                    <p className="text-blue-400">{hashtags}</p>
                  </div>
                )}
              </>
            )}


            {/* Bottom Bar */}
            <div className="flex items-center justify-between">
              {/* Tweet Options */}
              {step === 1 && (
                <div className="flex items-center space-x-0">
                  {/* Image Upload */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-full transition-colors"
                    title="Add photos or video"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Character Count and Post/Next Button */}
              <div className="flex items-center space-x-3">
                {step === 1 && content.length > 0 && (
                  <div className="flex items-center space-x-2">
                    {/* Character count circle */}
                    <div className="relative w-8 h-8">
                      <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 32 32">
                        <circle
                          cx="16"
                          cy="16"
                          r="14"
                          stroke="currentColor"
                          strokeWidth="2"
                          fill="none"
                          className={`${
                            remainingChars < 0 ? 'text-red-500' : 
                            remainingChars < 20 ? 'text-yellow-500' : 
                            'text-gray-600'
                          }`}
                          strokeDasharray={87.96}
                          strokeDashoffset={87.96 - (content.length / characterLimit) * 87.96}
                        />
                      </svg>
                      {remainingChars < 20 && (
                        <span className={`absolute inset-0 flex items-center justify-center text-xs ${
                          remainingChars < 0 ? 'text-red-500' : 'text-yellow-500'
                        }`}>
                          {remainingChars < 0 ? remainingChars : remainingChars < 10 ? remainingChars : ''}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                {step === 1 && remainingChars <= 20 && remainingChars > 0 && (
                  <div className="w-px h-8 bg-gray-700"></div>
                )}
                
                {step < 3 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={(step === 1 && (!content.trim() && !imageFile)) || loading || (step === 1 && remainingChars < 0)}
                    className="bg-blue-500 text-white px-4 py-1.5 rounded-full font-bold text-sm hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[60px]"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-500 text-white px-4 py-1.5 rounded-full font-bold text-sm hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[60px]"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                    ) : (
                      'Post'
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
        </div>
      </form>
    </div>
  );
}