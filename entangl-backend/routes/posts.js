const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// GET all posts with pagination and user feed
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, userId } = req.query;
    const skip = (page - 1) * limit;

    let whereClause = {};
    
    // If userId is provided, get posts from that user
    if (userId) {
      whereClause.authorId = userId;
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
        likes: {
          select: {
            userId: true
          }
        },
        comments: {
          select: {
            id: true
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

    // Add isLiked flag for current user
    const postsWithLikeStatus = posts.map(post => ({
      ...post,
      isLiked: post.likes.some(like => like.userId === req.user.id),
      likes: post._count.likes,
      comments: post._count.comments
    }));

    res.json(postsWithLikeStatus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET user feed (posts from followed users)
router.get('/feed', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Get users that current user follows
    const following = await prisma.follow.findMany({
      where: { followerId: req.user.id },
      select: { followingId: true }
    });

    const followingIds = following.map(f => f.followingId);
    followingIds.push(req.user.id); // Include own posts

    const posts = await prisma.post.findMany({
      where: {
        authorId: {
          in: followingIds
        }
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
      isLiked: post.likes.some(like => like.userId === req.user.id),
      likes: post._count.likes,
      comments: post._count.comments
    }));

    res.json(postsWithLikeStatus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create post
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { content, imageUrl } = req.body;
    
    if (!content && !imageUrl) {
      return res.status(400).json({ error: 'Post must have content or image' });
    }

    const post = await prisma.post.create({
      data: {
        content,
        imageUrl,
        authorId: req.user.id
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

    res.status(201).json({
      ...post,
      isLiked: false,
      likes: 0,
      comments: 0
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
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

// DELETE post
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const postId = req.params.id;

    const existingPost = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!existingPost) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (existingPost.authorId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this post' });
    }

    await prisma.post.delete({
      where: { id: postId }
    });

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
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

module.exports = router;
