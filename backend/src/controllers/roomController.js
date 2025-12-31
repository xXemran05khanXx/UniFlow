/**
 * Room Controller
 * Handles all room-related operations for Mumbai University engineering college
 */

const Room = require('../models/Room');
const Department = require('../models/Department');
const asyncHandler = require('../middleware/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

/**
 * @desc    Get all rooms with filtering, pagination and search
 * @route   GET /api/rooms
 * @access  Private (Admin/Staff)
 */
const getAllRooms = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    building,
    floor,
    type,
    department,
    isActive,
    isAvailable,
    minCapacity,
    maxCapacity,
    hasProjector,
    hasAirConditioning,
    hasSmartBoard,
    hasWifi,
    sortBy = 'roomNumber',
    sortOrder = 'asc'
  } = req.query;

  // Build query object
  const query = {};

  // Text search across multiple fields
  if (search) {
    query.$or = [
      { roomNumber: { $regex: search, $options: 'i' } },
      { name: { $regex: search, $options: 'i' } },
      { building: { $regex: search, $options: 'i' } },
      { department: { $regex: search, $options: 'i' } }
    ];
  }

  // Filter by building
  if (building) {
    query.building = building;
  }

  // Filter by floor
  if (floor) {
    query.floor = parseInt(floor);
  }

  // Filter by type
  if (type) {
    query.type = type;
  }

  // Filter by department
  if (department) {
    query.department = department;
  }

  // Filter by status
  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  // Filter by availability
  if (isAvailable !== undefined) {
    query.isAvailable = isAvailable === 'true';
  }

  // Filter by capacity range
  if (minCapacity || maxCapacity) {
    query.capacity = {};
    if (minCapacity) query.capacity.$gte = parseInt(minCapacity);
    if (maxCapacity) query.capacity.$lte = parseInt(maxCapacity);
  }

  // Filter by features
  if (hasProjector === 'true') query.projector = true;
  if (hasAirConditioning === 'true') query.airConditioning = true;
  if (hasSmartBoard === 'true') query.smartBoard = true;
  if (hasWifi === 'true') query.wifi = true;

  // Calculate pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Build sort object
  const sortObj = {};
  sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;

  try {
    // Execute query with pagination
    const rooms = await Room.find(query)
      .populate('department', 'code name')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get total count for pagination
    const totalRooms = await Room.countDocuments(query);
    const totalPages = Math.ceil(totalRooms / limitNum);

    res.status(200).json(new ApiResponse(
      true,
      'Rooms retrieved successfully',
      {
        rooms,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalRooms,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        }
      },
      200
    ));
  } catch (error) {
    console.error('Error in getAllRooms:', error); // Added logging for debugging
    throw new ApiError(500, 'Error retrieving rooms');
  }
});

/**
 * @desc    Get room by ID
 * @route   GET /api/rooms/:id
 * @access  Private (Admin/Staff)
 */
const getRoomById = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id)
    .populate('department', 'code name')
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email')
    .populate('bookings.userId', 'name email')
    .populate('utilizationHistory.sessions.userId', 'name email');

  if (!room) {
    throw new ApiError(404, 'Room not found');
  }

  res.status(200).json(new ApiResponse(true, 'Room retrieved successfully', room, 200));
});

/**
 * @desc    Create new room
 * @route   POST /api/rooms
 * @access  Private (Admin)
 */
const createRoom = asyncHandler(async (req, res) => {
  console.log('Creating room with data:', req.body);
  console.log('User creating room:', req.user ? { id: req.user._id, email: req.user.email, role: req.user.role } : 'No user');
  
  // Prepare room data
  const roomData = {
    ...req.body,
    createdBy: req.user._id
  };

  // Convert department name/code to ObjectId if needed
  if (roomData.department && !roomData.department.match?.(/^[0-9a-fA-F]{24}$/)) {
    const dept = await Department.findOne({
      $or: [
        { code: roomData.department },
        { name: roomData.department }
      ]
    });
    if (dept) {
      roomData.department = dept._id;
    } else {
      throw new ApiError(400, `Department '${roomData.department}' not found`);
    }
  }

  console.log('Final room data:', roomData);

  // Check if room number already exists
  const existingRoom = await Room.findOne({ 
    roomNumber: roomData.roomNumber.toUpperCase() 
  });

  if (existingRoom) {
    console.log('Room number already exists:', roomData.roomNumber);
    throw new ApiError(400, 'Room number already exists');
  }

  try {
    const room = await Room.create(roomData);
    console.log('✅ Room created successfully:', room._id);
    await room.populate('createdBy', 'name email');

    res.status(201).json(new ApiResponse(true, 'Room created successfully', room, 201));
  } catch (mongoError) {
    console.error('❌ MongoDB error creating room:', mongoError);
    if (mongoError.name === 'ValidationError') {
      const validationErrors = Object.values(mongoError.errors).map(err => err.message);
      throw new ApiError(400, `Validation error: ${validationErrors.join(', ')}`);
    }
    throw new ApiError(500, 'Database error creating room');
  }
});

