/**
 * Department Routes
 * Routes for department CRUD operations
 */

const express = require('express');
const router = express.Router();
const {
  getDepartments,
  getDepartmentById,
  getDepartmentByCode,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  activateDepartment,
  getDepartmentStats
} = require('../controllers/departmentController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleAuth');

// Public routes
router.get('/', getDepartments);
router.get('/code/:code', getDepartmentByCode);
router.get('/:id', getDepartmentById);
router.get('/:id/stats', getDepartmentStats);

// Admin-only routes
router.post('/', protect, authorize('admin'), createDepartment);
router.put('/:id', protect, authorize('admin'), updateDepartment);
router.delete('/:id', protect, authorize('admin'), deleteDepartment);
router.patch('/:id/activate', protect, authorize('admin'), activateDepartment);

module.exports = router;
