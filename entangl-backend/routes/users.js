const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// GET search users
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q || q.trim().length < 1) {
      return res.json([]);
    }

    const searchTerm = q.trim();
    
    // Get current user ID from token if available
    let currentUserId = null;
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      if (token) {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        currentUserId = decoded.userId;
      }
    } catch (error) {
      // Token verification failed, continue without currentUserId
    }
    
    const users = await prisma.user.findMany({
      where: {
        OR: [
          {
            username: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          },
          {
            displayName: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          }
        ]
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatar: true,
        verified: true,
        _count: {
          select: {
            followers: true
          }
        }
      },
      take: 100 // Fetch more results to sort them in-app
    });

    // Score and sort users
    const scoredUsers = users.map(user => {
      let score = 0;
      const lowerSearchTerm = searchTerm.toLowerCase();
      const lowerUsername = user.username.toLowerCase();
      const lowerDisplayName = user.displayName?.toLowerCase() || '';

      // Score username
      if (lowerUsername === lowerSearchTerm) {
        score += 100; // Exact match
      } else if (lowerUsername.startsWith(lowerSearchTerm)) {
        score += 50; // Starts with
      } else if (lowerUsername.includes(lowerSearchTerm)) {
        score += 10; // Contains
      }
      
      // Score display name
      if (lowerDisplayName === lowerSearchTerm) {
        score += 80; // Exact match
      } else if (lowerDisplayName.startsWith(lowerSearchTerm)) {
        score += 40; // Starts with
      } else if (lowerDisplayName.includes(lowerSearchTerm)) {
        score += 5; // Contains
      }

      // Bonus for verified users
      if (user.verified) {
        score += 20;
      }

      // Add follower count to score to break ties and boost popular users
      score += (user._count.followers || 0) / 100;

      return { ...user, score };
    }).sort((a, b) => b.score - a.score);

    const topUsers = scoredUsers.slice(0, parseInt(limit));

    // Add follow status for current user
    const usersWithFollowStatus = await Promise.all(topUsers.map(async (user) => {
      if (!currentUserId || user.id === currentUserId) {
        return { ...user, followStatus: 'none' };
      }

      const followRelation = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: user.id
          }
        }
      });

      let followStatus = 'none';
      if (followRelation) {
        followStatus = followRelation.status === 'accepted' ? 'following' : 'pending';
      }

      return { ...user, followStatus };
    }));

    res.json(usersWithFollowStatus);
  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET all users with pagination
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    const currentUserId = req.user.id;

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        bio: true,
        avatar: true,
        verified: true,
        createdAt: true,
        _count: {
          select: {
            posts: true,
            followers: {
              where: { status: 'accepted' }
            },
            following: {
              where: { status: 'accepted' }
            }
          }
        }
      },
      skip: parseInt(skip),
      take: parseInt(limit)
    });

    // Add follow status for current user
    const usersWithFollowStatus = await Promise.all(users.map(async (user) => {
      if (user.id === currentUserId) {
        return { ...user, followStatus: 'none' };
      }

      const followRelation = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: user.id
          }
        }
      });

      let followStatus = 'none';
      if (followRelation) {
        followStatus = followRelation.status === 'accepted' ? 'following' : 'pending';
      }

      return { ...user, followStatus };
    }));

    res.json(usersWithFollowStatus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET user by ID with stats
router.get('/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        bio: true,
        avatar: true,
        verified: true,
        createdAt: true,
        _count: {
          select: {
            posts: true,
            followers: {
              where: { status: 'accepted' }
            },
            following: {
              where: { status: 'accepted' }
            }
          }
        }
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update user profile
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { displayName, bio, avatar, isPrivate } = req.body;
    const userId = req.params.id;

    // Check if user is updating their own profile
    if (userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this profile' });
    }

    const updateData = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (bio !== undefined) updateData.bio = bio;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (isPrivate !== undefined) updateData.isPrivate = isPrivate;

    // If privacy setting is changing, use a transaction
    if (isPrivate !== undefined) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { isPrivate: isPrivate },
        }),
        prisma.post.updateMany({
          where: { authorId: userId },
          data: { isPublic: !isPrivate },
        }),
      ]);
    }

    // Update other user data
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        displayName: displayName,
        bio: bio,
        avatar: avatar,
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        bio: true,
        avatar: true,
        verified: true,
        isPrivate: true,
        createdAt: true
      }
    });
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
