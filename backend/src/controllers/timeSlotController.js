/**
 * Time Slot Controller
 * Handles all time slot-related operations for Mumbai University engineering college
 */

const TimeSlot = require('../models/TimeSlot');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../middleware/asyncHandler');
const multer = require('multer');
const csv = require('csv-parser');
const json2csv = require('json2csv').parse;
const fs = require('fs');
const path = require('path');

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new ApiError(400, 'Only CSV files are allowed'), false);
    }
  }
});

/**
 * Get all time slots with filtering and pagination
 * GET /api/time-slots
 */
const getAllTimeSlots = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    type,
    dayType,
    isActive,
    minDuration,
    maxDuration,
    sortBy = 'order',
    sortOrder = 'asc'
  } = req.query;

  // Build filter query
  const filter = {};
  
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }
  
  if (type) filter.type = type;
  if (dayType) filter.dayType = dayType;
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  
  if (minDuration || maxDuration) {
    filter.duration = {};
    if (minDuration) filter.duration.$gte = parseInt(minDuration);
    if (maxDuration) filter.duration.$lte = parseInt(maxDuration);
  }

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  // Execute query with pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const [timeSlots, totalCount] = await Promise.all([
    TimeSlot.find(filter)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit)),
    TimeSlot.countDocuments(filter)
  ]);

  const totalPages = Math.ceil(totalCount / parseInt(limit));

  res.json(new ApiResponse(
    200,
    {
      timeSlots,
      totalPages,
      currentPage: parseInt(page),
      totalSlots: totalCount,
      hasNextPage: parseInt(page) < totalPages,
      hasPrevPage: parseInt(page) > 1
    },
    'Time slots retrieved successfully'
  ));
});

/**
 * Get time slot by ID
 * GET /api/time-slots/:id
 */
const getTimeSlotById = asyncHandler(async (req, res) => {
  const timeSlot = await TimeSlot.findById(req.params.id)
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');

  if (!timeSlot) {
    throw new ApiError(404, 'Time slot not found');
  }

  res.json(new ApiResponse(200, timeSlot, 'Time slot retrieved successfully'));
});

/**
 * Create new time slot
 * POST /api/time-slots
 */
const createTimeSlot = asyncHandler(async (req, res) => {
  const {
    name,
    startTime,
    endTime,
    duration,
    type,
    dayType,
    order,
    isActive = true,
    description,
    preferredFor,
    minimumGap,
    maximumContinuous,
    color
  } = req.body;

  // Validate required fields
  if (!name || !startTime || !endTime || !type || !dayType) {
    throw new ApiError(400, 'Missing required fields');
  }

  // Check for overlapping time slots
  const overlapping = await TimeSlot.findOverlapping(startTime, endTime, dayType);
  if (overlapping.length > 0) {
    throw new ApiError(400, `Time slot overlaps with existing slot: ${overlapping[0].name}`);
  }

  // Get next order if not provided
  const finalOrder = order || await TimeSlot.getNextOrder(dayType);

  const timeSlot = new TimeSlot({
    name,
    startTime,
    endTime,
    duration,
    type,
    dayType,
    order: finalOrder,
    isActive,
    description,
    preferredFor,
    minimumGap,
    maximumContinuous,
    color,
    createdBy: req.user._id
  });

  await timeSlot.save();
  await timeSlot.populate('createdBy', 'name email');

  res.status(201).json(new ApiResponse(201, timeSlot, 'Time slot created successfully'));
});

/**
 * Update time slot
 * PUT /api/time-slots/:id
 */
