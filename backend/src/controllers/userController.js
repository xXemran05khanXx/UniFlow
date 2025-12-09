const asyncHandler = require('../middleware/asyncHandler');
const { getUserStatsFromDB } = require("../services/userStatsService");
const User = require('../models/User');
const Teacher = require('../models/Teacher');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// @desc    Get all users with filtering and pagination
// @route   GET /api/users
// @access  Private (Admin only)
const getUsers = asyncHandler(async (req, res) => {
  const {
    search = '',
    role = '',
    isActive,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = 1,
    limit = 10
  } = req.query;

  // Build query
  const query = {};
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { 'profile.firstName': { $regex: search, $options: 'i' } },
      { 'profile.lastName': { $regex: search, $options: 'i' } }
    ];
  }

  if (role) {
    query.role = role;
  }

  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  try {
    const users = await User.find(query)
      .select('-password -resetPasswordToken -emailVerificationToken')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await User.countDocuments(query);
    const pages = Math.ceil(total / parseInt(limit));

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        total,
        page: parseInt(page),
        pages,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

// @desc    Get single user by ID
// @route   GET /api/users/:id
// @access  Private (Admin or own profile)
const getUser = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -resetPasswordToken -emailVerificationToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user'
    });
  }
});

// @desc    Create new user
// @route   POST /api/users
// @access  Private (Admin only)
const createUser = asyncHandler(async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = 'student',
      isActive = true,
      profile = {}
    } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide name, email, and password'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role,
      isActive,
      profile: {
        firstName: profile.firstName?.trim() || '',
        lastName: profile.lastName?.trim() || '',
        phone: profile.phone?.trim() || '',
        bio: profile.bio?.trim() || '',
        location: profile.location?.trim() || '',
        website: profile.website?.trim() || ''
      },
      isEmailVerified: true // Auto-verify for admin-created users
    });

    // Remove password from response
    const userResponse = await User.findById(user._id).select('-password');

    res.status(201).json({
      success: true,
      data: userResponse
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user'
    });
  }
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin or own profile)
const updateUser = asyncHandler(async (req, res) => {
  try {
    const {
      name,
      email,
      role,
      isActive,
      profile = {}
    } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if email is being changed and if it already exists
    if (email && email.toLowerCase() !== user.email) {
      const existingUser = await User.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: req.params.id }
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'User with this email already exists'
        });
      }
    }

    // Update fields
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (email) updateData.email = email.toLowerCase().trim();
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update profile fields
    if (Object.keys(profile).length > 0) {
      updateData.profile = {
        ...user.profile,
        firstName: profile.firstName?.trim() || user.profile?.firstName || '',
        lastName: profile.lastName?.trim() || user.profile?.lastName || '',
        phone: profile.phone?.trim() || user.profile?.phone || '',
        bio: profile.bio?.trim() || user.profile?.bio || '',
        location: profile.location?.trim() || user.profile?.location || '',
        website: profile.website?.trim() || user.profile?.website || ''
      };
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user'
    });
  }
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
const deleteUser = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Prevent deletion of own account
    if (req.user && req.user.id === req.params.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account'
      });
    }

    // Delete associated Teacher record if the user is a teacher
    if (user.role === 'teacher') {
      await Teacher.deleteOne({ user: req.params.id });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
});

// @desc    Activate user
// @route   PATCH /api/users/:id/activate
// @access  Private (Admin only)
const activateUser = asyncHandler(async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error activating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to activate user'
    });
  }
});

// @desc    Deactivate user
// @route   PATCH /api/users/:id/deactivate
// @access  Private (Admin only)
const deactivateUser = asyncHandler(async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error deactivating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deactivate user'
    });
  }
});

// @desc    Unlock user account
// @route   PATCH /api/users/:id/unlock
// @access  Private (Admin only)
const unlockUser = asyncHandler(async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { 
        loginAttempts: 0,
        lockUntil: undefined
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error unlocking user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unlock user'
    });
  }
});

// @desc    Reset user password
// @route   PATCH /api/users/:id/reset-password
// @access  Private (Admin only)
const resetUserPassword = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Generate temporary password
    const tempPassword = crypto.randomBytes(8).toString('hex');
    
    // Hash the temporary password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);

    // Update user password
    await User.findByIdAndUpdate(req.params.id, {
      password: hashedPassword,
      loginAttempts: 0,
      lockUntil: undefined
    });

    res.status(200).json({
      success: true,
      data: {
        tempPassword,
        message: 'Password reset successfully. Please share this temporary password with the user.'
      }
    });
  } catch (error) {
    console.error('Error resetting user password:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset user password'
    });
  }
});

// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Private (Admin only)
const getUserStats = asyncHandler(async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const inactiveUsers = await User.countDocuments({ isActive: false });

    const adminUsers = await User.countDocuments({ role: "admin" });
    const teacherUsers = await User.countDocuments({ role: "teacher" });
    const studentUsers = await User.countDocuments({ role: "student" });

    const verifiedUsers = await User.countDocuments({ isEmailVerified: true });

    // Group by department
    const usersByDepartment = await User.aggregate([
      { $group: { _id: "$department", count: { $sum: 1 } } }
    ]);

    // Group by semester
    const usersBySemester = await User.aggregate([
      { $group: { _id: "$semester", count: { $sum: 1 } } }
    ]);

    // Recent signups (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSignups = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        verifiedUsers,

        roles: {
          admins: adminUsers,
          teachers: teacherUsers,
          students: studentUsers
        },

        usersByDepartment,
        usersBySemester,
        recentSignups
      }
    });
  } catch (error) {
    console.error("Error fetching user statistics:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch user statistics"
    });
  }
});


// @desc    Bulk update users
// @route   PATCH /api/users/bulk-update
// @access  Private (Admin only)
const bulkUpdateUsers = asyncHandler(async (req, res) => {
  try {
    const { userIds, updates } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide valid user IDs'
      });
    }

    // Prevent updating own account in bulk operations that could lock out admin
    if (req.user && userIds.includes(req.user.id) && updates.isActive === false) {
      return res.status(400).json({
        success: false,
        error: 'Cannot deactivate your own account'
      });
    }

    const result = await User.updateMany(
      { _id: { $in: userIds } },
      updates,
      { runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount,
        message: `${result.modifiedCount} users updated successfully`
      }
    });
  } catch (error) {
    console.error('Error bulk updating users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk update users'
    });
  }
});

// @desc    Bulk delete users
// @route   DELETE /api/users/bulk-delete
// @access  Private (Admin only)
const bulkDeleteUsers = asyncHandler(async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide valid user IDs'
      });
    }

    // Prevent deletion of own account
    if (req.user && userIds.includes(req.user.id)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account'
      });
    }

    // Find users to check which ones are teachers
    const usersToDelete = await User.find({ _id: { $in: userIds } });
    const teacherUserIds = usersToDelete
      .filter(user => user.role === 'teacher')
      .map(user => user._id);

    // Delete associated Teacher records for users with teacher role
    if (teacherUserIds.length > 0) {
      await Teacher.deleteMany({ user: { $in: teacherUserIds } });
    }

    const result = await User.deleteMany({
      _id: { $in: userIds }
    });

    res.status(200).json({
      success: true,
      data: {
        deletedCount: result.deletedCount,
        message: `${result.deletedCount} users deleted successfully`
      }
    });
  } catch (error) {
    console.error('Error bulk deleting users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk delete users'
    });
  }
});

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  activateUser,
  deactivateUser,
  unlockUser,
  resetUserPassword,
  getUserStats,
  bulkUpdateUsers,
  bulkDeleteUsers
};
