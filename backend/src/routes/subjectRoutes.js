/**
 * Subject Routes
 * Defines all routes for subject management operations
 */

const express = require('express');
const multer = require('multer');
const {
  getAllSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
  activateSubject,
  deactivateSubject,
  getSubjectStats,
  bulkUpdateSubjects,
  importSubjects,
  exportSubjects,
  getImportTemplate,
  getSubjectsByDepartmentAndSemester,
  duplicateSubject,
  getDepartments
} = require('../controllers/subjectController');

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

// Public routes (for authenticated users)
router.get('/departments', getDepartments);

// Statistics route (admin only)
router.get('/stats', authorize('admin'), getSubjectStats);

// Template download route (admin only)
router.get('/template', authorize('admin'), getImportTemplate);

// Export route (admin/teacher)
router.get('/export', authorize('admin', 'teacher'), exportSubjects);

// Import route (admin only)
router.post('/import', authorize('admin'), upload.single('file'), importSubjects);

// Bulk operations route (admin only)
router.patch('/bulk-update', authorize('admin'), bulkUpdateSubjects);

// Department and semester specific routes
router.get('/department/:department/semester/:semester', getSubjectsByDepartmentAndSemester);

// Individual subject routes
router.route('/')
  .get(getAllSubjects) // All authenticated users can view
  .post(authorize('admin'), createSubject); // Admin only

router.route('/:id')
  .get(getSubjectById) // All authenticated users can view
  .put(authorize('admin'), updateSubject) // Admin only
  .delete(authorize('admin'), deleteSubject); // Admin only

// Subject status management routes (admin only)
router.patch('/:id/activate', authorize('admin'), activateSubject);
router.patch('/:id/deactivate', authorize('admin'), deactivateSubject);

// Subject duplication route (admin only)
router.post('/:id/duplicate', authorize('admin'), duplicateSubject);

module.exports = router;
