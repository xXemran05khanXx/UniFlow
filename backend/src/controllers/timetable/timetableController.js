const TimetableService = require('../../services/timetable/timetableService');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../../uploads/syllabus');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept PDF, Excel, CSV, and text files
  const allowedTypes = ['.pdf', '.xlsx', '.xls', '.csv', '.txt'];
  const extension = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(extension)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed: PDF, Excel, CSV, TXT'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 files at once
  }
});

class TimetableController {
  constructor() {
    this.timetableService = new TimetableService();
  }

  /**
   * Generate timetable from uploaded files or data
   * POST /api/timetable/generate
   */
  async generateTimetable(req, res) {
    try {
      const options = {
        algorithm: req.body.algorithm || 'greedy',
        maxIterations: parseInt(req.body.maxIterations) || 1000,
        semester: req.body.semester ? parseInt(req.body.semester) : null,
        departmentId: req.body.departmentId || null,
        departmentCode: req.body.departmentCode || null,
        academicYear: req.body.academicYear || new Date().getFullYear(),
        timeSlotDuration: parseInt(req.body.timeSlotDuration) || 60,
        workingDays: req.body.workingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        workingHours: req.body.workingHours || { start: '08:00', end: '18:00' },
        saveTimetable: req.body.saveTimetable || false,
        savePath: req.body.savePath,
        algorithmOptions: req.body.algorithmOptions || {},
        postProcessing: req.body.postProcessing || {},
        parseOptions: req.body.parseOptions || {}
      };

      // Handle file uploads
      if (req.files && req.files.length > 0) {
        options.files = req.files.map(file => ({
          path: file.path,
          originalName: file.originalname,
          type: req.body.fileType || 'auto'
        }));
      }

      // Handle direct data input
      if (req.body.courses) options.courses = JSON.parse(req.body.courses);
      if (req.body.teachers) options.teachers = JSON.parse(req.body.teachers);
      if (req.body.rooms) options.rooms = JSON.parse(req.body.rooms);

      // Handle database fetch option
      if (req.body.useDatabase) {
        options.useDatabase = true;
        options.dbOptions = req.body.dbOptions || {};
      }

      console.log('Starting timetable generation with options:', options);

      // Generate timetable (this runs in background for large datasets)
      const result = await this.timetableService.generateTimetable(options);

      // Clean up uploaded files if specified
      if (req.body.cleanupFiles && options.files) {
        this.cleanupFiles(options.files);
      }

      res.status(200).json({
        success: true,
        message: 'Timetable generation completed',
        data: result
      });

    } catch (error) {
      console.error('Timetable generation error:', error);
      
      // Clean up files on error
      if (req.files) {
        this.cleanupFiles(req.files.map(f => ({ path: f.path })));
      }

      res.status(500).json({
        success: false,
        message: 'Timetable generation failed',
        error: error.message
      });
    }
  }

