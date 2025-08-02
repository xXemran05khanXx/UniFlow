/**
 * Subject Controller
 * Handles all subject management operations for admin users
 */

const Subject = require('../models/Subject');
const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const csv = require('csv-parser');
const { Readable } = require('stream');

/**
 * @desc    Get all subjects with filtering and pagination
 * @route   GET /api/subjects
 * @access  Private (Admin/Teacher)
 */
const getAllSubjects = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    department,
    semester,
    year,
    type,
    isActive,
    credits,
    sortBy = 'name',
    sortOrder = 'asc'
  } = req.query;

  // Build filter object
  const filter = {};
  
  if (search) {
    filter.$or = [
      { code: { $regex: search, $options: 'i' } },
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }
  
  if (department) filter.department = department;
  if (semester) filter.semester = parseInt(semester);
  if (year) filter.year = parseInt(year);
  if (type) filter.type = type;
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  if (credits) filter.credits = parseInt(credits);

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  // Calculate pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Execute queries
  const [subjects, totalCount] = await Promise.all([
    Subject.find(filter)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limitNum),
    Subject.countDocuments(filter)
  ]);

  // Calculate pagination info
  const totalPages = Math.ceil(totalCount / limitNum);
  const hasNextPage = pageNum < totalPages;
  const hasPrevPage = pageNum > 1;

  res.status(200).json(
    new ApiResponse(200, {
      subjects,
      totalCount,
      currentPage: pageNum,
      totalPages,
      hasNextPage,
      hasPrevPage
    }, 'Subjects retrieved successfully')
  );
});

/**
 * @desc    Get subject by ID
 * @route   GET /api/subjects/:id
 * @access  Private (Admin/Teacher)
 */
const getSubjectById = asyncHandler(async (req, res) => {
  const subject = await Subject.findById(req.params.id)
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');

  if (!subject) {
    throw new ApiError(404, 'Subject not found');
  }

  res.status(200).json(
    new ApiResponse(200, subject, 'Subject retrieved successfully')
  );
});

/**
 * @desc    Create new subject
 * @route   POST /api/subjects
 * @access  Private (Admin only)
 */
const createSubject = asyncHandler(async (req, res) => {
  const {
    code,
    name,
    credits,
    semester,
    department,
    year,
    type,
    description,
    prerequisites,
    syllabus,
    isActive = true
  } = req.body;

  // Check if subject code already exists
  const existingSubject = await Subject.findOne({ code: code.toUpperCase() });
  if (existingSubject) {
    throw new ApiError(400, 'Subject code already exists');
  }

  // Create subject
  const subject = await Subject.create({
    code: code.toUpperCase(),
    name,
    credits,
    semester,
    department,
    year,
    type,
    description,
    prerequisites,
    syllabus,
    isActive,
    createdBy: req.user._id
  });

  // Validate prerequisites if provided
  if (prerequisites && prerequisites.length > 0) {
    const validation = await subject.validatePrerequisites();
    if (!validation.valid) {
      await Subject.findByIdAndDelete(subject._id);
      throw new ApiError(400, `Invalid prerequisite codes: ${validation.invalidCodes.join(', ')}`);
    }
  }

  await subject.populate('createdBy', 'name email');

  res.status(201).json(
    new ApiResponse(201, subject, 'Subject created successfully')
  );
});

/**
 * @desc    Update subject
 * @route   PUT /api/subjects/:id
 * @access  Private (Admin only)
 */
