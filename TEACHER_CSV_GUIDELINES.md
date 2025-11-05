# Teacher CSV Upload Guidelines

## CSV Template Format

The teacher CSV file should contain the following columns in this exact order:

```csv
name,email,department,employeeId,designation,qualifications,staffRoom,maxHoursPerWeek,minHoursPerWeek
```

## Field Descriptions

### Required Fields
- **name**: Full name of the teacher (e.g., "Dr. Rajesh Kumar")
- **email**: Unique email address (e.g., "rajesh.kumar@university.edu")
- **department**: Must be one of:
  - Computer
  - IT
  - EXTC
  - Mechanical
  - Civil
  - AI & DS
  - First Year
- **employeeId**: Unique employee identifier (e.g., "CS001")

### Optional Fields
- **designation**: Teacher's position (default: "Assistant Professor")
  - Professor
  - Associate Professor
  - Assistant Professor
- **qualifications**: Comma-separated list in quotes (e.g., "PhD Computer Science, MTech Software Engineering")
- **staffRoom**: Room assignment (e.g., "Room 101")
- **maxHoursPerWeek**: Maximum teaching hours (default: 18)
- **minHoursPerWeek**: Minimum teaching hours (default: 8)

## Sample Data

```csv
name,email,department,employeeId,designation,qualifications,staffRoom,maxHoursPerWeek,minHoursPerWeek
Dr. Rajesh Kumar,rajesh.kumar@university.edu,Computer,CS001,Professor,"PhD Computer Science, MTech Software Engineering",Room 101,18,8
Prof. Priya Sharma,priya.sharma@university.edu,IT,IT002,Associate Professor,"MSc Information Technology, BTech IT",Room 102,20,10
Dr. Amit Patel,amit.patel@university.edu,EXTC,EX003,Assistant Professor,"PhD Electronics & Communication, BE Electronics",Room 201,16,8
Prof. Sunita Verma,sunita.verma@university.edu,Mechanical,ME004,Associate Professor,"MTech Mechanical Engineering, BE Mechanical",Room 202,18,10
Dr. Vikram Singh,vikram.singh@university.edu,Civil,CE005,Professor,"PhD Civil Engineering, MTech Structural Engineering",Room 301,20,12
Ms. Kavya Reddy,kavya.reddy@university.edu,AI & DS,AI006,Assistant Professor,"MSc Data Science, BTech Computer Science",Room 401,16,8
Prof. Ramesh Gupta,ramesh.gupta@university.edu,First Year,FY007,Associate Professor,"MSc Mathematics, BSc Mathematics",Room 501,22,14
```

## Important Notes

1. **Email Uniqueness**: Each teacher must have a unique email address
2. **Employee ID**: Must be unique across all teachers
3. **Department Validation**: Use exact department names as listed above
4. **Qualifications Format**: Use quotes to wrap multiple qualifications separated by commas
5. **File Format**: Save as UTF-8 CSV format
6. **Headers**: Include the header row exactly as shown in the template

## Common Issues

- **Missing Required Fields**: Ensure name, email, department, and employeeId are provided
- **Invalid Department**: Use only the specified department names
- **Duplicate IDs**: Employee IDs and emails must be unique
- **Format Errors**: Check for proper CSV formatting and encoding

## Download Template

Use the "Download Template" button in the Data Management page to get the latest CSV template with sample data.