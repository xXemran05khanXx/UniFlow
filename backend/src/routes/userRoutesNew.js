const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/userControllerNew');

// Import auth middleware when available
// const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/users/stats
// @desc    Get user statistics
// @access  Private (Admin only)
router.get('/stats', getUserStats);

// @route   GET /api/users
// @desc    Get all users with filtering and pagination
// @access  Private (Admin only)
router.get('/', getUsers);

// @route   GET /api/users/:id
// @desc    Get single user
// @access  Private (Admin or own profile)
router.get('/:id', getUser);

// @route   POST /api/users
// @desc    Create new user
// @access  Private (Admin only)
router.post('/', createUser);

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private (Admin or own profile)
router.put('/:id', updateUser);

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private (Admin only)
router.delete('/:id', deleteUser);

// @route   PATCH /api/users/:id/activate
// @desc    Activate user
// @access  Private (Admin only)
router.patch('/:id/activate', activateUser);

// @route   PATCH /api/users/:id/deactivate
// @desc    Deactivate user
// @access  Private (Admin only)
router.patch('/:id/deactivate', deactivateUser);

// @route   PATCH /api/users/:id/unlock
// @desc    Unlock user account
// @access  Private (Admin only)
router.patch('/:id/unlock', unlockUser);

// @route   PATCH /api/users/:id/reset-password
// @desc    Reset user password
// @access  Private (Admin only)
router.patch('/:id/reset-password', resetUserPassword);

// @route   PATCH /api/users/bulk-update
// @desc    Bulk update users
// @access  Private (Admin only)
router.patch('/bulk-update', bulkUpdateUsers);

// @route   DELETE /api/users/bulk-delete
// @desc    Bulk delete users
// @access  Private (Admin only)
router.delete('/bulk-delete', bulkDeleteUsers);

module.exports = router;
