'use client'

import { useState, useRef } from 'react';

export default function CreatePost({ onPostCreated }) {
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(false);
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
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'entangl_posts'); // You'll need to create this in Cloudinary
    
    try {
      const response = await fetch('https://api.cloudinary.com/v1_1/your-cloud-name/image/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.secure_url;
      }
    } catch (error) {
      console.error('Error uploading image:', error);
    }
    return null;
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

      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/posts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim(),
          imageUrl: imageUrl
        }),
      });

      if (response.ok) {
        const newPost = await response.json();
        setContent('');
        setImageFile(null);
        setImagePreview('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        onPostCreated?.(newPost);
      }
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setLoading(false);
    }
  };

  const characterLimit = 280;
  const remainingChars = characterLimit - content.length;
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="border-b border-gray-200 dark:border-gray-800 px-4 py-3">
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

            {/* Bottom Bar */}
            <div className="flex items-center justify-between">
              {/* Tweet Options */}
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

                {/* GIF */}
                <button
                  type="button"
                  className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-full transition-colors"
                  title="GIF"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <g>
                      <path d="M3 5.5C3 4.119 4.12 3 5.5 3h13C19.88 3 21 4.119 21 5.5v13c0 1.381-1.12 2.5-2.5 2.5h-13C4.12 21 3 19.881 3 18.5v-13zM5.5 5c-.28 0-.5.224-.5.5v13c0 .276.22.5.5.5h13c.28 0 .5-.224.5-.5v-13c0-.276-.22-.5-.5-.5h-13z"/>
                      <path d="M18 10.711V9.25h-3.74v5.5h1.44v-1.719h1.7V11.57h-1.7v-.859H18zM11.79 9.25h1.44v5.5h-1.44v-5.5zm-3.07 1.375c.34 0 .77.172 1.02.43l1.03-.86c-.51-.601-1.28-.945-2.05-.945C7.19 9.25 6 10.453 6 12s1.19 2.75 2.72 2.75c.85 0 1.54-.344 2.05-.945v-2.149H8.38v1.032H9.4v.515c-.17.086-.42.172-.68.172-.76 0-1.36-.602-1.36-1.375 0-.688.6-1.375 1.36-1.375z"/>
                    </g>
                  </svg>
                </button>

                {/* Poll */}
                <button
                  type="button"
                  className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-full transition-colors"
                  title="Poll"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </button>

                {/* Emoji */}
                <button
                  type="button"
                  className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-full transition-colors"
                  title="Emoji"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>

                {/* Schedule */}
                <button
                  type="button"
                  className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-full transition-colors"
                  title="Schedule"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>

                {/* Location */}
                <button
                  type="button"
                  className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-full transition-colors"
                  title="Tag location"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>

              {/* Character Count and Post Button */}
              <div className="flex items-center space-x-3">
                {content.length > 0 && (
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
                
                {remainingChars <= 20 && remainingChars > 0 && (
                  <div className="w-px h-8 bg-gray-700"></div>
                )}
                
                <button
                  type="submit"
                  disabled={(!content.trim() && !imageFile) || loading || remainingChars < 0}
                  className="bg-blue-500 text-white px-4 py-1.5 rounded-full font-bold text-sm hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[60px]"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                  ) : (
                    'Post'
                  )}
                </button>
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
