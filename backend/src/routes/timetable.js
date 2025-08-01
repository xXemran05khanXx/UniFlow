const express = require('express');
const TimetableController = require('../controllers/timetable/timetableController');
const { auth: authMiddleware } = require('../middleware/auth');

const router = express.Router();
const timetableController = new TimetableController();

// Middleware to ensure user is authenticated for all timetable operations
router.use(authMiddleware);

/**
 * @route   POST /api/timetable/generate
 * @desc    Generate timetable synchronously
 * @access  Private (Admin only)
 * @body    {
 *   algorithm: string (greedy|genetic|constraint_satisfaction),
 *   maxIterations: number,
 *   timeSlotDuration: number (minutes),
 *   workingDays: array,
 *   workingHours: {start: string, end: string},
 *   courses: array (optional if using files),
 *   teachers: array (optional if using files),
 *   rooms: array (optional if using files),
 *   files: multipart files (optional if using direct data),
 *   saveTimetable: boolean,
 *   savePath: string,
 *   algorithmOptions: object,
 *   postProcessing: object,
 *   parseOptions: object
 * }
 */
router.post('/generate',
  // Admin authorization middleware
  (req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    next();
  },
  // File upload middleware
  timetableController.getUploadMiddleware(),
  // Controller method
  timetableController.generateTimetable.bind(timetableController)
);

/**
 * @route   POST /api/timetable/generate-async
 * @desc    Generate timetable asynchronously (for large datasets)
 * @access  Private (Admin only)
 */
router.post('/generate-async',
  // Admin authorization middleware
  (req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    next();
  },
  // File upload middleware
  timetableController.getUploadMiddleware(),
  // Controller method
  timetableController.generateTimetableAsync.bind(timetableController)
);

/**
 * @route   POST /api/timetable/parse-syllabus
 * @desc    Parse syllabus files without generating timetable
 * @access  Private (Admin/Teacher)
 */
router.post('/parse-syllabus',
  // Admin or Teacher authorization
  (req, res, next) => {
    if (!['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Admin or Teacher access required'
      });
    }
    next();
  },
  // File upload middleware
  timetableController.getUploadMiddleware(),
  // Controller method
  timetableController.parseSyllabus.bind(timetableController)
);

/**
 * @route   POST /api/timetable/validate
 * @desc    Validate existing timetable for conflicts
 * @access  Private (Admin/Teacher)
 * @body    {
 *   timetable: array or object
 * }
 */
router.post('/validate',
  // Admin or Teacher authorization
  (req, res, next) => {
    if (!['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Admin or Teacher access required'
      });
    }
    next();
  },
  timetableController.validateTimetable.bind(timetableController)
);

/**
 * @route   POST /api/timetable/optimize
 * @desc    Optimize existing timetable
 * @access  Private (Admin only)
 * @body    {
 *   timetable: array or object,
 *   strategy: string,
 *   maxIterations: number,
 *   preserveAssignments: array,
 *   constraints: object
 * }
 */
router.post('/optimize',
  // Admin authorization middleware
  (req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    next();
  },
  timetableController.optimizeTimetable.bind(timetableController)
);

/**
 * @route   GET /api/timetable/status/:jobId
 * @desc    Get job status for async operations
 * @access  Private
 */
router.get('/status/:jobId',
  timetableController.getJobStatus.bind(timetableController)
);

/**
 * @route   DELETE /api/timetable/jobs/:jobId
 * @desc    Cancel active job
 * @access  Private (Admin only)
 */
router.delete('/jobs/:jobId',
  // Admin authorization middleware
  (req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    next();
  },
  timetableController.cancelJob.bind(timetableController)
);

/**
 * @route   GET /api/timetable/templates
 * @desc    Generate template files for data input
 * @access  Private (Admin/Teacher)
 * @query   {
 *   types: string (comma-separated: course,teacher,room),
 *   outputDir: string
 * }
 */
router.get('/templates',
  // Admin or Teacher authorization
  (req, res, next) => {
    if (!['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Admin or Teacher access required'
      });
    }
    next();
  },
  timetableController.generateTemplates.bind(timetableController)
);

/**
 * @route   GET /api/timetable/templates/:type/download
 * @desc    Download template file
 * @access  Private (Admin/Teacher)
 * @params  type: course|teacher|room
 */
