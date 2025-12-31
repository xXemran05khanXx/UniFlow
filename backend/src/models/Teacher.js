const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// 2. Teacher Schema (Refined)
// More detailed information about teachers for better resource management.
const teacherSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    employeeId: {
        type: String,
        required: [true, 'Employee ID is required.'],
        unique: true,
        trim: true,
    },
    name: {
        type: String,
        required: [true, 'Teacher name is required.'],
        trim: true,
    },
    primaryDepartment: {
        type: Schema.Types.ObjectId,
        ref: 'Department',
        required: [true, 'Primary department is required.'],
        index: true,
    },
    allowedDepartments: [{
        type: Schema.Types.ObjectId,
        ref: 'Department',
    }],
    // Legacy field - kept for backward compatibility during migration
    department: {
        type: String,
        enum: ['Computer Science', 'Information Technology', 'First Year'],
    },
    designation: {
        type: String,
        required: true,
        enum: ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer'],
    },
    qualifications: {
        type: [String], // e.g., ['Ph.D. (Computer Engg)', 'M.E. (IT)']
        default: [],
    },
    contactInfo: {
        staffRoom: { type: String, trim: true }
    },
    workload: {
        // Defines the teaching load constraints for the teacher
        maxHoursPerWeek: { type: Number, default: 18 },
        minHoursPerWeek: { type: Number, default: 8 },
    },
    availability: [{ // Teacher's preferred or fixed available slots
        dayOfWeek: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] },
        startTime: String, // Format: HH:MM
        endTime: String,   // Format: HH:MM
    }],
    performanceRating: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
    }
}, { timestamps: true });

// Indexes for performance
teacherSchema.index({ employeeId: 1 });
teacherSchema.index({ user: 1 });
teacherSchema.index({ primaryDepartment: 1 });
teacherSchema.index({ allowedDepartments: 1 });

// Instance method to check if teacher can teach in a specific department
teacherSchema.methods.canTeachInDepartment = function(departmentId) {
    // Convert to string for comparison
    const deptIdStr = departmentId.toString();
    const primaryDeptStr = this.primaryDepartment.toString();
    
    // Check if it's the primary department
    if (primaryDeptStr === deptIdStr) {
        return true;
    }
    
    // Check if it's in allowed departments
    if (this.allowedDepartments && this.allowedDepartments.length > 0) {
        return this.allowedDepartments.some(dept => dept.toString() === deptIdStr);
    }
    
    return false;
};

// Instance method to get all departments this teacher can teach
teacherSchema.methods.getAllowedDepartmentIds = function() {
    const departments = [this.primaryDepartment];
    
    if (this.allowedDepartments && this.allowedDepartments.length > 0) {
        this.allowedDepartments.forEach(dept => {
            if (!departments.some(d => d.toString() === dept.toString())) {
                departments.push(dept);
            }
        });
    }
    
    return departments;
};

module.exports = mongoose.model('Teacher', teacherSchema);
