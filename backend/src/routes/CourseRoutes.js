
const express = require('express');
const multer = require('multer');
const {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  activateCourse,
  deactivateCourse,
  getCourseStats,
  bulkUpdateCourses,
  getDepartments,
  importCourses,
  exportCourses,
  getImportTemplate,
  // FIXED: Changed name to match the controller export
  getCoursesByDeptAndSem, 
  duplicateCourse
} = require('../controllers/CourseController');

const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// Apply authentication to all routes
router.use(auth);

// Statistics route (admin only)
router.get('/stats', authorize('admin'), getCourseStats);

// Template download route (admin only)
router.get('/template', authorize('admin'), getImportTemplate);

// Export route (admin/teacher)
router.get('/export', authorize('admin', 'teacher'), exportCourses);

// Import route (admin only)
router.post('/import', authorize('admin'), upload.single('file'), importCourses);

// Bulk operations route (admin only)
router.patch('/bulk-update', authorize('admin'), bulkUpdateCourses);

// Department and semester specific routes
// FIXED: Using the function name that actually exists
router.get('/department/:department/semester/:semester', getCoursesByDeptAndSem);

// Individual Course routes
router.route('/')
  .get(getAllCourses) 
  .post(authorize('admin'), createCourse);

router.route('/:id')
  .get(getCourseById)
  .put(authorize('admin'), updateCourse)
  .delete(authorize('admin'), deleteCourse);

// Course status management routes
router.patch('/:id/activate', authorize('admin'), activateCourse);
router.patch('/:id/deactivate', authorize('admin'), deactivateCourse);

// Course duplication route
router.post('/:id/duplicate', authorize('admin'), duplicateCourse);

module.exports = router;