/**
 * @desc    Update room
 * @route   PUT /api/rooms/:id
 * @access  Private (Admin)
 */
const updateRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);

  if (!room) {
    throw new ApiError(404, 'Room not found');
  }

  // Check if updating room number to one that already exists
  if (req.body.roomNumber && req.body.roomNumber !== room.roomNumber) {
    const existingRoom = await Room.findOne({ 
      roomNumber: req.body.roomNumber.toUpperCase(),
      _id: { $ne: req.params.id }
    });

    if (existingRoom) {
      throw new ApiError(400, 'Room number already exists');
    }
  }

  // Convert department name/code to ObjectId if needed
  if (req.body.department && !req.body.department.match?.(/^[0-9a-fA-F]{24}$/)) {
    const dept = await Department.findOne({
      $or: [
        { code: req.body.department },
        { name: req.body.department }
      ]
    });
    if (dept) {
      req.body.department = dept._id;
    } else {
      throw new ApiError(400, `Department '${req.body.department}' not found`);
    }
  }

  // Update fields
  Object.assign(room, req.body);
  room.updatedBy = req.user._id;

  await room.save();
  await room.populate(['createdBy updatedBy', 'name email']);

  res.status(200).json(new ApiResponse(200, room, 'Room updated successfully'));
});

/**
 * @desc    Delete room
 * @route   DELETE /api/rooms/:id
 * @access  Private (Admin)
 */
const deleteRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);

  if (!room) {
    throw new ApiError(404, 'Room not found');
  }

  // Check if room has active bookings
  const now = new Date();
  const activeBookings = room.bookings.filter(booking => 
    booking.status === 'approved' && booking.endTime > now
  );

  if (activeBookings.length > 0) {
    throw new ApiError(400, 'Cannot delete room with active bookings');
  }

  await Room.findByIdAndDelete(req.params.id);

  res.status(200).json(new ApiResponse(200, null, 'Room deleted successfully'));
});

/**
 * @desc    Toggle room status (active/inactive)
 * @route   PATCH /api/rooms/:id/status
 * @access  Private (Admin)
 */
const toggleRoomStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  
  const room = await Room.findByIdAndUpdate(
    req.params.id,
    { 
      isActive,
      updatedBy: req.user._id 
    },
    { new: true }
  ).populate('createdBy updatedBy', 'name email');

  if (!room) {
    throw new ApiError(404, 'Room not found');
  }

  res.status(200).json(new ApiResponse(
    200, 
    room, 
    `Room ${isActive ? 'activated' : 'deactivated'} successfully`
  ));
});

/**
 * @desc    Toggle room availability
 * @route   PATCH /api/rooms/:id/availability
 * @access  Private (Admin)
 */
const toggleRoomAvailability = asyncHandler(async (req, res) => {
  const { isAvailable } = req.body;
  
  const room = await Room.findByIdAndUpdate(
    req.params.id,
    { 
      isAvailable,
      updatedBy: req.user._id 
    },
    { new: true }
  ).populate('createdBy updatedBy', 'name email');

  if (!room) {
    throw new ApiError(404, 'Room not found');
  }

  res.status(200).json(new ApiResponse(
    200, 
    room, 
    `Room marked as ${isAvailable ? 'available' : 'unavailable'} successfully`
  ));
});

/**
 * @desc    Bulk update rooms
 * @route   PATCH /api/rooms/bulk
 * @access  Private (Admin)
 */