const updateSubject = asyncHandler(async (req, res) => {
  const subject = await Subject.findById(req.params.id);

  if (!subject) {
    throw new ApiError(404, 'Subject not found');
  }

  // Check if updating code and if it conflicts with existing
  if (req.body.code && req.body.code.toUpperCase() !== subject.code) {
    const existingSubject = await Subject.findOne({ 
      code: req.body.code.toUpperCase(),
      _id: { $ne: req.params.id }
    });
    
    if (existingSubject) {
      throw new ApiError(400, 'Subject code already exists');
    }
  }

  // Update fields
  const updateFields = { ...req.body };
  if (updateFields.code) {
    updateFields.code = updateFields.code.toUpperCase();
  }
  updateFields.updatedBy = req.user._id;

  const updatedSubject = await Subject.findByIdAndUpdate(
    req.params.id,
    updateFields,
    { new: true, runValidators: true }
  ).populate('createdBy', 'name email').populate('updatedBy', 'name email');

  // Validate prerequisites if updated
  if (updateFields.prerequisites) {
    const validation = await updatedSubject.validatePrerequisites();
    if (!validation.valid) {
      throw new ApiError(400, `Invalid prerequisite codes: ${validation.invalidCodes.join(', ')}`);
    }
  }

  res.status(200).json(
    new ApiResponse(200, updatedSubject, 'Subject updated successfully')
  );
});

/**
 * @desc    Delete subject
 * @route   DELETE /api/subjects/:id
 * @access  Private (Admin only)
 */
const deleteSubject = asyncHandler(async (req, res) => {
  const subject = await Subject.findById(req.params.id);

  if (!subject) {
    throw new ApiError(404, 'Subject not found');
  }

  // Check if subject can be deleted
  if (!subject.canBeDeleted()) {
    throw new ApiError(400, 'Subject cannot be deleted as it is referenced in other records');
  }

  await Subject.findByIdAndDelete(req.params.id);

  res.status(200).json(
    new ApiResponse(200, null, 'Subject deleted successfully')
  );
});

/**
 * @desc    Activate subject
 * @route   PATCH /api/subjects/:id/activate
 * @access  Private (Admin only)
 */
const activateSubject = asyncHandler(async (req, res) => {
  const subject = await Subject.findByIdAndUpdate(
    req.params.id,
    { 
      isActive: true,
      updatedBy: req.user._id
    },
    { new: true, runValidators: true }
  ).populate('createdBy', 'name email').populate('updatedBy', 'name email');

  if (!subject) {
    throw new ApiError(404, 'Subject not found');
  }

  res.status(200).json(
    new ApiResponse(200, subject, 'Subject activated successfully')
  );
});

/**
 * @desc    Deactivate subject
 * @route   PATCH /api/subjects/:id/deactivate
 * @access  Private (Admin only)
 */
const deactivateSubject = asyncHandler(async (req, res) => {
  const subject = await Subject.findByIdAndUpdate(
    req.params.id,
    { 
      isActive: false,
      updatedBy: req.user._id
    },
    { new: true, runValidators: true }
  ).populate('createdBy', 'name email').populate('updatedBy', 'name email');

  if (!subject) {
    throw new ApiError(404, 'Subject not found');
  }

  res.status(200).json(
    new ApiResponse(200, subject, 'Subject deactivated successfully')
  );
});

/**
 * @desc    Get subject statistics
 * @route   GET /api/subjects/stats
 * @access  Private (Admin only)
 */
const getSubjectStats = asyncHandler(async (req, res) => {
  const stats = await Subject.getSubjectStats();

  res.status(200).json(
    new ApiResponse(200, stats, 'Subject statistics retrieved successfully')
  );
});

/**
 * @desc    Bulk update subjects
 * @route   PATCH /api/subjects/bulk-update
 * @access  Private (Admin only)
 */