const updateTimeSlot = asyncHandler(async (req, res) => {
  const timeSlot = await TimeSlot.findById(req.params.id);

  if (!timeSlot) {
    throw new ApiError(404, 'Time slot not found');
  }

  const {
    name,
    startTime,
    endTime,
    duration,
    type,
    dayType,
    order,
    isActive,
    description,
    preferredFor,
    minimumGap,
    maximumContinuous,
    color
  } = req.body;

  // Check for overlapping time slots if time or day changed
  if ((startTime && startTime !== timeSlot.startTime) ||
      (endTime && endTime !== timeSlot.endTime) ||
      (dayType && dayType !== timeSlot.dayType)) {
    
    const checkStartTime = startTime || timeSlot.startTime;
    const checkEndTime = endTime || timeSlot.endTime;
    const checkDayType = dayType || timeSlot.dayType;
    
    const overlapping = await TimeSlot.findOverlapping(
      checkStartTime,
      checkEndTime,
      checkDayType,
      timeSlot._id
    );
    
    if (overlapping.length > 0) {
      throw new ApiError(400, `Time slot overlaps with existing slot: ${overlapping[0].name}`);
    }
  }

  // Update fields
  if (name !== undefined) timeSlot.name = name;
  if (startTime !== undefined) timeSlot.startTime = startTime;
  if (endTime !== undefined) timeSlot.endTime = endTime;
  if (duration !== undefined) timeSlot.duration = duration;
  if (type !== undefined) timeSlot.type = type;
  if (dayType !== undefined) timeSlot.dayType = dayType;
  if (order !== undefined) timeSlot.order = order;
  if (isActive !== undefined) timeSlot.isActive = isActive;
  if (description !== undefined) timeSlot.description = description;
  if (preferredFor !== undefined) timeSlot.preferredFor = preferredFor;
  if (minimumGap !== undefined) timeSlot.minimumGap = minimumGap;
  if (maximumContinuous !== undefined) timeSlot.maximumContinuous = maximumContinuous;
  if (color !== undefined) timeSlot.color = color;
  
  timeSlot.updatedBy = req.user._id;

  await timeSlot.save();
  await timeSlot.populate(['createdBy updatedBy', 'name email']);

  res.json(new ApiResponse(200, timeSlot, 'Time slot updated successfully'));
});

/**
 * Delete time slot
 * DELETE /api/time-slots/:id
 */
const deleteTimeSlot = asyncHandler(async (req, res) => {
  const timeSlot = await TimeSlot.findById(req.params.id);

  if (!timeSlot) {
    throw new ApiError(404, 'Time slot not found');
  }

  await TimeSlot.findByIdAndDelete(req.params.id);

  res.json(new ApiResponse(200, null, 'Time slot deleted successfully'));
});

/**
 * Toggle time slot status
 * PATCH /api/time-slots/:id/status
 */
const toggleTimeSlotStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  
  const timeSlot = await TimeSlot.findByIdAndUpdate(
    req.params.id,
    { 
      isActive,
      updatedBy: req.user._id
    },
    { new: true }
  ).populate('createdBy updatedBy', 'name email');

  if (!timeSlot) {
    throw new ApiError(404, 'Time slot not found');
  }

  res.json(new ApiResponse(200, timeSlot, 'Time slot status updated successfully'));
});

/**
 * Bulk update time slots
 * PATCH /api/time-slots/bulk
 */
const bulkUpdateTimeSlots = asyncHandler(async (req, res) => {
  const { slotIds, action, data } = req.body;

  if (!slotIds || !Array.isArray(slotIds) || slotIds.length === 0) {
    throw new ApiError(400, 'Slot IDs array is required');
  }

  if (!action) {
    throw new ApiError(400, 'Action is required');
  }

  let updateData = { updatedBy: req.user._id };
  let result;

  switch (action) {
    case 'activate':
      updateData.isActive = true;
      result = await TimeSlot.updateMany(
        { _id: { $in: slotIds } },
        updateData
      );
      break;

    case 'deactivate':
      updateData.isActive = false;
      result = await TimeSlot.updateMany(
        { _id: { $in: slotIds } },
        updateData
      );
      break;

    case 'delete':
      result = await TimeSlot.deleteMany({ _id: { $in: slotIds } });
      break;

    case 'updateType':
      if (!data?.type) {
        throw new ApiError(400, 'Type is required for updateType action');
      }
      updateData.type = data.type;
      result = await TimeSlot.updateMany(
        { _id: { $in: slotIds } },
        updateData
      );
      break;

    case 'updateDayType':
      if (!data?.dayType) {
        throw new ApiError(400, 'Day type is required for updateDayType action');
      }
      updateData.dayType = data.dayType;
      result = await TimeSlot.updateMany(
        { _id: { $in: slotIds } },
        updateData
      );
      break;

    default:
      throw new ApiError(400, 'Invalid action');
  }

  res.json(new ApiResponse(200, result, `Bulk ${action} completed successfully`));
});