const bulkUpdateRooms = asyncHandler(async (req, res) => {
  const { roomIds, action, data } = req.body;

  if (!roomIds || !Array.isArray(roomIds) || roomIds.length === 0) {
    throw new ApiError(400, 'Room IDs array is required');
  }

  if (!action) {
    throw new ApiError(400, 'Action is required');
  }

  let updateData = { updatedBy: req.user._id };

  switch (action) {
    case 'activate':
      updateData.isActive = true;
      break;
    case 'deactivate':
      updateData.isActive = false;
      break;
    case 'makeAvailable':
      updateData.isAvailable = true;
      break;
    case 'makeUnavailable':
      updateData.isAvailable = false;
      break;
    case 'delete':
      // Check for active bookings before deletion
      const roomsWithBookings = await Room.find({
        _id: { $in: roomIds },
        'bookings.status': 'approved',
        'bookings.endTime': { $gt: new Date() }
      });

      if (roomsWithBookings.length > 0) {
        throw new ApiError(400, 'Cannot delete rooms with active bookings');
      }

      await Room.deleteMany({ _id: { $in: roomIds } });
      return res.status(200).json(new ApiResponse(
        200,
        { deletedCount: roomIds.length },
        'Rooms deleted successfully'
      ));
    default:
      if (data) {
        updateData = { ...updateData, ...data };
      }
  }

  const result = await Room.updateMany(
    { _id: { $in: roomIds } },
    updateData
  );

  res.status(200).json(new ApiResponse(
    200,
    { 
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount 
    },
    'Rooms updated successfully'
  ));
});

/**
 * @desc    Get room statistics
 * @route   GET /api/rooms/stats
 * @access  Private (Admin/Staff)
 */
const getRoomStats = asyncHandler(async (req, res) => {
  try {
    const stats = await Room.getRoomStats();
    
    // Process the aggregation result
    const processedStats = {
      totalRooms: stats[0].totalRooms[0]?.count || 0,
      activeRooms: stats[0].activeRooms[0]?.count || 0,
      availableRooms: stats[0].availableRooms[0]?.count || 0,
      totalCapacity: stats[0].capacityStats[0]?.totalCapacity || 0,
      averageCapacity: stats[0].capacityStats[0]?.averageCapacity || 0,
      maxCapacity: stats[0].capacityStats[0]?.maxCapacity || 0,
      minCapacity: stats[0].capacityStats[0]?.minCapacity || 0,
      typeDistribution: {},
      buildingDistribution: {}
    };

    // Process type distribution
    stats[0].typeDistribution.forEach(item => {
      processedStats.typeDistribution[item._id] = item.count;
    });

    // Process building distribution
    stats[0].buildingDistribution.forEach(item => {
      processedStats.buildingDistribution[item._id] = item.count;
    });

    res.status(200).json(new ApiResponse(
      200,
      processedStats,
      'Room statistics retrieved successfully'
    ));
  } catch (error) {
    throw new ApiError(500, 'Error retrieving room statistics');
  }
});

/**
 * @desc    Find available rooms for a time slot
 * @route   GET /api/rooms/available
 * @access  Private (Admin/Staff)
 */
