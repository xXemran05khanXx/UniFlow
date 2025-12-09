# Department System - Quick Reference Guide

## Department Codes

| Code | Name | Description |
|------|------|-------------|
| **IT** | Information Technology | IT department students (Semester 3-8) |
| **CS** | Computer Science | CS department students (Semester 3-8) |
| **FE** | First Year Engineering | Combined department for Semester 1-2 students (IT + CS) |

## API Quick Reference

### Get All Departments
```http
GET /api/departments
GET /api/departments?isActive=true
```

### Get Department by Code
```http
GET /api/departments/code/IT
GET /api/departments/code/CS
GET /api/departments/code/FE
```

### Get Department Statistics
```http
GET /api/departments/:id/stats
```

### Generate Timetable for Department
```http
POST /api/timetable/generate
Content-Type: application/json

{
  "departmentCode": "IT",
  "semester": 5,
  "algorithm": "greedy"
}
```

## Frontend Component Usage

### Import Department Select
```tsx
import { DepartmentSelect } from '@/components/common/DepartmentSelect';
```

### Basic Usage
```tsx
<DepartmentSelect
  value={departmentId}
  onChange={(id, dept) => handleDepartmentChange(id, dept)}
  label="Department"
  required
/>
```

### With All Departments Option
```tsx
<DepartmentSelect
  value={departmentId}
  onChange={(id) => setDepartmentId(id)}
  includeAll={true}
  placeholder="Select a department or all"
/>
```

### Active Departments Only
```tsx
<DepartmentSelect
  activeOnly={true}
  value={departmentId}
  onChange={(id) => setDepartmentId(id)}
/>
```

## Department Service Usage

### Import
```typescript
import { departmentService } from '@/services/departmentService';
```

### Get All Active Departments
```typescript
const departments = await departmentService.getActiveDepartments();
```

### Get Department by Code
```typescript
const itDept = await departmentService.getDepartmentByCode('IT');
```

### Get Department Statistics
```typescript
const stats = await departmentService.getDepartmentStats(departmentId);
console.log(stats.counts.students); // Number of students
```

### Helper Methods
```typescript
// Convert code to name
const name = departmentService.getDepartmentName('IT'); 
// Returns: "Information Technology"

// Convert name to code
const code = departmentService.getDepartmentCode('Computer Science');
// Returns: "CS"

// Extract ID from Department object or string
const id = departmentService.getDepartmentId(department);
```

## Teacher Cross-Department Teaching

### Assign Multiple Departments to Teacher
```javascript
// Backend
teacher.primaryDepartment = itDepartmentId;
teacher.allowedDepartments = [csDepartmentId, feDepartmentId];
await teacher.save();
```

### Check if Teacher Can Teach in Department
```javascript
const canTeach = teacher.canTeachInDepartment(departmentId);
```

## Room Department Assignment

### Assign Room to Department
```javascript
room.department = departmentId;
await room.save();
```

### Filter Rooms by Department
```http
GET /api/rooms?department=<departmentId>
```

## Subject/Course Department Assignment

### Create Subject with Department
```javascript
const subject = await Subject.create({
  code: 'CS301',
  name: 'Data Structures',
  department: csDepartmentId,
  semester: 3,
  credits: 4
});
```

### Filter Subjects by Department
```http
GET /api/subjects?department=<departmentId>
```

## Timetable Generation with Departments

### Generate IT Department Timetable
```javascript
const result = await timetableService.generateTimetable({
  departmentCode: 'IT',
  semester: 5,
  algorithm: 'greedy',
  academicYear: 2024
});
```

### Generate FE Timetable (Semester 1-2)
```javascript
const result = await timetableService.generateTimetable({
  departmentCode: 'FE',
  semester: 1,
  algorithm: 'greedy'
});
// This will use:
// - FE courses only
// - Teachers with primaryDepartment=FE OR allowedDepartments includes FE
// - Rooms assigned to FE department
```

## Migration

### Run Migration Script
```bash
# Navigate to project root
cd backend

# Run migration
node scripts/migrate-departments.js
```

### Expected Output
```
🚀 Starting Department Migration...
============================================================

📦 Seeding departments...
   ✅ Created department: IT - Information Technology
   ✅ Created department: CS - Computer Science
   ✅ Created department: FE - First Year Engineering

👨‍🏫 Migrating Teachers...
   Found 15 teachers to migrate
   ✅ Migrated: 15, Errors: 0

📚 Migrating Courses...
   Found 48 courses to migrate
   ✅ Migrated: 48, Errors: 0

============================================================
📊 Migration Summary:
============================================================
   Departments created: 3
   Teachers migrated: 15
   Courses migrated: 48
   Subjects migrated: 48
   Rooms migrated: 12
============================================================
✅ Migration completed successfully!
```

## Common Patterns

### Get Department Display Name
```typescript
// If department is ObjectId or populated object
const displayName = typeof dept === 'string' 
  ? dept 
  : `${dept.code} - ${dept.name}`;
```

### Filter Data by Department in Frontend
```typescript
const filteredCourses = courses.filter(course => {
  const courseDepId = departmentService.getDepartmentId(course.department);
  return courseDepId === selectedDepartmentId;
});
```

### Handle Legacy and New Format
```typescript
// Component handles both string and Department object
const departmentDisplay = (dept: string | Department) => {
  if (typeof dept === 'string') return dept;
  return `${dept.code} - ${dept.name}`;
};
```

## Validation Rules

1. **Users:**
   - Admin: department optional
   - Teacher: department required (references primaryDepartment in Teacher model)
   - Student: department required

2. **Teachers:**
   - primaryDepartment: required
   - allowedDepartments: optional (for cross-teaching)

3. **Courses/Subjects:**
   - department: required

4. **Rooms:**
   - department: required

5. **Timetable Generation:**
   - Teachers can only be scheduled in departments they're allowed to teach
   - Rooms can only be used for their assigned department
   - Courses are filtered by department

## Troubleshooting

### Issue: Department dropdown is empty
**Solution:** Ensure migration script has been run to seed departments

### Issue: Timetable generation fails with department filter
**Solution:** Verify departmentId or departmentCode is valid

### Issue: Teacher cannot be assigned to course
**Solution:** Check teacher's primaryDepartment and allowedDepartments include course's department

### Issue: Legacy data not migrated
**Solution:** Re-run migration script: `node backend/scripts/migrate-departments.js`

---

**Quick Links:**
- [Full Implementation Guide](./DEPARTMENT_IMPLEMENTATION.md)
- [API Documentation](./API_DOCS.md)
- [Migration Script](./backend/scripts/migrate-departments.js)