/**
 * Get time slot statistics
 * GET /api/time-slots/stats
 */
const getTimeSlotStats = asyncHandler(async (req, res) => {
  const stats = await TimeSlot.getStats();
  
  const result = stats[0];
  const formattedStats = {
    totalSlots: result.totalSlots[0]?.count || 0,
    activeSlots: result.activeSlots[0]?.count || 0,
    typeDistribution: {},
    dayTypeDistribution: {},
    averageDuration: result.durationStats[0]?.averageDuration || 0,
    totalDuration: result.durationStats[0]?.totalDuration || 0,
    longestSlot: result.durationStats[0]?.maxDuration || 0,
    shortestSlot: result.durationStats[0]?.minDuration || 0
  };

  // Format distributions
  result.typeDistribution.forEach(item => {
    formattedStats.typeDistribution[item._id] = item.count;
  });

  result.dayTypeDistribution.forEach(item => {
    formattedStats.dayTypeDistribution[item._id] = item.count;
  });

  res.json(new ApiResponse(200, formattedStats, 'Time slot statistics retrieved successfully'));
});

/**
 * Get day schedules
 * GET /api/time-slots/schedules
 */
const getDaySchedules = asyncHandler(async (req, res) => {
  const dayTypes = ['weekday', 'saturday', 'sunday'];
  
  const schedules = await Promise.all(
    dayTypes.map(dayType => TimeSlot.generateSchedule(dayType))
  );

  res.json(new ApiResponse(200, schedules, 'Day schedules retrieved successfully'));
});

/**
 * Validate time slot for conflicts
 * POST /api/time-slots/validate
 */
const validateTimeSlot = asyncHandler(async (req, res) => {
  const { startTime, endTime, dayType, _id } = req.body;

  if (!startTime || !endTime || !dayType) {
    throw new ApiError(400, 'Start time, end time, and day type are required');
  }

  const conflicts = await TimeSlot.validateSlot(req.body);

  res.json(new ApiResponse(200, conflicts, 'Time slot validation completed'));
});

/**
 * Reorder time slots
 * PATCH /api/time-slots/reorder
 */
const reorderTimeSlots = asyncHandler(async (req, res) => {
  const { slotOrders } = req.body;

  if (!slotOrders || !Array.isArray(slotOrders)) {
    throw new ApiError(400, 'Slot orders array is required');
  }

  await TimeSlot.reorderSlots(slotOrders);

  res.json(new ApiResponse(200, null, 'Time slots reordered successfully'));
});

/**
 * Generate default time slots
 * POST /api/time-slots/generate-default
 */
const generateDefaultTimeSlots = asyncHandler(async (req, res) => {
  const {
    lectureStartTime = '09:00',
    lectureEndTime = '17:00',
    lectureDuration = 60,
    breakDuration = 15,
    lunchStartTime = '13:00',
    lunchDuration = 60,
    labDuration = 120,
    dayTypes = ['weekday']
  } = req.body;

  // Validate times
  if (!TimeSlot.validateTimeFormat || lectureStartTime >= lectureEndTime) {
    throw new ApiError(400, 'Invalid time configuration');
  }

  const generatedSlots = await TimeSlot.generateDefaultSlots({
    lectureStartTime,
    lectureEndTime,
    lectureDuration,
    breakDuration,
    lunchStartTime,
    lunchDuration,
    labDuration,
    dayTypes
  }, req.user._id);

  res.json(new ApiResponse(201, generatedSlots, 'Default time slots generated successfully'));
});

/**
 * Import time slots from CSV
 * POST /api/time-slots/import
 */
