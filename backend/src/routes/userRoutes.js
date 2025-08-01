const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser
} = require('../controllers/userController');

// @route   GET /api/users
// @desc    Get all users
// @access  Public (should be protected in real app)
router.get('/', getUsers);

// @route   GET /api/users/:id
// @desc    Get single user
// @access  Public (should be protected in real app)
router.get('/:id', getUser);

// @route   POST /api/users
// @desc    Create new user
// @access  Public (should be protected in real app)
router.post('/', createUser);

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Public (should be protected in real app)
router.put('/:id', updateUser);

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Public (should be protected in real app)
router.delete('/:id', deleteUser);

module.exports = router;