router.get('/templates/:type/download',
  // Admin or Teacher authorization
  (req, res, next) => {
    if (!['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Admin or Teacher access required'
      });
    }
    next();
  },
  timetableController.downloadTemplate.bind(timetableController)
);

/**
 * @route   GET /api/timetable/algorithms
 * @desc    Get information about available algorithms
 * @access  Private
 */
router.get('/algorithms',
  timetableController.getAlgorithmInfo.bind(timetableController)
);

/**
 * Additional routes for timetable management
 */

/**
 * @route   GET /api/timetable/view/:id
 * @desc    Get specific timetable by ID
 * @access  Private
 */
router.get('/view/:id', async (req, res) => {
  try {
    // This would integrate with the Timetable model we created earlier
    // For now, returning a placeholder
    res.status(200).json({
      success: true,
      message: 'Timetable retrieved successfully',
      data: {
        id: req.params.id,
        // Timetable data would be fetched from database
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve timetable',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/timetable/list
 * @desc    Get list of timetables with pagination
 * @access  Private
 * @query   {
 *   page: number,
 *   limit: number,
 *   semester: string,
 *   year: number,
 *   department: string,
 *   status: string
 * }
 */
router.get('/list', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      semester,
      year,
      department,
      status
    } = req.query;

    // Build filter object
    const filter = {};
    if (semester) filter['academicPeriod.semester'] = semester;
    if (year) filter['academicPeriod.year'] = parseInt(year);
    if (department) filter['scope.department'] = department;
    if (status) filter['publication.status'] = status;

    // Add user-specific filters based on role
    if (req.user.role === 'teacher') {
      filter['scope.teacher'] = req.user.id;
    } else if (req.user.role === 'student') {
      filter['scope.student'] = req.user.id;
    }

    // This would integrate with the Timetable model
    // For now, returning a placeholder
    res.status(200).json({
      success: true,
      data: {
        timetables: [], // Would be fetched from database
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0
        },
        filter: filter
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve timetables',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/timetable/my-schedule
 * @desc    Get current user's personalized schedule
 * @access  Private
 */
router.get('/my-schedule', async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Filter based on user role
    let schedule = [];
    
    if (userRole === 'teacher') {
      // Get teacher's teaching schedule
      // This would query the database for schedules where instructor = userId
    } else if (userRole === 'student') {
      // Get student's class schedule
      // This would query enrollments and return corresponding schedule entries
    } else if (userRole === 'admin') {
      // Admin might see overall schedule or specific department
      // Based on query parameters
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: userId,
          role: userRole
        },
        schedule: schedule,
        summary: {
          totalClasses: schedule.length,
          weeklyHours: 0, // Calculate from schedule
          departments: [] // Extract from schedule
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve personal schedule',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/timetable/:id/publish
 * @desc    Publish a timetable
 * @access  Private (Admin only)
 */
router.put('/:id/publish',
  // Admin authorization middleware
  (req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    next();
  },
  async (req, res) => {
    try {
      const timetableId = req.params.id;
      const publishedBy = req.user.id;

      // This would update the timetable in database
      // Set publication.status = 'published'
      // Set publication.publishedBy = publishedBy
      // Set publication.publishedAt = new Date()

      res.status(200).json({
        success: true,
        message: 'Timetable published successfully',
        data: {
          id: timetableId,
          publishedBy: publishedBy,
          publishedAt: new Date()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to publish timetable',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/timetable/conflicts/system-wide
 * @desc    Get system-wide conflicts across all timetables
 * @access  Private (Admin only)
 */
router.get('/conflicts/system-wide',
  // Admin authorization middleware
  (req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    next();
  },
  async (req, res) => {
    try {
      const { year, semester } = req.query;

      if (!year || !semester) {
        return res.status(400).json({
          success: false,
          message: 'Year and semester are required'
        });
      }

      // This would use the static method from Timetable model
      // const conflicts = await Timetable.findSystemWideConflicts(year, semester);

      res.status(200).json({
        success: true,
        data: {
          conflicts: [], // Would be populated from database
          summary: {
            total: 0,
            byType: {},
            resolved: 0,
            pending: 0
          },
          academicPeriod: {
            year: parseInt(year),
            semester: semester
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve system-wide conflicts',
        error: error.message
      });
    }
  }
);

module.exports = router;
