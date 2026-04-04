/**
 * Course Controller
 * Handles all Course management operations for admin users
 */

const Course = require('../models/Course');
const User = require('../models/User');
const Department = require('../models/Department');
const asyncHandler = require('../middleware/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const csv = require('csv-parser');
const { Readable } = require('stream');

/**
 * @desc    Get all Courses with filtering and pagination
 * @route   GET /api/courses
 * @access  Private (Admin/Teacher)
 */
const getAllCourses = asyncHandler(async (req, res) => {
    const {
        search,
        department,
        semester,
        year,
        courseType,
        isActive,
        credits,
        page = 1,
        limit = 10,
        sortBy = 'courseCode',
        sortOrder = 'asc'
    } = req.query;

    const filter = {};

    // 🔎 Search
    if (search) {
        filter.$or = [
            { courseCode: { $regex: search, $options: 'i' } },
            { name: { $regex: search, $options: 'i' } }
        ];
    }

    // 🏢 Department filter
    if (department) {
        if (department.match(/^[0-9a-fA-F]{24}$/)) {
            filter.department = department;
        } else {
            const deptDoc = await Department.findOne({
                $or: [
                    { name: { $regex: new RegExp(`^${department}$`, 'i') } },
                    { code: { $regex: new RegExp(`^${department}$`, 'i') } }
                ]
            });

            if (!deptDoc) {
                return res.status(200).json(
                    new ApiResponse(200, {
                        courses: [],
                        totalCount: 0,
                        currentPage: 1,
                        totalPages: 0
                    }, 'No courses found for department')
                );
            }
            filter.department = deptDoc._id;
        }
    }

    if (semester) filter.semester = Number(semester);
    if (year) filter.year = Number(year);
    if (courseType) filter.courseType = courseType;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (credits) filter.credits = Number(credits);

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const [courses, totalCount] = await Promise.all([
        Course.find(filter)
            .populate('department', 'name code')
            .populate('qualifiedFaculties', 'name email')
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email')
            .sort(sort)
            .skip(skip)
            .limit(limitNum),
        Course.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.status(200).json(
        new ApiResponse(200, {
            courses,
            totalCount,
            currentPage: pageNum,
            totalPages,
            hasNextPage: pageNum < totalPages,
            hasPrevPage: pageNum > 1
        }, 'Courses retrieved successfully')
    );
});

/**
 * @desc    Get Course by ID
 */
const getCourseById = asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.id)
        .populate('department', 'name code')
        .populate('qualifiedFaculties', 'name email');

    if (!course) {
        throw new ApiError(404, 'Course not found');
    }

    res.status(200).json(new ApiResponse(200, course, 'Course retrieved successfully'));
});

/**
 * @desc    Create new Course
 */
const createCourse = asyncHandler(async (req, res) => {
    const {
        courseCode,
        name,
        department,
        semester,
        courseType,
        credits,
        hoursPerWeek,
        qualifiedFaculties,
        syllabus,
        prerequisites
    } = req.body;

    const existing = await Course.findOne({ courseCode: courseCode.toUpperCase() });
    if (existing) {
        throw new ApiError(400, 'Course code already exists');
    }

    let departmentId = department;
    if (department && !department.match(/^[0-9a-fA-F]{24}$/)) {
        const deptDoc = await Department.findOne({
            $or: [
                { name: { $regex: new RegExp(`^${department}$`, 'i') } },
                { code: { $regex: new RegExp(`^${department}$`, 'i') } }
            ]
        });
        if (!deptDoc) throw new ApiError(400, `Invalid department: ${department}`);
        departmentId = deptDoc._id;
    }

    const course = await Course.create({
        courseCode: courseCode.toUpperCase(),
        name,
        department: departmentId,
        semester,
        courseType,
        credits,
        hoursPerWeek,
        qualifiedFaculties,
        syllabus,
        prerequisites,
        createdBy: req.user._id
    });

    res.status(201).json(new ApiResponse(201, course, 'Course created successfully'));
});

/**
 * @desc    Update Course
 */
const updateCourse = asyncHandler(async (req, res) => {
    const updateData = { ...req.body };

    if (updateData.courseCode) {
        updateData.courseCode = updateData.courseCode.toUpperCase();
    }

    updateData.updatedBy = req.user._id;

    const course = await Course.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
    );

    if (!course) throw new ApiError(404, 'Course not found');

    res.status(200).json(new ApiResponse(200, course, 'Course updated successfully'));
});

/**
 * @desc    Delete Course
 */
const deleteCourse = asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.id);
    if (!course) throw new ApiError(404, 'Course not found');

    await course.deleteOne();
    res.status(200).json(new ApiResponse(200, null, 'Course deleted successfully'));
});

