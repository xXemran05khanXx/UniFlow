const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const xlsx = require('xlsx');

class SyllabusParser {
  constructor() {
    this.supportedFormats = ['.pdf', '.txt', '.xlsx', '.csv'];
    this.templates = {
      course: {
        requiredFields: ['courseCode', 'courseName', 'credits', 'department', 'semester'],
        optionalFields: ['prerequisites', 'description', 'maxStudents', 'sessionType']
      },
      teacher: {
        requiredFields: ['teacherId', 'name', 'department', 'email'],
        optionalFields: ['qualification', 'specialization', 'maxHours', 'preferences']
      },
      room: {
        requiredFields: ['roomNumber', 'building', 'capacity', 'type'],
        optionalFields: ['equipment', 'availability', 'isLab']
      }
    };
  }

  /**
   * Main parsing function that routes to appropriate parser based on file type
   */
  async parseFile(filePath, type = 'auto') {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const fileExtension = path.extname(filePath).toLowerCase();
      
      if (!this.supportedFormats.includes(fileExtension)) {
        throw new Error(`Unsupported file format: ${fileExtension}`);
      }

      let rawData;
      switch (fileExtension) {
        case '.pdf':
          rawData = await this.parsePDF(filePath);
          break;
        case '.txt':
          rawData = await this.parseText(filePath);
          break;
        case '.xlsx':
          rawData = await this.parseExcel(filePath);
          break;
        case '.csv':
          rawData = await this.parseCSV(filePath);
          break;
        default:
          throw new Error(`Parser not implemented for ${fileExtension}`);
      }

      // Auto-detect type if not specified
      if (type === 'auto') {
        type = this.detectDataType(rawData);
      }

      return this.structureData(rawData, type);
    } catch (error) {
      throw new Error(`Parsing failed: ${error.message}`);
    }
  }

  /**
   * Parse PDF files using pdf-parse library
   */
  async parsePDF(filePath) {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdf(dataBuffer);
      
      return {
        text: pdfData.text,
        pages: pdfData.numpages,
        metadata: pdfData.info,
        raw: pdfData
      };
    } catch (error) {
      throw new Error(`PDF parsing error: ${error.message}`);
    }
  }

  /**
   * Parse text files
   */
  async parseText(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return {
        text: content,
        lines: content.split('\n').filter(line => line.trim() !== ''),
        raw: content
      };
    } catch (error) {
      throw new Error(`Text parsing error: ${error.message}`);
    }
  }

  /**
   * Parse Excel files
   */
  async parseExcel(filePath) {
    try {
      const workbook = xlsx.readFile(filePath);
      const data = {};
      
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        data[sheetName] = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
      });
      
      return {
        sheets: data,
        sheetNames: workbook.SheetNames,
        raw: workbook
      };
    } catch (error) {
      throw new Error(`Excel parsing error: ${error.message}`);
    }
  }

  /**
   * Parse CSV files
   */
  async parseCSV(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim() !== '');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });
      
      return {
        headers,
        rows,
        raw: content
      };
    } catch (error) {
      throw new Error(`CSV parsing error: ${error.message}`);
    }
  }

  /**
   * Auto-detect the type of data based on content patterns
   */
  detectDataType(data) {
    const text = data.text || JSON.stringify(data).toLowerCase();
    
    // Course indicators
    const courseKeywords = ['course', 'subject', 'credit', 'semester', 'department'];
    // Teacher indicators
    const teacherKeywords = ['teacher', 'instructor', 'faculty', 'professor', 'qualification'];
    // Room indicators
    const roomKeywords = ['room', 'classroom', 'lab', 'building', 'capacity'];
    
    const courseScore = courseKeywords.reduce((score, keyword) => 
      score + (text.includes(keyword) ? 1 : 0), 0);
    const teacherScore = teacherKeywords.reduce((score, keyword) => 
      score + (text.includes(keyword) ? 1 : 0), 0);
    const roomScore = roomKeywords.reduce((score, keyword) => 
      score + (text.includes(keyword) ? 1 : 0), 0);
    
    if (courseScore >= teacherScore && courseScore >= roomScore) return 'course';
    if (teacherScore >= roomScore) return 'teacher';
    return 'room';
  }

  /**
   * Structure parsed data according to templates
   */
  structureData(rawData, type) {
    try {
      switch (type) {
        case 'course':
          return this.structureCourseData(rawData);
        case 'teacher':
          return this.structureTeacherData(rawData);
        case 'room':
          return this.structureRoomData(rawData);
        default:
          throw new Error(`Unknown data type: ${type}`);
      }
    } catch (error) {
      throw new Error(`Data structuring failed: ${error.message}`);
    }
  }

  /**
   * Structure course data
   */
  structureCourseData(rawData) {
    const courses = [];
    
    if (rawData.rows) {
      // CSV/Excel format
      rawData.rows.forEach(row => {
        const course = this.extractCourseFromRow(row);
        if (course && this.validateCourse(course)) {
          courses.push(course);
        }
      });
    } else if (rawData.text) {
      // PDF/Text format
      courses.push(...this.extractCoursesFromText(rawData.text));
    }
    
    return {
      type: 'course',
      count: courses.length,
      data: courses,
      validation: this.validateCourses(courses)
    };
  }

  /**
   * Structure teacher data
   */
  structureTeacherData(rawData) {
    const teachers = [];
    
    if (rawData.rows) {
      // CSV/Excel format
      rawData.rows.forEach(row => {
        const teacher = this.extractTeacherFromRow(row);
        if (teacher && this.validateTeacher(teacher)) {
          teachers.push(teacher);
        }
      });
    } else if (rawData.text) {
      // PDF/Text format
      teachers.push(...this.extractTeachersFromText(rawData.text));
    }
    
    return {
      type: 'teacher',
      count: teachers.length,
      data: teachers,
      validation: this.validateTeachers(teachers)
    };
  }

  /**
   * Structure room data
   */
  structureRoomData(rawData) {
    const rooms = [];
    
    if (rawData.rows) {
      // CSV/Excel format
      rawData.rows.forEach(row => {
        const room = this.extractRoomFromRow(row);
        if (room && this.validateRoom(room)) {
          rooms.push(room);
        }
      });
    } else if (rawData.text) {
      // PDF/Text format
      rooms.push(...this.extractRoomsFromText(rawData.text));
    }
    
    return {
      type: 'room',
      count: rooms.length,
      data: rooms,
      validation: this.validateRooms(rooms)
    };
  }

  /**
   * Extract course from CSV/Excel row
   */
  extractCourseFromRow(row) {
    return {
      courseCode: row.courseCode || row['Course Code'] || row.code,
      courseName: row.courseName || row['Course Name'] || row.name || row.title,
      credits: parseInt(row.credits || row.Credits || row.credit) || 3,
      department: row.department || row.Department || row.dept,
      semester: row.semester || row.Semester || row.sem,
      prerequisites: this.parseArray(row.prerequisites || row.Prerequisites),
      description: row.description || row.Description,
      maxStudents: parseInt(row.maxStudents || row['Max Students'] || row.capacity) || 50,
      sessionType: row.sessionType || row['Session Type'] || row.type || 'lecture',
      hoursPerWeek: parseInt(row.hoursPerWeek || row['Hours Per Week'] || row.hours) || 3
    };
  }

  /**
   * Extract teacher from CSV/Excel row
   */
  extractTeacherFromRow(row) {
    return {
      teacherId: row.teacherId || row['Teacher ID'] || row.id || row.empId,
      name: row.name || row.Name || row.teacherName || row['Teacher Name'],
      department: row.department || row.Department || row.dept,
      email: row.email || row.Email || row.emailAddress,
      qualification: row.qualification || row.Qualification || row.degree,
      specialization: this.parseArray(row.specialization || row.Specialization),
      maxHours: parseInt(row.maxHours || row['Max Hours'] || row.maxLoad) || 20,
      preferences: this.parseArray(row.preferences || row.Preferences),
      experience: parseInt(row.experience || row.Experience) || 0,
      availability: this.parseAvailability(row.availability || row.Availability)
    };
  }

  /**
   * Extract room from CSV/Excel row
   */
  extractRoomFromRow(row) {
    return {
      roomNumber: row.roomNumber || row['Room Number'] || row.room || row.number,
      building: row.building || row.Building || row.block,
      capacity: parseInt(row.capacity || row.Capacity || row.seats) || 30,
      type: row.type || row.Type || row.roomType || 'classroom',
      equipment: this.parseArray(row.equipment || row.Equipment),
      isLab: this.parseBoolean(row.isLab || row['Is Lab'] || row.lab),
      availability: this.parseAvailability(row.availability || row.Availability),
      floor: parseInt(row.floor || row.Floor) || 1
    };
  }

  /**
   * Extract courses from text content (PDF/TXT)
   */
  extractCoursesFromText(text) {
    const courses = [];
    const lines = text.split('\n');
    
    // Simple pattern matching for course codes (e.g., CS101, MATH201)
    const coursePattern = /([A-Z]{2,4}\s*\d{3,4})\s*[:\-]?\s*(.+?)(?:\s*\((\d+)\s*credits?\))?/gi;
    
    let match;
    while ((match = coursePattern.exec(text)) !== null) {
      courses.push({
        courseCode: match[1].replace(/\s+/g, ''),
        courseName: match[2].trim(),
        credits: parseInt(match[3]) || 3,
        department: this.extractDepartment(match[1]),
        sessionType: 'lecture',
        hoursPerWeek: 3
      });
    }
    
    return courses;
  }

  /**
   * Extract teachers from text content
   */
  extractTeachersFromText(text) {
    const teachers = [];
    const lines = text.split('\n');
    
    // Simple pattern matching for teacher names and details
    const teacherPattern = /(Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/gi;
    
    let match;
    while ((match = teacherPattern.exec(text)) !== null) {
      teachers.push({
        name: match[0].trim(),
        teacherId: this.generateId(match[2]),
        department: 'General',
        email: this.generateEmail(match[2]),
        maxHours: 20
      });
    }
    
    return teachers;
  }

  /**
   * Extract rooms from text content
   */
  extractRoomsFromText(text) {
    const rooms = [];
    
    // Simple pattern matching for room numbers
    const roomPattern = /(?:Room|Lab|Classroom)\s*[:\-]?\s*([A-Z]?\d+[A-Z]?)/gi;
    
    let match;
    while ((match = roomPattern.exec(text)) !== null) {
      rooms.push({
        roomNumber: match[1],
        building: 'Main',
        capacity: 30,
        type: match[0].toLowerCase().includes('lab') ? 'lab' : 'classroom',
        isLab: match[0].toLowerCase().includes('lab')
      });
    }
    
    return rooms;
  }

  /**
   * Validation methods
   */
  validateCourse(course) {
    const required = this.templates.course.requiredFields;
    return required.every(field => course[field] && course[field].toString().trim() !== '');
  }

  validateTeacher(teacher) {
    const required = this.templates.teacher.requiredFields;
    return required.every(field => teacher[field] && teacher[field].toString().trim() !== '');
  }

  validateRoom(room) {
    const required = this.templates.room.requiredFields;
    return required.every(field => room[field] && room[field].toString().trim() !== '');
  }

  validateCourses(courses) {
    const valid = courses.filter(course => this.validateCourse(course));
    const invalid = courses.filter(course => !this.validateCourse(course));
    
    return {
      valid: valid.length,
      invalid: invalid.length,
      total: courses.length,
      validationRate: ((valid.length / courses.length) * 100).toFixed(2) + '%',
      errors: invalid.map(course => ({
        data: course,
        missingFields: this.templates.course.requiredFields.filter(field => 
          !course[field] || course[field].toString().trim() === '')
      }))
    };
  }

  validateTeachers(teachers) {
    const valid = teachers.filter(teacher => this.validateTeacher(teacher));
    const invalid = teachers.filter(teacher => !this.validateTeacher(teacher));
    
    return {
      valid: valid.length,
      invalid: invalid.length,
      total: teachers.length,
      validationRate: ((valid.length / teachers.length) * 100).toFixed(2) + '%',
      errors: invalid.map(teacher => ({
        data: teacher,
        missingFields: this.templates.teacher.requiredFields.filter(field => 
          !teacher[field] || teacher[field].toString().trim() === '')
      }))
    };
  }

  validateRooms(rooms) {
    const valid = rooms.filter(room => this.validateRoom(room));
    const invalid = rooms.filter(room => !this.validateRoom(room));
    
    return {
      valid: valid.length,
      invalid: invalid.length,
      total: rooms.length,
      validationRate: ((valid.length / rooms.length) * 100).toFixed(2) + '%',
      errors: invalid.map(room => ({
        data: room,
        missingFields: this.templates.room.requiredFields.filter(field => 
          !room[field] || room[field].toString().trim() === '')
      }))
    };
  }

  /**
   * Helper methods
   */
  parseArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return value.toString().split(',').map(item => item.trim()).filter(item => item !== '');
  }

  parseBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return ['true', 'yes', '1', 'y'].includes(value.toLowerCase());
    }
    return Boolean(value);
  }

  parseAvailability(value) {
    if (!value) return null;
    if (typeof value === 'object') return value;
    
    // Simple parsing for availability strings
    try {
      return JSON.parse(value);
    } catch {
      return { note: value.toString() };
    }
  }

  extractDepartment(courseCode) {
    const match = courseCode.match(/^([A-Z]+)/);
    return match ? match[1] : 'General';
  }

  generateId(name) {
    return name.toLowerCase().replace(/\s+/g, '') + Math.floor(Math.random() * 1000);
  }

  generateEmail(name) {
    return name.toLowerCase().replace(/\s+/g, '.') + '@university.edu';
  }

  /**
   * Generate template files for users
   */
  generateTemplate(type, filePath) {
    const templates = {
      course: {
        headers: ['courseCode', 'courseName', 'credits', 'department', 'semester', 'prerequisites', 'maxStudents', 'sessionType', 'hoursPerWeek'],
        sample: ['CS101', 'Introduction to Computer Science', '3', 'Computer Science', 'Fall', '', '50', 'lecture', '3']
      },
      teacher: {
        headers: ['teacherId', 'name', 'department', 'email', 'qualification', 'specialization', 'maxHours', 'experience'],
        sample: ['T001', 'Dr. John Smith', 'Computer Science', 'john.smith@university.edu', 'PhD', 'Algorithms,Data Structures', '20', '10']
      },
      room: {
        headers: ['roomNumber', 'building', 'capacity', 'type', 'equipment', 'isLab', 'floor'],
        sample: ['101', 'Science Block', '30', 'classroom', 'Projector,Whiteboard', 'false', '1']
      }
    };

    const template = templates[type];
    if (!template) {
      throw new Error(`Template not available for type: ${type}`);
    }

    const csvContent = [
      template.headers.join(','),
      template.sample.join(',')
    ].join('\n');

    fs.writeFileSync(filePath, csvContent);
    return filePath;
  }
}

module.exports = SyllabusParser;