const importTimeSlots = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'CSV file is required');
  }

  const results = [];
  const errors = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (row) => {
        results.push(row);
      })
      .on('end', async () => {
        let imported = 0;
        let failed = 0;

        for (const row of results) {
          try {
            // Validate required fields
            if (!row.name || !row.startTime || !row.endTime || !row.type || !row.dayType) {
              throw new Error('Missing required fields');
            }

            // Check for overlaps
            const overlapping = await TimeSlot.findOverlapping(
              row.startTime,
              row.endTime,
              row.dayType
            );

            if (overlapping.length > 0) {
              throw new Error(`Overlaps with existing slot: ${overlapping[0].name}`);
            }

            // Get next order
            const order = await TimeSlot.getNextOrder(row.dayType);

            // Create time slot
            const timeSlot = new TimeSlot({
              name: row.name,
              startTime: row.startTime,
              endTime: row.endTime,
              duration: parseInt(row.duration) || TimeSlot.calculateMinutes(row.endTime) - TimeSlot.calculateMinutes(row.startTime),
              type: row.type,
              dayType: row.dayType,
              order: parseInt(row.order) || order,
              isActive: row.isActive !== 'false',
              description: row.description || '',
              createdBy: req.user._id
            });

            await timeSlot.save();
            imported++;
          } catch (error) {
            failed++;
            errors.push({
              row,
              error: error.message
            });
          }
        }

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        resolve(res.json(new ApiResponse(200, {
          imported,
          failed,
          errors
        }, 'Import completed')));
      })
      .on('error', (error) => {
        // Clean up uploaded file
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        reject(new ApiError(500, `Import failed: ${error.message}`));
      });
  });
});

/**
 * Export time slots
 * GET /api/time-slots/export
 */
const exportTimeSlots = asyncHandler(async (req, res) => {
  const { format = 'csv', ...filters } = req.query;

  // Build filter query (same as getAllTimeSlots)
  const filter = {};
  if (filters.search) {
    filter.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { description: { $regex: filters.search, $options: 'i' } }
    ];
  }
  if (filters.type) filter.type = filters.type;
  if (filters.dayType) filter.dayType = filters.dayType;
  if (filters.isActive !== undefined) filter.isActive = filters.isActive === 'true';

  const timeSlots = await TimeSlot.find(filter)
    .populate('createdBy', 'name email')
    .sort({ dayType: 1, order: 1 });

  if (format === 'csv') {
    const fields = [
      'name',
      'startTime',
      'endTime',
      'duration',
      'type',
      'dayType',
      'order',
      'isActive',
      'description'
    ];

    const csv = json2csv(timeSlots, { fields });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=time-slots.csv');
    res.send(csv);
  } else {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=time-slots.json');
    res.json(timeSlots);
  }
});

/**
 * Get time slot template
 * GET /api/time-slots/template
 */
const getTimeSlotTemplate = asyncHandler(async (req, res) => {
  const template = [
    {
      name: 'Period 1',
      startTime: '09:00',
      endTime: '10:00',
      duration: 60,
      type: 'lecture',
      dayType: 'weekday',
      order: 1,
      isActive: true,
      description: 'First period of the day'
    },
    {
      name: 'Break 1',
      startTime: '10:00',
      endTime: '10:15',
      duration: 15,
      type: 'break',
      dayType: 'weekday',
      order: 2,
      isActive: true,
      description: 'Morning break'
    }
  ];

  const fields = [
    'name',
    'startTime',
    'endTime',
    'duration',
    'type',
    'dayType',
    'order',
    'isActive',
    'description'
  ];

  const csv = json2csv(template, { fields });
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=time_slot_template.csv');
  res.send(csv);
});

/**
 * Get time slots by day type
 * GET /api/time-slots/by-day-type/:dayType
 */
const getTimeSlotsByDayType = asyncHandler(async (req, res) => {
  const { dayType } = req.params;
  const { activeOnly = 'true' } = req.query;

  const timeSlots = await TimeSlot.findByDayType(dayType, activeOnly === 'true');

  res.json(new ApiResponse(200, timeSlots, 'Time slots retrieved successfully'));
});

/**
 * Check time slot availability
 * GET /api/time-slots/check-availability
 */
const checkAvailability = asyncHandler(async (req, res) => {
  const { startTime, endTime, dayType, excludeSlotId } = req.query;

  if (!startTime || !endTime || !dayType) {
    throw new ApiError(400, 'Start time, end time, and day type are required');
  }

  const conflicts = await TimeSlot.findOverlapping(startTime, endTime, dayType, excludeSlotId);

  res.json(new ApiResponse(200, {
    available: conflicts.length === 0,
    conflicts: conflicts.map(slot => ({
      slot1: { startTime, endTime, dayType },
      slot2: slot,
      conflictType: 'overlap',
      dayType: slot.dayType
    }))
  }, 'Availability check completed'));
});