  /**
   * Generate timetable asynchronously (for large datasets)
   * POST /api/timetable/generate-async
   */
  async generateTimetableAsync(req, res) {
    try {
      const options = {
        algorithm: req.body.algorithm || 'greedy',
        maxIterations: parseInt(req.body.maxIterations) || 1000,
        semester: req.body.semester ? parseInt(req.body.semester) : null,
        departmentId: req.body.departmentId || null,
        departmentCode: req.body.departmentCode || null,
        academicYear: req.body.academicYear || new Date().getFullYear(),
        timeSlotDuration: parseInt(req.body.timeSlotDuration) || 60,
        workingDays: req.body.workingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        workingHours: req.body.workingHours || { start: '08:00', end: '18:00' },
        saveTimetable: true, // Always save for async jobs
        algorithmOptions: req.body.algorithmOptions || {},
        postProcessing: req.body.postProcessing || {},
        parseOptions: req.body.parseOptions || {}
      };

      // Handle file uploads
      if (req.files && req.files.length > 0) {
        options.files = req.files.map(file => ({
          path: file.path,
          originalName: file.originalname,
          type: req.body.fileType || 'auto'
        }));
      }

      // Handle direct data input
      if (req.body.courses) options.courses = JSON.parse(req.body.courses);
      if (req.body.teachers) options.teachers = JSON.parse(req.body.teachers);
      if (req.body.rooms) options.rooms = JSON.parse(req.body.rooms);

      console.log('Starting async timetable generation...');

      // Start generation in background
      const jobPromise = this.timetableService.generateTimetable(options);
      
      // Get job ID from the promise (this is a simplified approach)
      const jobId = `async_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Return job ID immediately
      res.status(202).json({
        success: true,
        message: 'Timetable generation started',
        jobId: jobId,
        statusUrl: `/api/timetable/status/${jobId}`,
        estimatedTime: this.estimateGenerationTime(options)
      });

      // Handle the actual generation in background
      jobPromise.then(result => {
        console.log(`Async job ${jobId} completed:`, result.success);
      }).catch(error => {
        console.error(`Async job ${jobId} failed:`, error);
      });

    } catch (error) {
      console.error('Async timetable generation error:', error);
      
      if (req.files) {
        this.cleanupFiles(req.files.map(f => ({ path: f.path })));
      }

      res.status(500).json({
        success: false,
        message: 'Failed to start timetable generation',
        error: error.message
      });
    }
  }

  /**
   * Parse syllabus files without generating timetable
   * POST /api/timetable/parse-syllabus
   */
  async parseSyllabus(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded'
        });
      }

      const files = req.files.map(file => ({
        path: file.path,
        originalName: file.originalname,
        type: req.body.fileType || 'auto'
      }));

      const parseOptions = req.body.parseOptions ? JSON.parse(req.body.parseOptions) : {};

      console.log('Parsing syllabus files:', files.map(f => f.originalName));

      const result = await this.timetableService.parseSyllabusFiles(files, parseOptions);

      // Clean up files if specified
      if (req.body.cleanupFiles) {
        this.cleanupFiles(files);
      }

      res.status(200).json({
        success: true,
        message: 'Syllabus parsing completed',
        data: result
      });

    } catch (error) {
      console.error('Syllabus parsing error:', error);
      
      if (req.files) {
        this.cleanupFiles(req.files.map(f => ({ path: f.path })));
      }

      res.status(500).json({
        success: false,
        message: 'Syllabus parsing failed',
        error: error.message
      });
    }
  }

  /**
   * Validate existing timetable
   * POST /api/timetable/validate
   */
  async validateTimetable(req, res) {
    try {
      const timetableData = req.body.timetable || req.body.schedule;

      if (!timetableData) {
        return res.status(400).json({
          success: false,
          message: 'Timetable data is required'
        });
      }

      console.log('Validating timetable...');

      const result = await this.timetableService.validateTimetable(timetableData);

      res.status(200).json({
        success: true,
        message: 'Timetable validation completed',
        data: result
      });

    } catch (error) {
      console.error('Timetable validation error:', error);

      res.status(500).json({
        success: false,
        message: 'Timetable validation failed',
        error: error.message
      });
    }
  }

  /**
   * Optimize existing timetable
   * POST /api/timetable/optimize
   */
  async optimizeTimetable(req, res) {
    try {
      const timetableData = req.body.timetable || req.body.schedule;

      if (!timetableData) {
        return res.status(400).json({
          success: false,
          message: 'Timetable data is required'
        });
      }

      const options = {
        strategy: req.body.strategy || 'conflict_resolution',
        maxIterations: parseInt(req.body.maxIterations) || 100,
        preserveAssignments: req.body.preserveAssignments || [],
        constraints: req.body.constraints || {}
      };

      console.log('Optimizing timetable with strategy:', options.strategy);

      const result = await this.timetableService.optimizeTimetable(timetableData, options);

      res.status(200).json({
        success: true,
        message: 'Timetable optimization completed',
        data: result
      });

    } catch (error) {
      console.error('Timetable optimization error:', error);

      res.status(500).json({
        success: false,
        message: 'Timetable optimization failed',
        error: error.message
      });
    }
  }

  /**
   * Get job status
   * GET /api/timetable/status/:jobId
   */
  async getJobStatus(req, res) {
    try {
      const { jobId } = req.params;

      if (!jobId) {
        return res.status(400).json({
          success: false,
          message: 'Job ID is required'
        });
      }

      const status = this.timetableService.getJobStatus(jobId);

      if (!status.found) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      res.status(200).json({
        success: true,
        data: status
      });

    } catch (error) {
      console.error('Get job status error:', error);

      res.status(500).json({
        success: false,
        message: 'Failed to get job status',
        error: error.message
      });
    }
  }

  /**
   * Cancel active job
   * DELETE /api/timetable/jobs/:jobId
   */
  async cancelJob(req, res) {
    try {
      const { jobId } = req.params;

      if (!jobId) {
        return res.status(400).json({
          success: false,
          message: 'Job ID is required'
        });
      }

      const result = this.timetableService.cancelJob(jobId);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.status(200).json({
        success: true,
        message: 'Job cancelled successfully'
      });

    } catch (error) {
      console.error('Cancel job error:', error);

      res.status(500).json({
        success: false,
        message: 'Failed to cancel job',
        error: error.message
      });
    }
  }

  /**
   * Generate template files
   * GET /api/timetable/templates
   */
  async generateTemplates(req, res) {
    try {
      const types = req.query.types ? req.query.types.split(',') : ['course', 'teacher', 'room'];
      const outputDir = req.query.outputDir || path.join(__dirname, '../../../downloads/templates');

      // Ensure output directory exists
      await fs.mkdir(outputDir, { recursive: true });

      console.log('Generating templates for types:', types);

      const result = await this.timetableService.generateTemplates(outputDir, types);

      res.status(200).json({
        success: true,
        message: 'Templates generated successfully',
        data: result
      });

    } catch (error) {
      console.error('Template generation error:', error);

      res.status(500).json({
        success: false,
        message: 'Template generation failed',
        error: error.message
      });
    }
  }

  /**
   * Download template file
   * GET /api/timetable/templates/:type/download
   */
  async downloadTemplate(req, res) {
    try {
      const { type } = req.params;
      const allowedTypes = ['course', 'teacher', 'room'];

      if (!allowedTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid template type'
        });
      }

      const tempDir = path.join(__dirname, '../../../temp');
      await fs.mkdir(tempDir, { recursive: true });

      const fileName = `${type}_template.csv`;
      const filePath = path.join(tempDir, fileName);

      // Generate template
      const result = await this.timetableService.generateTemplates(tempDir, [type]);

      if (!result[type].success) {
        return res.status(500).json({
          success: false,
          message: `Failed to generate ${type} template`,
          error: result[type].error
        });
      }

      // Send file
      res.download(filePath, fileName, (err) => {
        if (err) {
          console.error('File download error:', err);
        }
        // Clean up temp file
        fs.unlink(filePath).catch(console.error);
      });

    } catch (error) {
      console.error('Template download error:', error);

      res.status(500).json({
        success: false,
        message: 'Template download failed',
        error: error.message
      });
    }
  }

  /**
   * Get algorithm information
   * GET /api/timetable/algorithms
   */
  async getAlgorithmInfo(req, res) {
    try {
      const algorithms = {
        greedy: {
          name: 'Greedy Algorithm',
          description: 'Fast algorithm that makes locally optimal choices',
          complexity: 'O(n²)',
          bestFor: 'Small to medium datasets, quick results',
          parameters: {
            maxIterations: { type: 'number', default: 1000, description: 'Maximum number of iterations' }
          }
        },
        genetic: {
          name: 'Genetic Algorithm',
          description: 'Evolutionary algorithm that improves solutions over generations',
          complexity: 'O(n³)',
          bestFor: 'Complex constraints, high-quality solutions',
          parameters: {
            populationSize: { type: 'number', default: 50, description: 'Size of each generation' },
            mutationRate: { type: 'number', default: 0.1, description: 'Probability of mutation' },
            maxIterations: { type: 'number', default: 1000, description: 'Number of generations' }
          }
        },
        constraint_satisfaction: {
          name: 'Constraint Satisfaction',
          description: 'Systematic approach using constraint propagation and backtracking',
          complexity: 'Exponential worst case',
          bestFor: 'Hard constraints, guaranteed feasible solutions',
          parameters: {
            maxIterations: { type: 'number', default: 1000, description: 'Maximum backtrack attempts' }
          }
        }
      };

      res.status(200).json({
        success: true,
        data: algorithms
      });

    } catch (error) {
      console.error('Algorithm info error:', error);

      res.status(500).json({
        success: false,
        message: 'Failed to get algorithm information',
        error: error.message
      });
    }
  }

  /**
   * Helper Methods
   */

  async cleanupFiles(files) {
    try {
      for (const file of files) {
        await fs.unlink(file.path);
      }
    } catch (error) {
      console.error('File cleanup error:', error);
    }
  }

  estimateGenerationTime(options) {
    // Simple estimation based on algorithm and data size
    const baseTime = {
      greedy: 30, // seconds
      genetic: 120,
      constraint_satisfaction: 300
    };

    const algorithmTime = baseTime[options.algorithm] || baseTime.greedy;
    
    // Adjust based on iterations
    const iterationFactor = (options.maxIterations || 1000) / 1000;
    
    return Math.round(algorithmTime * iterationFactor);
  }

  /**
   * Middleware for file uploads
   */
  getUploadMiddleware() {
    return upload.array('files', 10); // Allow up to 10 files
  }
}

module.exports = TimetableController;