const bulkUpdateSubjects = asyncHandler(async (req, res) => {
  const { subjectIds, action, data } = req.body;

  if (!subjectIds || !Array.isArray(subjectIds) || subjectIds.length === 0) {
    throw new ApiError(400, 'Subject IDs are required');
  }

  if (!action) {
    throw new ApiError(400, 'Action is required');
  }

  let updateData = { updatedBy: req.user._id };
  let result = { success: 0, failed: 0, errors: [] };

  switch (action) {
    case 'activate':
      updateData.isActive = true;
      break;
    case 'deactivate':
      updateData.isActive = false;
      break;
    case 'delete':
      try {
        const deleteResult = await Subject.deleteMany({ _id: { $in: subjectIds } });
        result.success = deleteResult.deletedCount;
        result.failed = subjectIds.length - deleteResult.deletedCount;
      } catch (error) {
        result.failed = subjectIds.length;
        result.errors.push(error.message);
      }
      
      return res.status(200).json(
        new ApiResponse(200, result, 'Bulk delete operation completed')
      );
    case 'updateDepartment':
      if (!data?.department) {
        throw new ApiError(400, 'Department is required for update');
      }
      updateData.department = data.department;
      break;
    case 'updateSemester':
      if (!data?.semester) {
        throw new ApiError(400, 'Semester is required for update');
      }
      updateData.semester = data.semester;
      break;
    default:
      throw new ApiError(400, 'Invalid action');
  }

  try {
    const updateResult = await Subject.updateMany(
      { _id: { $in: subjectIds } },
      updateData
    );
    
    result.success = updateResult.modifiedCount;
    result.failed = subjectIds.length - updateResult.modifiedCount;
  } catch (error) {
    result.failed = subjectIds.length;
    result.errors.push(error.message);
  }

  res.status(200).json(
    new ApiResponse(200, result, 'Bulk update operation completed')
  );
});

/**
 * @desc    Import subjects from CSV
 * @route   POST /api/subjects/import
 * @access  Private (Admin only)
 */
const importSubjects = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'CSV file is required');
  }

  const results = [];
  const errors = [];
  let imported = 0;
  let failed = 0;

  // Parse CSV
  const csvData = req.file.buffer.toString();
  const stream = Readable.from([csvData]);

  return new Promise((resolve, reject) => {
    stream
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        try {
          for (const row of results) {
            try {
              // Validate required fields
              if (!row.code || !row.name || !row.department || !row.semester || !row.credits) {
                errors.push(`Row with code ${row.code || 'unknown'}: Missing required fields`);
                failed++;
                continue;
              }

              // Check if subject already exists
              const existingSubject = await Subject.findOne({ code: row.code.toUpperCase() });
              if (existingSubject) {
                errors.push(`Subject code ${row.code} already exists`);
                failed++;
                continue;
              }

              // Create subject
              await Subject.create({
                code: row.code.toUpperCase(),
                name: row.name,
                credits: parseInt(row.credits),
                semester: parseInt(row.semester),
                department: row.department,
                year: parseInt(row.year || Math.ceil(parseInt(row.semester) / 2)),
                type: row.type || 'theory',
                description: row.description || '',
                prerequisites: row.prerequisites ? row.prerequisites.split(',').map(p => p.trim()) : [],
                isActive: row.isActive !== 'false',
                createdBy: req.user._id
              });

              imported++;
            } catch (error) {
              errors.push(`Row with code ${row.code}: ${error.message}`);
              failed++;
            }
          }

          res.status(200).json(
            new ApiResponse(200, {
              imported,
              failed,
              errors
            }, 'Import completed')
          );
          resolve();
        } catch (error) {
          reject(error);
        }
      })
      .on('error', (error) => {
        reject(new ApiError(400, `CSV parsing error: ${error.message}`));
      });
  });
});

/**
 * @desc    Export subjects to CSV/JSON
 * @route   GET /api/subjects/export
 * @access  Private (Admin/Teacher)
 */
