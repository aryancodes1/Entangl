const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, username, displayName, password, phone } = req.body;

    // Validate required fields
    if (!email || !username || !password || !phone) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ error: 'Email already exists' });
      }
      if (existingUser.username === username) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        displayName: displayName || username,
        password: hashedPassword,
        phone,
        verified: true // Phone is already verified before signup
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        phone: true,
        verified: true,
        createdAt: true
      }
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      user,
      token
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier can be email or username

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email/username and password are required' });
    }

    // Find user by email or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { username: identifier }
        ]
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user has a password (manual signup)
    if (!user.password) {
      return res.status(401).json({ error: 'Please use Google Sign In for this account' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        phone: user.phone,
        verified: user.verified
      },
      token
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/check-username
router.post('/check-username', async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { username }
    });

    res.json({
      available: !existingUser,
      message: existingUser ? 'Username is already taken' : 'Username is available'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/auth/profile - Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    // User data is already fetched in the authenticateToken middleware
    res.json({
      user: req.user
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/auth/profile - Update current user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { displayName, bio, avatar, phone } = req.body;
    
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        displayName,
        bio,
        avatar,
        phone
      },
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

    res.json({
      user: updatedUser,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/google-signin - Handle Google sign-in users
router.post('/google-signin', async (req, res) => {
  try {
    const { email, name, image, googleId } = req.body;

    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required' });
    }

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Create new user for Google sign-in
      const username = email.split('@')[0] + '_' + Math.random().toString(36).substr(2, 4);
      
      user = await prisma.user.create({
        data: {
          email,
          username,
          displayName: name,
          avatar: image,
          verified: true, // Google users are considered verified
          // No password for Google users
        },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          bio: true,
          avatar: true,
          phone: true,
          verified: true,
          createdAt: true
        }
      });

      console.log('Created new Google user:', user.username);
    } else {
      // Update existing user's avatar if provided
      if (image && user.avatar !== image) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { avatar: image },
          select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
            bio: true,
            avatar: true,
            phone: true,
            verified: true,
            createdAt: true
          }
        });
      }
      console.log('Updated existing Google user:', user.username);
    }

    // Generate JWT token for Google user
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Google sign-in successful',
      user,
      token
    });
  } catch (error) {
    console.error('Google sign-in error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
