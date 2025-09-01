const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    console.log('Auth middleware - Token present:', !!token);

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        details: 'Please log in to access this resource'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    console.log('Token decoded for user:', decoded.userId);
    
    // Find user by ID
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

    if (!user) {
      console.log('User not found for ID:', decoded.userId);
      return res.status(401).json({ 
        error: 'User not found',
        details: 'The user associated with this token no longer exists'
      });
    }

    console.log('User authenticated:', user.username);
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ 
        error: 'Invalid token',
        details: 'The provided authentication token is invalid'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ 
        error: 'Token expired',
        details: 'Your authentication token has expired. Please log in again'
      });
    }

    res.status(500).json({ 
      error: 'Authentication failed',
      details: 'An error occurred while validating your authentication'
    });
  }
};

module.exports = { authenticateToken };