/**
 * Activate Course
 */
const activateCourse = asyncHandler(async (req, res) => {
    const course = await Course.findByIdAndUpdate(
        req.params.id,
        { isActive: true, updatedBy: req.user._id },
        { new: true }
    );
    if (!course) throw new ApiError(404, 'Course not found');

    res.status(200).json(new ApiResponse(200, course, 'Course activated'));
});

/**
 * Deactivate Course
 */
const deactivateCourse = asyncHandler(async (req, res) => {
    const course = await Course.findByIdAndUpdate(
        req.params.id,
        { isActive: false, updatedBy: req.user._id },
        { new: true }
    );
    if (!course) throw new ApiError(404, 'Course not found');

    res.status(200).json(new ApiResponse(200, course, 'Course deactivated'));
});

/**
 * Course Stats
 */
const getCourseStats = asyncHandler(async (req, res) => {
    const stats = await Course.aggregate([
        { $group: { _id: "$courseType", count: { $sum: 1 }, avgCredits: { $avg: "$credits" } } }
    ]);
    res.status(200).json(new ApiResponse(200, stats, 'Stats retrieved'));
});

/**
 * Bulk Update
 */
const bulkUpdateCourses = asyncHandler(async (req, res) => {
    const { courseIds, action, data } = req.body;

    if (!courseIds || !Array.isArray(courseIds))
        throw new ApiError(400, 'Invalid Course IDs');

    let updateQuery = { updatedBy: req.user._id };

    if (action === 'activate') updateQuery.isActive = true;
    else if (action === 'deactivate') updateQuery.isActive = false;
    else if (action === 'updateSemester') updateQuery.semester = data.semester;
    else throw new ApiError(400, 'Invalid action');

    const result = await Course.updateMany(
        { _id: { $in: courseIds } },
        { $set: updateQuery }
    );

    res.status(200).json(new ApiResponse(200, result, 'Bulk update completed'));
});

/**
 * Import Courses from CSV
 */
const importCourses = asyncHandler(async (req, res) => {
    if (!req.file) throw new ApiError(400, 'CSV file is required');

    const results = [];
    const stream = Readable.from([req.file.buffer.toString()]);

    stream.pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            let imported = 0;

            for (const row of results) {
                try {
                    await Course.create({
                        courseCode: row.courseCode.toUpperCase(),
                        name: row.name,
                        credits: parseInt(row.credits),
                        semester: parseInt(row.semester),
                        department: row.department,
                        createdBy: req.user._id
                    });
                    imported++;
                } catch (e) {}
            }

            res.status(200).json(new ApiResponse(200, { imported }, 'Import finished'));
        });
});

/**
 * Export Courses
 */
const exportCourses = asyncHandler(async (req, res) => {
    const courses = await Course.find().lean();

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=courses.csv');

    const headers = "CourseCode,Name,Credits,Semester\n";
    const rows = courses.map(c =>
        `${c.courseCode},${c.name},${c.credits},${c.semester}`
    ).join("\n");

    res.send(headers + rows);
});

/**
 * Duplicate Course
 */
const duplicateCourse = asyncHandler(async (req, res) => {
    const { newCourseCode } = req.body;

    const course = await Course.findById(req.params.id);
    if (!course) throw new ApiError(404, 'Original course not found');

    const newCourse = course.toObject();
    delete newCourse._id;

    newCourse.courseCode = newCourseCode.toUpperCase();
    newCourse.createdBy = req.user._id;

    const created = await Course.create(newCourse);

    res.status(201).json(new ApiResponse(201, created, 'Course duplicated'));
});

/**
 * Get Courses by Department & Semester
 */
const getCoursesByDeptAndSem = asyncHandler(async (req, res) => {
    const { department, semester } = req.params;

    const courses = await Course.find({
        department,
        semester: Number(semester)
    });

    res.status(200).json(new ApiResponse(200, courses, 'Retrieved successfully'));
});

/**
 * Get Import Template
 */
const getImportTemplate = asyncHandler(async (req, res) => {
    const template = "CourseCode,Name,Credits,Semester,Department\n";

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=course_import_template.csv');

    res.send(template);
});

/**
 * Get All Departments
 */
const getDepartments = asyncHandler(async (req, res) => {
    const depts = await Department.find();
    res.status(200).json(new ApiResponse(200, depts));
});

module.exports = {
    getAllCourses,
    getCourseById,
    createCourse,
    updateCourse,
    deleteCourse,
    activateCourse,
    deactivateCourse,
    getCourseStats,
    bulkUpdateCourses,
    importCourses,
    exportCourses,
    duplicateCourse,
    getImportTemplate,
    getCoursesByDeptAndSem,
    getDepartments
};