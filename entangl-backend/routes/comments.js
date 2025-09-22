const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// GET comments for a post
router.get('/post/:postId', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const comments = await prisma.comment.findMany({
      where: { postId: req.params.postId },
      include: {
        user: {
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
      },
      skip: parseInt(skip),
      take: parseInt(limit)
    });
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create comment
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { content, postId } = req.body;
    
    if (!content || !postId) {
      return res.status(400).json({ error: 'Content and postId are required' });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        userId: req.user.id,
        postId
      },
      include: {
        user: {
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

    // Create a notification for the post author
    if (post.authorId !== req.user.id) {
      await prisma.notification.create({
        data: {
          userId: post.authorId,
          type: 'COMMENT',
          senderId: req.user.id,
          postId: postId,
        },
      });
    }

    res.status(201).json(comment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT update comment
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    const comment = await prisma.comment.findUnique({
      where: { id: req.params.id },
    });

    if (comment.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updatedComment = await prisma.comment.update({
      where: { id: req.params.id },
      data: { content },
    });
    res.json(updatedComment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE comment
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const comment = await prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Optional: Allow post author to delete comments on their post
    const post = await prisma.post.findUnique({
      where: { id: comment.postId },
      select: { authorId: true },
    });

    if (comment.userId !== userId && post.authorId !== userId) {
      return res.status(403).json({ error: 'You are not authorized to delete this comment' });
    }

    await prisma.comment.delete({
      where: { id },
    });

    res.status(204).send(); // No Content
  } catch (error) {
    res.status(500).json({ error: 'Could not delete comment' });
  }
});

module.exports = router;