const findAvailableRooms = asyncHandler(async (req, res) => {
  const { startTime, endTime, capacity, type, features } = req.query;

  if (!startTime || !endTime) {
    throw new ApiError(400, 'Start time and end time are required');
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (start >= end) {
    throw new ApiError(400, 'Start time must be before end time');
  }

  // Build filter object
  const filters = {};
  if (capacity) filters.capacity = { $gte: parseInt(capacity) };
  if (type) filters.type = type;
  if (features) {
    const featureArray = Array.isArray(features) ? features : [features];
    filters.features = { $all: featureArray };
  }

  try {
    const availableRooms = await Room.findAvailableRooms(start, end, filters);

    res.status(200).json(new ApiResponse(
      200,
      availableRooms,
      'Available rooms retrieved successfully'
    ));
  } catch (error) {
    throw new ApiError(500, 'Error finding available rooms');
  }
});

/**
 * @desc    Get room utilization report
 * @route   GET /api/rooms/utilization
 * @access  Private (Admin/Staff)
 */
const getRoomUtilization = asyncHandler(async (req, res) => {
  const { startDate, endDate, roomId } = req.query;

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  try {
    let utilizationData;

    if (roomId) {
      // Get utilization for specific room
      const room = await Room.findById(roomId);
      if (!room) {
        throw new ApiError(404, 'Room not found');
      }

      utilizationData = room.utilizationHistory.filter(
        util => util.date >= start && util.date <= end
      );
    } else {
      // Get utilization report for all rooms
      utilizationData = await Room.getUtilizationReport(start, end);
    }

    res.status(200).json(new ApiResponse(
      200,
      utilizationData,
      'Room utilization data retrieved successfully'
    ));
  } catch (error) {
    throw new ApiError(500, 'Error retrieving utilization data');
  }
});

/**
 * @desc    Schedule room maintenance
 * @route   POST /api/rooms/:id/maintenance
 * @access  Private (Admin)
 */
const scheduleRoomMaintenance = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);

  if (!room) {
    throw new ApiError(404, 'Room not found');
  }

  const maintenanceData = {
    ...req.body,
    createdAt: new Date()
  };

  await room.scheduleMaintenance(maintenanceData);

  res.status(200).json(new ApiResponse(
    200,
    room,
    'Maintenance scheduled successfully'
  ));
});

/**
 * @desc    Get maintenance schedule
 * @route   GET /api/rooms/maintenance/schedule
 * @access  Private (Admin/Staff)
 */
const getMaintenanceSchedule = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const start = startDate ? new Date(startDate) : new Date();
  const end = endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  try {
    const schedule = await Room.getMaintenanceSchedule(start, end);

    res.status(200).json(new ApiResponse(
      200,
      schedule,
      'Maintenance schedule retrieved successfully'
    ));
  } catch (error) {
    throw new ApiError(500, 'Error retrieving maintenance schedule');
  }
});

/**
 * @desc    Import rooms from CSV
 * @route   POST /api/rooms/import
 * @access  Private (Admin)
 */
const importRooms = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'CSV file is required');
  }

  const results = [];
  const errors = [];
  let imported = 0;
  let failed = 0;

  // Read and parse CSV file
  const filePath = req.file.path;

  try {
    const parsePromise = new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    await parsePromise;

    // Process each row
    for (const row of results) {
      try {
        // Validate required fields
        if (!row.roomNumber || !row.name || !row.building || !row.capacity) {
          errors.push({
            row: row,
            error: 'Missing required fields (roomNumber, name, building, capacity)'
          });
          failed++;
          continue;
        }

        // Parse boolean fields
        const roomData = {
          roomNumber: row.roomNumber?.toUpperCase().trim(),
          name: row.name?.trim(),
          building: row.building?.trim(),
          floor: parseInt(row.floor) || 0,
          capacity: parseInt(row.capacity),
          type: row.type?.toLowerCase() || 'classroom',
          department: row.department?.trim() || '',
          airConditioning: row.airConditioning === 'true' || row.airConditioning === '1',
          projector: row.projector === 'true' || row.projector === '1',
          smartBoard: row.smartBoard === 'true' || row.smartBoard === '1',
          wifi: row.wifi === 'true' || row.wifi === '1',
          powerOutlets: parseInt(row.powerOutlets) || 0,
          features: row.features ? row.features.split(',').map(f => f.trim()) : [],
          notes: row.notes?.trim() || '',
          createdBy: req.user._id
        };

        // Convert department name/code to ObjectId if provided
        if (roomData.department && !roomData.department.match?.(/^[0-9a-fA-F]{24}$/)) {
          const dept = await Department.findOne({
            $or: [
              { code: roomData.department },
              { name: roomData.department }
            ]
          });
          if (dept) {
            roomData.department = dept._id;
          } else {
            // Clear invalid department - room can still be created
            roomData.department = undefined;
          }
        }

        // Parse accessibility features
        if (row.wheelchairAccessible || row.elevatorAccess || row.disabledParking || row.accessibleRestroom) {
          roomData.accessibility = {
            wheelchairAccessible: row.wheelchairAccessible === 'true' || row.wheelchairAccessible === '1',
            elevatorAccess: row.elevatorAccess === 'true' || row.elevatorAccess === '1',
            disabledParking: row.disabledParking === 'true' || row.disabledParking === '1',
            accessibleRestroom: row.accessibleRestroom === 'true' || row.accessibleRestroom === '1'
          };
        }

        // Check if room already exists
        const existingRoom = await Room.findOne({ roomNumber: roomData.roomNumber });
        if (existingRoom) {
          errors.push({
            row: row,
            error: 'Room number already exists'
          });
          failed++;
          continue;
        }

        // Create room
        await Room.create(roomData);
        imported++;

      } catch (error) {
        errors.push({
          row: row,
          error: error.message
        });
        failed++;
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.status(200).json(new ApiResponse(
      200,
      {
        imported,
        failed,
        errors: errors.slice(0, 10) // Return first 10 errors
      },
      `Import completed. ${imported} rooms imported, ${failed} failed.`
    ));

  } catch (error) {
    // Clean up uploaded file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    throw new ApiError(500, 'Error processing CSV file');
  }
});

