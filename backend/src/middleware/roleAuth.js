const requireRole = (requiredRole) => {
  return (req, res, next) => {
    try {
      // Check if user is authenticated (should be set by auth middleware)
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Check if user has the required role
      if (req.user.role !== requiredRole) {
        return res.status(403).json({
          success: false,
          error: `Access denied. ${requiredRole} role required.`,
          userRole: req.user.role
        });
      }

      next();
    } catch (error) {
      console.error('Role authorization error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error during authorization'
      });
    }
  };
};

const requireAnyRole = (roles) => {
  return (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Check if user has any of the required roles
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: `Access denied. One of the following roles required: ${roles.join(', ')}`,
          userRole: req.user.role
        });
      }

      next();
    } catch (error) {
      console.error('Role authorization error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error during authorization'
      });
    }
  };
};

const isAdmin = (req, res, next) => {
  return requireRole('admin')(req, res, next);
};

const isTeacher = (req, res, next) => {
  return requireRole('teacher')(req, res, next);
};

const isStudent = (req, res, next) => {
  return requireRole('student')(req, res, next);
};

const isTeacherOrAdmin = (req, res, next) => {
  return requireAnyRole(['teacher', 'admin'])(req, res, next);
};

module.exports = {
  requireRole,
  requireAnyRole,
  isAdmin,
  isTeacher,
  isStudent,
  isTeacherOrAdmin
};