const exportSubjects = asyncHandler(async (req, res) => {
  const { format = 'csv', ...filters } = req.query;

  // Build filter object (similar to getAllSubjects)
  const filter = {};
  if (filters.department) filter.department = filters.department;
  if (filters.semester) filter.semester = parseInt(filters.semester);
  if (filters.year) filter.year = parseInt(filters.year);
  if (filters.type) filter.type = filters.type;
  if (filters.isActive !== undefined) filter.isActive = filters.isActive === 'true';

  const subjects = await Subject.find(filter).sort({ department: 1, semester: 1, code: 1 });

  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=subjects.json');
    return res.send(JSON.stringify(subjects, null, 2));
  }

  // CSV format
  const csvHeaders = [
    'code', 'name', 'department', 'semester', 'year', 'credits', 'type', 
    'description', 'prerequisites', 'isActive'
  ];

  const csvRows = subjects.map(subject => [
    subject.code,
    subject.name,
    subject.department,
    subject.semester,
    subject.year,
    subject.credits,
    subject.type,
    subject.description || '',
    subject.prerequisites?.join(', ') || '',
    subject.isActive
  ]);

  const csvContent = [
    csvHeaders.join(','),
    ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=subjects.csv');
  res.send(csvContent);
});

/**
 * @desc    Get CSV template for import
 * @route   GET /api/subjects/template
 * @access  Private (Admin only)
 */
const getImportTemplate = asyncHandler(async (req, res) => {
  const csvHeaders = [
    'code', 'name', 'department', 'semester', 'year', 'credits', 'type', 
    'description', 'prerequisites', 'isActive'
  ];

  const sampleRows = [
    [
      'CS101', 'Introduction to Computer Science', 'Computer Science', '1', '1', '3', 
      'theory', 'Basic concepts of computer science', '', 'true'
    ],
    [
      'MATH101', 'Engineering Mathematics I', 'Computer Science', '1', '1', '4', 
      'theory', 'Fundamental mathematics for engineering', '', 'true'
    ]
  ];

  const csvContent = [
    csvHeaders.join(','),
    ...sampleRows.map(row => row.map(field => `"${field}"`).join(','))
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=subject_template.csv');
  res.send(csvContent);
});

/**
 * @desc    Get subjects by department and semester
 * @route   GET /api/subjects/department/:department/semester/:semester
 * @access  Private (Admin/Teacher)
 */
const getSubjectsByDepartmentAndSemester = asyncHandler(async (req, res) => {
  const { department, semester } = req.params;

  const subjects = await Subject.findByDepartmentAndSemester(
    department,
    parseInt(semester)
  );

  res.status(200).json(
    new ApiResponse(200, subjects, 'Subjects retrieved successfully')
  );
});

/**
 * @desc    Duplicate subject
 * @route   POST /api/subjects/:id/duplicate
 * @access  Private (Admin only)
 */
const duplicateSubject = asyncHandler(async (req, res) => {
  const { newCode } = req.body;

  if (!newCode) {
    throw new ApiError(400, 'New subject code is required');
  }

  const originalSubject = await Subject.findById(req.params.id);
  if (!originalSubject) {
    throw new ApiError(404, 'Subject not found');
  }

  // Check if new code already exists
  const existingSubject = await Subject.findOne({ code: newCode.toUpperCase() });
  if (existingSubject) {
    throw new ApiError(400, 'Subject code already exists');
  }

  const duplicatedSubject = originalSubject.duplicate(newCode.toUpperCase());
  duplicatedSubject.createdBy = req.user._id;
  
  await duplicatedSubject.save();
  await duplicatedSubject.populate('createdBy', 'name email');

  res.status(201).json(
    new ApiResponse(201, duplicatedSubject, 'Subject duplicated successfully')
  );
});

/**
 * @desc    Get departments list
 * @route   GET /api/subjects/departments
 * @access  Private (Admin/Teacher)
 */
const getDepartments = asyncHandler(async (req, res) => {
  const departments = [
    'Computer Science',
    'Information Technology',
    'Electronics & Telecommunication',
    'Electrical Engineering',
    'Mechanical Engineering',
    'Civil Engineering',
    'Chemical Engineering',
    'Instrumentation Engineering'
  ];

  res.status(200).json(
    new ApiResponse(200, departments, 'Departments retrieved successfully')
  );
});

module.exports = {
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
};
