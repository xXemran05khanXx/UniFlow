/**
 * Department Controller
 * Handles CRUD operations for departments
 * Admin-only access required
 */

const Department = require('../models/Department');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * @desc    Get all departments
 * @route   GET /api/departments
 * @access  Public (read-only)
 */
exports.getDepartments = asyncHandler(async (req, res, next) => {
  const { isActive } = req.query;
  
  const filter = {};
  if (isActive !== undefined) {
    filter.isActive = isActive === 'true';
  }

  const departments = await Department.find(filter)
    .sort({ coursecode: 1 })
    .populate('studentCount')
    .populate('teacherCount');

  res.status(200).json(
    new ApiResponse(200, departments, 'Departments retrieved successfully')
  );
});

/**
 * @desc    Get department by ID
 * @route   GET /api/departments/:id
 * @access  Public
 */
exports.getDepartmentById = asyncHandler(async (req, res, next) => {
  const department = await Department.findById(req.params.id)
    .populate('studentCount')
    .populate('teacherCount');

  if (!department) {
    return next(new ApiError(404, 'Department not found'));
  }

  res.status(200).json(
    new ApiResponse(200, department, 'Department retrieved successfully')
  );
});

/**
 * @desc    Get department by coursecode
 * @route   GET /api/departments/coursecode/:coursecode
 * @access  Public
 */
exports.getDepartmentBycoursecode = asyncHandler(async (req, res, next) => {
  const department = await Department.getBycoursecode(req.params.coursecode);

  if (!department) {
    return next(new ApiError(404, 'Department not found'));
  }

  res.status(200).json(
    new ApiResponse(200, department, 'Department retrieved successfully')
  );
});

/**
 * @desc    Create new department
 * @route   POST /api/departments
 * @access  Admin only
 */
exports.createDepartment = asyncHandler(async (req, res, next) => {
  const { coursecode, name, description, isActive } = req.body;

  // Check if department already exists
  const existingDept = await Department.findOne({ 
    $or: [{ coursecode: coursecode.toUpperCase() }, { name }] 
  });

  if (existingDept) {
    return next(new ApiError(400, 'Department with this coursecode or name already exists'));
  }

  // Validate coursecode and name match
  const coursecodeNameMap = {
    'IT': 'Information Technology',
    'CS': 'Computer Science',
    'FE': 'First Year Engineering'
  };

  if (coursecodeNameMap[coursecode.toUpperCase()] !== name) {
    return next(new ApiError(400, 'Department coursecode and name do not match'));
  }

  const department = await Department.create({
    coursecode: coursecode.toUpperCase(),
    name,
    description,
    isActive
  });

  res.status(201).json(
    new ApiResponse(201, department, 'Department created successfully')
  );
});

/**
 * @desc    Update department
 * @route   PUT /api/departments/:id
 * @access  Admin only
 */
exports.updateDepartment = asyncHandler(async (req, res, next) => {
  const { description, isActive } = req.body;

  const department = await Department.findById(req.params.id);

  if (!department) {
    return next(new ApiError(404, 'Department not found'));
  }

  // Only allow updating description and isActive
  // coursecode and name should not be changed to maintain data integrity
  if (description !== undefined) {
    department.description = description;
  }

  if (isActive !== undefined) {
    department.isActive = isActive;
  }

  await department.save();

  res.status(200).json(
    new ApiResponse(200, department, 'Department updated successfully')
  );
});

/**
 * @desc    Delete department (soft delete by setting isActive to false)
 * @route   DELETE /api/departments/:id
 * @access  Admin only
 */
exports.deleteDepartment = asyncHandler(async (req, res, next) => {
  const department = await Department.findById(req.params.id);

  if (!department) {
    return next(new ApiError(404, 'Department not found'));
  }

  // Soft delete by deactivating
  await department.deactivate();

  res.status(200).json(
    new ApiResponse(200, null, 'Department deactivated successfully')
  );
});

/**
 * @desc    Activate department
 * @route   PATCH /api/departments/:id/activate
 * @access  Admin only
 */
exports.activateDepartment = asyncHandler(async (req, res, next) => {
  const department = await Department.findById(req.params.id);

  if (!department) {
    return next(new ApiError(404, 'Department not found'));
  }

  await department.activate();

  res.status(200).json(
    new ApiResponse(200, department, 'Department activated successfully')
  );
});

/**
 * @desc    Get department statistics
 * @route   GET /api/departments/:id/stats
 * @access  Public
 */
exports.getDepartmentStats = asyncHandler(async (req, res, next) => {
  const department = await Department.findById(req.params.id);

  if (!department) {
    return next(new ApiError(404, 'Department not found'));
  }

  // Import models here to avoid circular dependencies
  const User = require('../models/User');
  const Course = require('../models/Course');
  const Room = require('../models/Room');

  const [studentCount, teacherCount, courseCount, CourseCount, roomCount] = await Promise.all([
    User.countDocuments({ department: department._id, role: 'student', isActive: true }),
    User.countDocuments({ 
      role: 'teacher',
      $or: [
        { department: department._id },
        { allowedDepartments: department._id }
      ]
    }),
    Course.countDocuments({ department: department._id }),
    Course.countDocuments({ department: department._id }),
    Room.countDocuments({ department: department._id })
  ]);

  const stats = {
    department: {
      coursecode: department.coursecode,
      name: department.name,
      isActive: department.isActive
    },
    counts: {
      students: studentCount,
      teachers: teacherCount,
      courses: courseCount,
      Courses: CourseCount,
      rooms: roomCount
    }
  };

  res.status(200).json(
    new ApiResponse(200, stats, 'Department statistics retrieved successfully')
  );
});
