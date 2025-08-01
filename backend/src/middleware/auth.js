const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('./asyncHandler');
const ApiError = require('../utils/ApiError');

// Protect routes - check for valid JWT token
const auth = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // Check for token in cookies (if you're using cookies)
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // Make sure token exists
  if (!token) {
    throw new ApiError('Not authorized to access this route', 401);
  }

  try {
    // Verify token
    console.log('🔍 Auth Debug - Verifying token with JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔍 Auth Debug - Decoded token:', decoded);

    // Get user from token (handle both old 'userId' and new 'id' formats)
    const userId = decoded.id || decoded.userId;
    console.log('Auth Debug - Looking for user ID:', userId);
    
    const user = await User.findById(userId).select('-password');
    console.log('Auth Debug - Found user:', user ? { id: user._id, email: user.email, role: user.role, name: user.name } : 'No user found');
    
    if (!user) {
      throw new ApiError('No user found with this token', 401);
    }

    // Check if user is active
    if (!user.isActive) {
      console.log('Auth Debug - User is not active');
      throw new ApiError('User account is deactivated', 401);
    }

    console.log('Auth Debug - User authenticated successfully, role:', user.role);
    // Add user to request
    req.user = user;
    next();
  } catch (error) {
    console.log('🔍 Auth Debug - JWT verification error:', error.message);
    if (error.name === 'JsonWebTokenError') {
      throw new ApiError('Invalid token', 401);
    } else if (error.name === 'TokenExpiredError') {
      throw new ApiError('Token expired', 401);
    } else {
      throw error;
    }
  }
});

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApiError('Not authorized to access this route', 401);
    }

    if (!roles.includes(req.user.role)) {
      throw new ApiError(`User role ${req.user.role} is not authorized to access this route`, 403);
    }

    next();
  };
};

// Check if user owns the resource or is admin
const ownerOrAdmin = (resourceUserField = 'user') => {
  return asyncHandler(async (req, res, next) => {
    // Get the resource (you'll need to modify this based on your resource)
    let resource;
    
    // This is a generic approach - you might want to customize this
    // based on your specific models and routes
    const resourceId = req.params.id;
    
    // You can determine the model type based on the route
    // This is a simplified example
    if (req.baseUrl.includes('/projects')) {
      const Project = require('../models/Project');
      resource = await Project.findById(resourceId);
    } else if (req.baseUrl.includes('/flows')) {
      const Flow = require('../models/Flow');
      resource = await Flow.findById(resourceId);
    }
    
    if (!resource) {
      throw new ApiError('Resource not found', 404);
    }

    // Check if user owns the resource or is admin
    const isOwner = resource[resourceUserField] && 
                   resource[resourceUserField].toString() === req.user.id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      throw new ApiError('Not authorized to access this resource', 403);
    }

    // Add resource to request for use in controller
    req.resource = resource;
    next();
  });
};

// Optional authentication - user may or may not be logged in
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      const user = await User.findById(decoded.id).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    } catch (error) {
      // Continue without user if token is invalid
      req.user = null;
    }
  }

  next();
});

module.exports = {
  auth,
  authorize,
  ownerOrAdmin,
  optionalAuth
};
