const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Middleware to handle optional authentication
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      // If token is provided, verify it
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          bio: true,
          avatar: true,
          phone: true,
          verified: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (user) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // For optional auth, we don't fail on token errors
    console.log('Optional auth failed:', error.message);
    next();
  }
};

// GET user feed (posts from followed users) with pagination
router.get('/feed', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const userId = req.user.id;

    // Find who the current user is following
    const following = await prisma.follow.findMany({
      where: {
        followerId: userId,
        status: 'accepted',
      },
      select: {
        followingId: true,
      },
    });

    const followingIds = following.map((f) => f.followingId);

    // Include user's own posts in their feed
    const authorIds = [...followingIds, userId];

    const posts = await prisma.post.findMany({
      where: {
        authorId: {
          in: authorIds,
        },
      },
      skip,
      take: parseInt(limit),
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            verified: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
        likes: {
          where: {
            userId: req.user?.id,
          },
          select: {
            userId: true,
          },
        },
      },
    });

    const postsWithContext = posts.map(post => ({
      ...post,
      isLiked: post.likes.length > 0,
    }));

    res.json(postsWithContext);
  } catch (error) {
    console.error('Error fetching feed:', error);
    res.status(500).json({ error: 'Could not fetch feed' });
  }
});

// GET all posts with optional authentication
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, userId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const currentUserId = req.user?.id;

    let whereClause = {};
    if (userId) {
      whereClause = { authorId: userId };
    } else if (currentUserId) {
      const following = await prisma.follow.findMany({
        where: { followerId: currentUserId, status: 'accepted' },
        select: { followingId: true },
      });
      const followingIds = following.map(f => f.followingId);
      
      whereClause = {
        OR: [
          { isPublic: true },
          { authorId: { in: followingIds } },
          { authorId: currentUserId },
        ],
      };
    } else {
      whereClause = { isPublic: true };
    }

    // If a specific user's posts are requested, check for privacy
    if (userId && currentUserId !== userId) {
      const targetUser = await prisma.user.findUnique({ where: { id: userId } });
      if (targetUser?.isPrivate) {
        const isFollowing = await prisma.follow.findFirst({
          where: {
            followerId: currentUserId,
            followingId: userId,
            status: 'accepted',
          },
        });
        if (!isFollowing) {
          return res.json([]); // Return empty if not following a private user
        }
      }
    }

    const posts = await prisma.post.findMany({
      where: whereClause,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            verified: true
          }
        },
        hashtags: {
          select: {
            name: true
          }
        },
        likes: {
          select: {
            userId: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: parseInt(skip),
      take: parseInt(limit)
    });

    const postsWithLikeStatus = posts.map(post => ({
      ...post,
      isLiked: req.user ? post.likes.some(like => like.userId === req.user.id) : false,
      likes: post._count.likes,
      comments: post._count.comments
    }));

    res.json(postsWithLikeStatus);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST create post
