const TimeSlot = require('../models/TimeSlot');
const { validationResult } = require('express-validator');

// Get all time slots
const getAllTimeSlots = async (req, res) => {
  try {
    const { day, active } = req.query;
    let query = {};

    // Filter by day if specified
    if (day !== undefined && day !== 'all') {
      query.dayOfWeek = parseInt(day);
    }

    // Filter by active status if specified
    if (active !== undefined && active !== 'all') {
      query.isActive = active === 'true';
    }

    const timeSlots = await TimeSlot.find(query).sort({ dayOfWeek: 1, startTime: 1 });

    res.status(200).json({
      success: true,
      data: timeSlots,
      message: 'Time slots retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching time slots:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch time slots',
      details: error.message
    });
  }
};

// Get time slot by ID
const getTimeSlotById = async (req, res) => {
  try {
    const { id } = req.params;
    const timeSlot = await TimeSlot.findById(id);

    if (!timeSlot) {
      return res.status(404).json({
        success: false,
        error: 'Time slot not found'
      });
    }

    res.status(200).json({
      success: true,
      data: timeSlot,
      message: 'Time slot retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching time slot:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch time slot',
      details: error.message
    });
  }
};

// Get time slots by day
const getTimeSlotsByDay = async (req, res) => {
  try {
    const { day } = req.params;
    const dayOfWeek = parseInt(day);

    if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      return res.status(400).json({
        success: false,
        error: 'Invalid day of week. Must be 0-6 (0=Sunday, 6=Saturday)'
      });
    }

    const timeSlots = await TimeSlot.getByDay(dayOfWeek);

    res.status(200).json({
      success: true,
      data: timeSlots,
      message: `Time slots for day ${dayOfWeek} retrieved successfully`
    });
  } catch (error) {
    console.error('Error fetching time slots by day:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch time slots',
      details: error.message
    });
  }
};

// Create new time slot
const createTimeSlot = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { startTime, endTime, dayOfWeek, isActive = true } = req.body;

    // Check for overlapping time slots
    const existingTimeSlots = await TimeSlot.find({ dayOfWeek, isActive: true });
    const newTimeSlot = { startTime, endTime, dayOfWeek, isActive };

    for (const existing of existingTimeSlots) {
      if (existing.overlapsWith(newTimeSlot)) {
        return res.status(400).json({
          success: false,
          error: 'Time slot overlaps with existing time slot',
          conflictingSlot: {
            id: existing._id,
            startTime: existing.startTime,
            endTime: existing.endTime
          }
        });
      }
    }

    const timeSlot = new TimeSlot({
      startTime,
      endTime,
      dayOfWeek,
      isActive
    });

    await timeSlot.save();

    res.status(201).json({
      success: true,
      data: timeSlot,
      message: 'Time slot created successfully'
    });
  } catch (error) {
    console.error('Error creating time slot:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Time slot with same day and time already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create time slot'
    });
  }
};

// Update time slot
const updateTimeSlot = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { startTime, endTime, dayOfWeek, isActive } = req.body;

    const timeSlot = await TimeSlot.findById(id);
    if (!timeSlot) {
      return res.status(404).json({
        success: false,
        error: 'Time slot not found'
      });
    }

    // Check for overlapping time slots (excluding current one)
    if (startTime && endTime && dayOfWeek !== undefined) {
      const existingTimeSlots = await TimeSlot.find({ 
        dayOfWeek, 
        isActive: true,
        _id: { $ne: id }
      });

      const updatedTimeSlot = { 
        startTime: startTime || timeSlot.startTime, 
        endTime: endTime || timeSlot.endTime, 
        dayOfWeek: dayOfWeek !== undefined ? dayOfWeek : timeSlot.dayOfWeek
      };

      for (const existing of existingTimeSlots) {
        if (existing.overlapsWith(updatedTimeSlot)) {
          return res.status(400).json({
            success: false,
            error: 'Updated time slot would overlap with existing time slot',
            conflictingSlot: {
              id: existing._id,
              startTime: existing.startTime,
              endTime: existing.endTime
            }
          });
        }
      }
    }

    // Update fields
    if (startTime) timeSlot.startTime = startTime;
    if (endTime) timeSlot.endTime = endTime;
    if (dayOfWeek !== undefined) timeSlot.dayOfWeek = dayOfWeek;
    if (isActive !== undefined) timeSlot.isActive = isActive;

    await timeSlot.save();

    res.status(200).json({
      success: true,
      data: timeSlot,
      message: 'Time slot updated successfully'
    });
  } catch (error) {
    console.error('Error updating time slot:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Time slot with same day and time already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update time slot'
    });
  }
};

// Delete time slot
const deleteTimeSlot = async (req, res) => {
  try {
    const { id } = req.params;

    const timeSlot = await TimeSlot.findById(id);
    if (!timeSlot) {
      return res.status(404).json({
        success: false,
        error: 'Time slot not found'
      });
    }

    // TODO: Check if time slot is being used in any timetables before deletion
    // This would require checking the Timetable model for references

    await TimeSlot.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Time slot deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting time slot:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete time slot',
      details: error.message
    });
  }
};

// Bulk create time slots (useful for initial setup)
const bulkCreateTimeSlots = async (req, res) => {
  try {
    const { timeSlots } = req.body;

    if (!Array.isArray(timeSlots) || timeSlots.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'timeSlots must be a non-empty array'
      });
    }

    const createdSlots = [];
    const errors = [];

    for (let i = 0; i < timeSlots.length; i++) {
      try {
        const slot = new TimeSlot(timeSlots[i]);
        await slot.save();
        createdSlots.push(slot);
      } catch (error) {
        errors.push({
          index: i,
          data: timeSlots[i],
          error: error.message
        });
      }
    }

    res.status(201).json({
      success: true,
      data: {
        created: createdSlots,
        errors: errors
      },
      message: `${createdSlots.length} time slots created successfully${errors.length > 0 ? `, ${errors.length} failed` : ''}`
    });
  } catch (error) {
    console.error('Error bulk creating time slots:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk create time slots',
      details: error.message
    });
  }
};

// Toggle time slot active status
const toggleTimeSlotStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const timeSlot = await TimeSlot.findById(id);
    if (!timeSlot) {
      return res.status(404).json({
        success: false,
        error: 'Time slot not found'
      });
    }

    timeSlot.isActive = !timeSlot.isActive;
    await timeSlot.save();

    res.status(200).json({
      success: true,
      data: timeSlot,
      message: `Time slot ${timeSlot.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Error toggling time slot status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle time slot status',
      details: error.message
    });
  }
};

module.exports = {
  getAllTimeSlots,
  getTimeSlotById,
  getTimeSlotsByDay,
  createTimeSlot,
  updateTimeSlot,
  deleteTimeSlot,
  bulkCreateTimeSlots,
  toggleTimeSlotStatus
};