/**
 * Get optimal time slots
 * GET /api/time-slots/optimal
 */
const getOptimalTimeSlots = asyncHandler(async (req, res) => {
  const { duration, type, dayType } = req.query;

  if (!duration || !type || !dayType) {
    throw new ApiError(400, 'Duration, type, and day type are required');
  }

  const optimalSlots = await TimeSlot.findOptimal(
    parseInt(duration),
    type,
    dayType
  );

  res.json(new ApiResponse(200, optimalSlots, 'Optimal time slots retrieved successfully'));
});

/**
 * Copy time slots from one day type to another
 * POST /api/time-slots/copy
 */
const copyTimeSlots = asyncHandler(async (req, res) => {
  const {
    fromDayType,
    toDayType,
    includeBreaks = true,
    includeLunch = true,
    adjustTiming = false,
    timingAdjustment = 0
  } = req.body;

  if (!fromDayType || !toDayType) {
    throw new ApiError(400, 'Source and target day types are required');
  }

  // Get source slots
  const sourceSlots = await TimeSlot.findByDayType(fromDayType, true);

  // Filter slots based on options
  const filteredSlots = sourceSlots.filter(slot => {
    if (!includeBreaks && slot.type === 'break') return false;
    if (!includeLunch && slot.type === 'lunch') return false;
    return true;
  });

  // Create new slots for target day type
  const newSlots = [];
  
  for (const slot of filteredSlots) {
    let startTime = slot.startTime;
    let endTime = slot.endTime;
    
    // Adjust timing if requested
    if (adjustTiming && timingAdjustment !== 0) {
      const startMinutes = TimeSlot.calculateMinutes(startTime) + timingAdjustment;
      const endMinutes = TimeSlot.calculateMinutes(endTime) + timingAdjustment;
      
      startTime = TimeSlot.minutesToTime(Math.max(0, startMinutes));
      endTime = TimeSlot.minutesToTime(Math.max(0, endMinutes));
    }

    // Check for overlaps in target day type
    const overlapping = await TimeSlot.findOverlapping(startTime, endTime, toDayType);
    if (overlapping.length > 0) {
      continue; // Skip this slot if it overlaps
    }

    const newSlot = new TimeSlot({
      name: slot.name,
      startTime,
      endTime,
      duration: slot.duration,
      type: slot.type,
      dayType: toDayType,
      order: slot.order,
      isActive: slot.isActive,
      description: slot.description,
      preferredFor: slot.preferredFor,
      minimumGap: slot.minimumGap,
      maximumContinuous: slot.maximumContinuous,
      color: slot.color,
      createdBy: req.user._id
    });

    await newSlot.save();
    newSlots.push(newSlot);
  }

  res.json(new ApiResponse(201, newSlots, `${newSlots.length} time slots copied successfully`));
});

/**
 * Get next available order
 * GET /api/time-slots/next-order/:dayType
 */
const getNextOrder = asyncHandler(async (req, res) => {
  const { dayType } = req.params;
  const nextOrder = await TimeSlot.getNextOrder(dayType);

  res.json(new ApiResponse(200, { nextOrder }, 'Next order retrieved successfully'));
});

module.exports = {
  getAllTimeSlots,
  getTimeSlotById,
  createTimeSlot,
  updateTimeSlot,
  deleteTimeSlot,
  toggleTimeSlotStatus,
  bulkUpdateTimeSlots,
  getTimeSlotStats,
  getDaySchedules,
  validateTimeSlot,
  reorderTimeSlots,
  generateDefaultTimeSlots,
  importTimeSlots: upload.single('file'),
  exportTimeSlots,
  getTimeSlotTemplate,
  getTimeSlotsByDayType,
  checkAvailability,
  getOptimalTimeSlots,
  copyTimeSlots,
  getNextOrder,
  
  // Export upload middleware for use in routes
  uploadMiddleware: upload.single('file')
};