router.post('/', authenticateToken, async (req, res) => {
  const { content, imageUrl, hashtags, prediction, confidence } = req.body;
  const user = req.user;

  if (!content && !imageUrl) {
    return res.status(400).json({ 
      error: 'Post must have content or image',
      details: 'Please provide either text content or an image for your post'
    });
  }

  // Validate content length if provided
  if (content && content.length > 280) {
    return res.status(400).json({ 
      error: 'Content too long',
      details: 'Posts must be 280 characters or less'
    });
  }

  const hashtagOps = [];
  if (hashtags) {
    const hashtagNames = hashtags.split(/[\s#]+/).filter(Boolean);
    if (hashtagNames.length > 0) {
      for (const name of hashtagNames) {
        hashtagOps.push({
          where: { name },
          create: { name },
        });
      }
    }
  }

  try {
    const post = await prisma.post.create({
      data: {
        content: content || null, // Allow null content if there's an image
        imageUrl: imageUrl || null,
        authorId: user.id,
        isPublic: !user.isPrivate,
        prediction: prediction,
        confidence: confidence,
        ...(hashtagOps.length > 0 && {
          hashtags: {
            connectOrCreate: hashtagOps,
          },
        }),
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            verified: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      }
    });

    console.log('Post created successfully:', post.id);

    res.status(201).json({
      ...post,
      isLiked: false,
      likes: post._count.likes,
      comments: post._count.comments
    });
  } catch (error) {
    console.error('Error creating post:', error);
    
    // Handle Prisma-specific errors
    if (error.code === 'P2002') {
      return res.status(400).json({ 
        error: 'Duplicate post detected',
        details: 'This post already exists'
      });
    }
    
    if (error.code === 'P2025') {
      return res.status(404).json({ 
        error: 'User not found',
        details: 'The user account associated with this post could not be found'
      });
    }

    // Generic error response
    res.status(500).json({ 
      error: 'Failed to create post',
      details: error.message || 'An unexpected error occurred while creating your post'
    });
  }
});

// PUT update post
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { content, imageUrl } = req.body;
    const postId = req.params.id;

    // Check if post exists and user owns it
    const existingPost = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!existingPost) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (existingPost.authorId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to edit this post' });
    }

    const post = await prisma.post.update({
      where: { id: postId },
      data: {
        content,
        imageUrl
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            verified: true
          }
        },
        hashtags: {
          select: {
            name: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      }
    });

    res.json(post);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PATCH update post for specific fields like prediction
router.patch('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { prediction, confidence } = req.body;
  const user = req.user;

  try {
    const post = await prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // In a real app, you might want to restrict who can trigger a check,
    // but for now, any authenticated user can.
    
    const updatedPost = await prisma.post.update({
      where: { id },
      data: {
        prediction,
        confidence,
      },
    });

    res.json(updatedPost);
  } catch (error) {
    console.error('Error updating post with prediction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE post
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  try {
    const post = await prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.authorId !== user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this post' });
    }

    await prisma.post.delete({
      where: { id },
    });

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST like/unlike post
router.post('/:id/like', authenticateToken, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId,
          postId
        }
      }
    });

    if (existingLike) {
      // Unlike
      await prisma.like.delete({
        where: {
          userId_postId: {
            userId,
            postId
          }
        }
      });
      res.json({ message: 'Post unliked', isLiked: false });
    } else {
      // Like
      await prisma.like.create({
        data: {
          userId,
          postId
        }
      });
      res.json({ message: 'Post liked', isLiked: true });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /search - Search posts
router.get('/search', optionalAuth, async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    const currentUserId = req.user?.id;
    
    if (!q || q.trim().length < 1) {
      return res.json([]);
    }

    const searchTerm = q.trim();
    const isHashtagSearch = searchTerm.startsWith('#');
    const cleanSearchTerm = isHashtagSearch ? searchTerm.substring(1) : searchTerm;

    // Get IDs of users the current user is following
    let followingIds = [];
    if (currentUserId) {
      const following = await prisma.follow.findMany({
        where: { followerId: currentUserId, status: 'accepted' },
        select: { followingId: true },
      });
      followingIds = following.map(f => f.followingId);
    }
    
    const posts = await prisma.post.findMany({
      where: {
        AND: [
          {
            OR: [
              { isPublic: true },
              { authorId: currentUserId },
              { authorId: { in: followingIds } },
            ]
          },
          {
            OR: [
              {
                content: {
                  contains: cleanSearchTerm,
                  mode: 'insensitive'
                }
              },
              {
                hashtags: {
                  some: {
                    name: {
                      contains: cleanSearchTerm,
                      mode: 'insensitive'
                    }
                  }
                }
              }
            ]
          }
        ]
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            verified: true
          }
        },
        hashtags: {
          select: {
            name: true
          }
        },
        likes: {
          select: {
            userId: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' },
        { _count: { likes: 'desc' } }
      ],
      take: parseInt(limit)
    });

    const postsWithLikeStatus = posts.map(post => ({
      ...post,
      isLiked: req.user ? post.likes.some(like => like.userId === req.user.id) : false,
      likes: post._count.likes,
      comments: post._count.comments
    }));

    res.json(postsWithLikeStatus);
  } catch (error) {
    console.error('Post search error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

