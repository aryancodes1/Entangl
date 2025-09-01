const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// POST follow/unfollow user
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { followingId } = req.body;
    const followerId = req.user.id;

    if (followerId === followingId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      }
    });

    if (existingFollow) {
      // Unfollow
      await prisma.follow.delete({
        where: {
          followerId_followingId: {
            followerId,
            followingId
          }
        }
      });
      res.json({ message: 'Unfollowed successfully', isFollowing: false });
    } else {
      // Follow
      await prisma.follow.create({
        data: {
          followerId,
          followingId
        }
      });
      res.json({ message: 'Followed successfully', isFollowing: true });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET check if following
router.get('/check/:userId', authenticateToken, async (req, res) => {
  try {
    const followingId = req.params.userId;
    const followerId = req.user.id;

    const isFollowing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      }
    });

    res.json({ isFollowing: !!isFollowing });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET followers of a user
router.get('/:userId/followers', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const followers = await prisma.follow.findMany({
      where: { followingId: req.params.userId },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            verified: true
          }
        }
      },
      skip: parseInt(skip),
      take: parseInt(limit)
    });
    res.json(followers.map(f => f.follower));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET users that a user is following
router.get('/:userId/following', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const following = await prisma.follow.findMany({
      where: { followerId: req.params.userId },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            verified: true
          }
        }
      },
      skip: parseInt(skip),
      take: parseInt(limit)
    });
    res.json(following.map(f => f.following));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
