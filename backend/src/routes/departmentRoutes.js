/**
 * Department Routes
 * Routes for department CRUD operations
 */

const express = require('express');
const router = express.Router();
const {
  getDepartments,
  getDepartmentById,
  getDepartmentBycoursecode,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  activateDepartment,
  getDepartmentStats
} = require('../controllers/departmentController');
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleAuth');

// Public routes
router.get('/', getDepartments);
router.get('/coursecode/:coursecode', getDepartmentBycoursecode);
router.get('/:id', getDepartmentById);
router.get('/:id/stats', getDepartmentStats);

// Admin-only routes
router.post('/', auth, requireRole('admin'), createDepartment);
router.put('/:id', auth, requireRole('admin'), updateDepartment);
router.delete('/:id', auth, requireRole('admin'), deleteDepartment);
router.patch('/:id/activate', auth, requireRole('admin'), activateDepartment);

module.exports = router;