/**
 * @desc    Export rooms to CSV
 * @route   GET /api/rooms/export
 * @access  Private (Admin/Staff)
 */
const exportRooms = asyncHandler(async (req, res) => {
  const { format = 'csv' } = req.query;

  try {
    const rooms = await Room.find({}).lean();

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=rooms.json');
      return res.send(JSON.stringify(rooms, null, 2));
    }

    // CSV format
    const csvHeaders = [
      'roomNumber',
      'name',
      'building',
      'floor',
      'capacity',
      'type',
      'department',
      'airConditioning',
      'projector',
      'smartBoard',
      'wifi',
      'powerOutlets',
      'features',
      'wheelchairAccessible',
      'elevatorAccess',
      'disabledParking',
      'accessibleRestroom',
      'isActive',
      'isAvailable',
      'notes'
    ];

    const csvData = rooms.map(room => [
      room.roomNumber,
      room.name,
      room.building,
      room.floor,
      room.capacity,
      room.type,
      room.department || '',
      room.airConditioning ? 'true' : 'false',
      room.projector ? 'true' : 'false',
      room.smartBoard ? 'true' : 'false',
      room.wifi ? 'true' : 'false',
      room.powerOutlets || 0,
      room.features?.join(', ') || '',
      room.accessibility?.wheelchairAccessible ? 'true' : 'false',
      room.accessibility?.elevatorAccess ? 'true' : 'false',
      room.accessibility?.disabledParking ? 'true' : 'false',
      room.accessibility?.accessibleRestroom ? 'true' : 'false',
      room.isActive ? 'true' : 'false',
      room.isAvailable ? 'true' : 'false',
      room.notes || ''
    ]);

    const csvContent = [csvHeaders, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=rooms.csv');
    res.send(csvContent);

  } catch (error) {
    throw new ApiError(500, 'Error exporting rooms');
  }
});

/**
 * @desc    Get room import template
 * @route   GET /api/rooms/template
 * @access  Private (Admin)
 */
const getRoomTemplate = asyncHandler(async (req, res) => {
  const csvHeaders = [
    'roomNumber',
    'name',
    'building',
    'floor',
    'capacity',
    'type',
    'department',
    'airConditioning',
    'projector',
    'smartBoard',
    'wifi',
    'powerOutlets',
    'features',
    'wheelchairAccessible',
    'elevatorAccess',
    'disabledParking',
    'accessibleRestroom',
    'notes'
  ];

  const sampleData = [
    'A101',
    'Computer Science Lab 1',
    'Computer Science Block',
    '1',
    '30',
    'laboratory',
    'Computer Science',
    'true',
    'true',
    'true',
    'true',
    '10',
    'Computer Lab, Internet Access, Power Outlets',
    'true',
    'true',
    'false',
    'true',
    'Main computer lab for CS department'
  ];

  const csvContent = [csvHeaders, sampleData]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=room_template.csv');
  res.send(csvContent);
});

module.exports = {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  toggleRoomStatus,
  toggleRoomAvailability,
  bulkUpdateRooms,
  getRoomStats,
  findAvailableRooms,
  getRoomUtilization,
  scheduleRoomMaintenance,
  getMaintenanceSchedule,
  importRooms,
  exportRooms,
  getRoomTemplate
};
