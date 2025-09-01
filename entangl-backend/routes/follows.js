const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// POST /request - Send follow request
router.post('/request', authenticateToken, async (req, res) => {
  try {
    const { followingId } = req.body;
    const followerId = req.user.id;

    console.log('Follow request:', { followerId, followingId });

    if (followerId === followingId) {
      return res.status(400).json({ error: 'You cannot follow yourself' });
    }

    // Validate ObjectId format
    if (!followingId || followingId.length !== 24) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    // Check if user exists
    const userToFollow = await prisma.user.findUnique({
      where: { id: followingId }
    });

    if (!userToFollow) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check existing follow relationship
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      }
    });

    if (existingFollow) {
      if (existingFollow.status === 'pending') {
        // Cancel pending request
        await prisma.follow.delete({
          where: { id: existingFollow.id }
        });
        return res.json({ 
          status: 'none', 
          isFollowing: false,
          message: 'Follow request cancelled' 
        });
      } else if (existingFollow.status === 'accepted') {
        // Unfollow
        await prisma.follow.delete({
          where: { id: existingFollow.id }
        });
        return res.json({ 
          status: 'none', 
          isFollowing: false,
          message: 'Unfollowed successfully' 
        });
      }
    }

    // Create new follow request
    console.log('Creating follow request with data:', {
      followerId,
      followingId,
      status: 'pending'
    });

    const followRequest = await prisma.follow.create({
      data: {
        followerId,
        followingId,
        status: 'pending'
      }
    });

    console.log('Follow request created:', followRequest);

    res.json({ 
      status: 'pending', 
      isFollowing: false,
      message: 'Follow request sent' 
    });

  } catch (error) {
    console.error('Follow request error:', error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      return res.status(400).json({ 
        error: 'Follow request already exists',
        details: 'You have already sent a follow request to this user'
      });
    }
    
    if (error.code === 'P2025') {
      return res.status(404).json({ 
        error: 'User not found',
        details: 'The user you are trying to follow does not exist'
      });
    }

    res.status(500).json({ 
      error: 'Failed to send follow request',
      details: error.message 
    });
  }
});

// GET /requests - Get pending follow requests for current user
router.get('/requests', authenticateToken, async (req, res) => {
  try {
    const requests = await prisma.follow.findMany({
      where: {
        followingId: req.user.id,
        status: 'pending'
      },
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
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(requests);
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /requests/:id/accept - Accept follow request
router.post('/requests/:id/accept', authenticateToken, async (req, res) => {
  try {
    const requestId = req.params.id;

    const followRequest = await prisma.follow.findUnique({
      where: { id: requestId },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            displayName: true
          }
        }
      }
    });

    if (!followRequest) {
      return res.status(404).json({ error: 'Follow request not found' });
    }

    if (followRequest.followingId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to accept this request' });
    }

    if (followRequest.status !== 'pending') {
      return res.status(400).json({ error: 'Request is not pending' });
    }

    // Accept the request
    const updatedFollow = await prisma.follow.update({
      where: { id: requestId },
      data: { status: 'accepted' }
    });

    res.json({ 
      message: 'Follow request accepted',
      follow: updatedFollow,
      status: 'accepted'
    });

  } catch (error) {
    console.error('Accept request error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /requests/:id/decline - Decline follow request
router.post('/requests/:id/decline', authenticateToken, async (req, res) => {
  try {
    const requestId = req.params.id;

    const followRequest = await prisma.follow.findUnique({
      where: { id: requestId }
    });

    if (!followRequest) {
      return res.status(404).json({ error: 'Follow request not found' });
    }

    if (followRequest.followingId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to decline this request' });
    }

    if (followRequest.status !== 'pending') {
      return res.status(400).json({ error: 'Request is not pending' });
    }

    // Delete the request
    await prisma.follow.delete({
      where: { id: requestId }
    });

    res.json({ message: 'Follow request declined' });

  } catch (error) {
    console.error('Decline request error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /following - Get users current user is following
router.get('/following', authenticateToken, async (req, res) => {
  try {
    const following = await prisma.follow.findMany({
      where: {
        followerId: req.user.id,
        status: 'accepted'
      },
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
      }
    });

    res.json(following.map(f => f.following));
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /followers - Get users following current user
router.get('/followers', authenticateToken, async (req, res) => {
  try {
    const followers = await prisma.follow.findMany({
      where: {
        followingId: req.user.id,
        status: 'accepted'
      },
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
      }
    });

    res.json(followers.map(f => f.follower));
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /status/:userId - Check follow status with a specific user
router.get('/status/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    // Check if viewing own profile
    if (currentUserId === userId) {
      return res.json({ status: 'self' });
    }

    // Check follow relationship
    const followRelation = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: userId
        }
      }
    });

    if (!followRelation) {
      return res.json({ status: 'none' });
    }

    if (followRelation.status === 'accepted') {
      return res.json({ status: 'following' });
    } else if (followRelation.status === 'pending') {
      return res.json({ status: 'pending' });
    }

    return res.json({ status: 'none' });

  } catch (error) {
    console.error('Check follow status error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
