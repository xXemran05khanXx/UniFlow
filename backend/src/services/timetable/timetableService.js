const SyllabusParser = require('../syllabus/pdfParser');
const SchedulingAlgorithm = require('./schedulingAlgorithm');
const ClashDetector = require('./clashDetector');
const fs = require('fs').promises;
const path = require('path');

class TimetableService {
  constructor() {
    this.syllabusParser = new SyllabusParser();
    this.clashDetector = new ClashDetector();
    this.algorithms = {
      greedy: SchedulingAlgorithm,
      genetic: SchedulingAlgorithm,
      constraint_satisfaction: SchedulingAlgorithm
    };
    
    this.jobQueue = [];
    this.activeJobs = new Map();
    this.jobHistory = [];
  }

  /**
   * Generate timetable from parsed data
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generation result
   */
  async generateTimetable(options = {}) {
    const jobId = this.generateJobId();
    
    try {
      // Create job entry
      const job = {
        id: jobId,
        status: 'initializing',
        progress: 0,
        startTime: new Date(),
        options: options,
        result: null,
        error: null
      };
      
      this.activeJobs.set(jobId, job);
      
      // Update progress
      this.updateJobProgress(jobId, 10, 'Validating input data...');
      
      // Validate and prepare input
      const inputData = await this.prepareInputData(options);
      
      this.updateJobProgress(jobId, 20, 'Selecting algorithm...');
      
      // Create algorithm instance
      const algorithmOptions = {
        algorithm: options.algorithm || 'greedy',
        maxIterations: options.maxIterations || 1000,
        timeSlotDuration: options.timeSlotDuration || 60,
        workingDays: options.workingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        workingHours: options.workingHours || { start: '08:00', end: '18:00' },
        ...options.algorithmOptions
      };
      
      const algorithm = new SchedulingAlgorithm(algorithmOptions);
      
      this.updateJobProgress(jobId, 30, 'Starting timetable generation...');
      
      // Generate timetable
      const result = await algorithm.generateTimetable(inputData);
      
      this.updateJobProgress(jobId, 80, 'Validating generated timetable...');
      
      // Additional validation and optimization
      const validatedResult = await this.postProcessResult(result, options);
      
      this.updateJobProgress(jobId, 90, 'Saving timetable...');
      
      // Save result if requested
      if (options.saveTimetable) {
        await this.saveTimetable(validatedResult, options);
      }
      
      this.updateJobProgress(jobId, 100, 'Timetable generation completed');
      
      // Update job with final result
      job.status = 'completed';
      job.endTime = new Date();
      job.result = validatedResult;
      job.executionTime = job.endTime - job.startTime;
      
      // Move to history
      this.jobHistory.push({ ...job });
      this.activeJobs.delete(jobId);
      
      return {
        success: true,
        jobId: jobId,
        ...validatedResult
      };
      
    } catch (error) {
      console.error('Timetable generation failed:', error);
      
      // Update job with error
      const job = this.activeJobs.get(jobId);
      if (job) {
        job.status = 'failed';
        job.error = error.message;
        job.endTime = new Date();
        job.executionTime = job.endTime - job.startTime;
        
        this.jobHistory.push({ ...job });
        this.activeJobs.delete(jobId);
      }
      
      return {
        success: false,
        jobId: jobId,
        error: error.message
      };
    }
  }

  /**
   * Parse syllabus files and extract course data
   */
  async parseSyllabusFiles(files, options = {}) {
    const results = {
      courses: [],
      teachers: [],
      rooms: [],
      errors: [],
      summary: {
        totalFiles: files.length,
        successful: 0,
        failed: 0
      }
    };
    
    for (const file of files) {
      try {
        const filePath = file.path || file.filepath;
        const fileType = file.type || options.defaultType || 'auto';
        
        console.log(`Parsing file: ${filePath}`);
        
        const parsedData = await this.syllabusParser.parseFile(filePath, fileType);
        
        // Merge results based on data type
        switch (parsedData.type) {
          case 'course':
            results.courses.push(...parsedData.data);
            break;
          case 'teacher':
            results.teachers.push(...parsedData.data);
            break;
          case 'room':
            results.rooms.push(...parsedData.data);
            break;
          default:
            // Try to categorize automatically
            if (parsedData.data.some(item => item.courseCode)) {
              results.courses.push(...parsedData.data);
            } else if (parsedData.data.some(item => item.teacherId)) {
              results.teachers.push(...parsedData.data);
            } else if (parsedData.data.some(item => item.roomNumber)) {
              results.rooms.push(...parsedData.data);
            }
        }
        
        results.summary.successful++;
        
      } catch (error) {
        console.error(`Failed to parse file ${file.path}:`, error);
        results.errors.push({
          file: file.path,
          error: error.message
        });
        results.summary.failed++;
      }
    }
    
    // Remove duplicates
    results.courses = this.removeDuplicates(results.courses, 'courseCode');
    results.teachers = this.removeDuplicates(results.teachers, 'teacherId');
    results.rooms = this.removeDuplicates(results.rooms, 'roomNumber');
    
    return results;
  }

  /**
   * Validate existing timetable for conflicts
   */
  async validateTimetable(timetableData) {
    try {
      const schedule = Array.isArray(timetableData) ? timetableData : timetableData.schedule;
      
      if (!schedule || !Array.isArray(schedule)) {
        throw new Error('Invalid timetable data format');
      }
      
      const conflicts = this.clashDetector.detectClashes(schedule);
      
      return {
        success: true,
        isValid: conflicts.summary.critical === 0 && conflicts.summary.high === 0,
        conflicts: conflicts,
        recommendations: this.generateValidationRecommendations(conflicts)
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Optimize existing timetable
   */
  async optimizeTimetable(timetableData, options = {}) {
    try {
      const schedule = Array.isArray(timetableData) ? timetableData : timetableData.schedule;
      
      // Detect current conflicts
      const currentConflicts = this.clashDetector.detectClashes(schedule);
      
      if (currentConflicts.summary.total === 0) {
        return {
          success: true,
          message: 'Timetable is already optimized',
          originalSchedule: schedule,
          optimizedSchedule: schedule,
          improvements: []
        };
      }
      
      // Apply optimization strategies
      const optimizedSchedule = await this.applyOptimizations(schedule, currentConflicts, options);
      
      // Validate optimized schedule
      const newConflicts = this.clashDetector.detectClashes(optimizedSchedule);
      
      return {
        success: true,
        originalSchedule: schedule,
        optimizedSchedule: optimizedSchedule,
        originalConflicts: currentConflicts.summary,
        newConflicts: newConflicts.summary,
        improvements: this.calculateImprovements(currentConflicts, newConflicts),
        optimizationStrategy: options.strategy || 'conflict_resolution'
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get job status
   */
  getJobStatus(jobId) {
    const activeJob = this.activeJobs.get(jobId);
    if (activeJob) {
      return {
        found: true,
        ...activeJob
      };
    }
    
    const historicalJob = this.jobHistory.find(job => job.id === jobId);
    if (historicalJob) {
      return {
        found: true,
        ...historicalJob
      };
    }
    
    return {
      found: false,
      message: 'Job not found'
    };
  }

  /**
   * Cancel active job
   */
  cancelJob(jobId) {
    const job = this.activeJobs.get(jobId);
    if (job) {
      job.status = 'cancelled';
      job.endTime = new Date();
      job.executionTime = job.endTime - job.startTime;
      
      this.jobHistory.push({ ...job });
      this.activeJobs.delete(jobId);
      
      return { success: true, message: 'Job cancelled successfully' };
    }
    
    return { success: false, message: 'Job not found or not active' };
  }

  /**
   * Generate template files for data input
   */
  async generateTemplates(outputDir, types = ['course', 'teacher', 'room']) {
    const results = {};
    
    for (const type of types) {
      try {
        const fileName = `${type}_template.csv`;
        const filePath = path.join(outputDir, fileName);
        
        const templatePath = this.syllabusParser.generateTemplate(type, filePath);
        results[type] = {
          success: true,
          path: templatePath,
          fileName: fileName
        };
        
      } catch (error) {
        results[type] = {
          success: false,
          error: error.message
        };
      }
    }
    
    return results;
  }

  /**
   * Helper Methods
   */
  
  generateJobId() {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  updateJobProgress(jobId, progress, message) {
    const job = this.activeJobs.get(jobId);
    if (job) {
      job.progress = progress;
      job.currentStep = message;
      job.lastUpdate = new Date();
    }
  }
  
  async prepareInputData(options) {
    let inputData = {
      courses: [],
      teachers: [],
      rooms: []
    };
    
    // If files are provided, parse them
    if (options.files && options.files.length > 0) {
      const parsedData = await this.parseSyllabusFiles(options.files, options.parseOptions);
      inputData = {
        courses: parsedData.courses,
        teachers: parsedData.teachers,
        rooms: parsedData.rooms
      };
    }
    
    // If direct data is provided, use it
    if (options.courses) inputData.courses = options.courses;
    if (options.teachers) inputData.teachers = options.teachers;
    if (options.rooms) inputData.rooms = options.rooms;
    
    // If database models are provided, fetch from database
    if (options.useDatabase) {
      inputData = await this.fetchFromDatabase(options.dbOptions);
    }
    
    // Validate input data
    if (inputData.courses.length === 0) {
      throw new Error('No courses data provided');
    }
    if (inputData.teachers.length === 0) {
      throw new Error('No teachers data provided');
    }
    if (inputData.rooms.length === 0) {
      throw new Error('No rooms data provided');
    }
    
    return inputData;
  }
  
  async postProcessResult(result, options) {
    if (!result.success) {
      return result;
    }
    
    // Apply post-processing rules
    if (options.postProcessing) {
      result.schedule = await this.applyPostProcessingRules(result.schedule, options.postProcessing);
    }
    
    // Add additional metadata
    result.metadata = {
      ...result.metadata,
      generationOptions: options,
      qualityScore: this.calculateQualityScore(result),
      recommendations: this.generateQualityRecommendations(result)
    };
    
    return result;
  }
  
  async saveTimetable(result, options) {
    if (!options.savePath) {
      return;
    }
    
    const saveData = {
      timetable: result,
      generatedAt: new Date().toISOString(),
      options: options
    };
    
    await fs.writeFile(
      options.savePath,
      JSON.stringify(saveData, null, 2),
      'utf8'
    );
  }
  
  removeDuplicates(array, keyField) {
    const seen = new Set();
    return array.filter(item => {
      const key = item[keyField];
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
  
  generateValidationRecommendations(conflicts) {
    const recommendations = [];
    
    if (conflicts.summary.critical > 0) {
      recommendations.push({
        priority: 'critical',
        action: 'Resolve critical conflicts immediately',
        description: 'Critical conflicts prevent the timetable from functioning properly'
      });
    }
    
    if (conflicts.summary.high > 0) {
      recommendations.push({
        priority: 'high',
        action: 'Address high-priority conflicts',
        description: 'High-priority conflicts may cause significant issues'
      });
    }
    
    // Add specific recommendations based on conflict types
    conflicts.conflicts.forEach(conflict => {
      switch (conflict.type) {
        case 'teacher_conflict':
          recommendations.push({
            priority: 'high',
            action: 'Reschedule conflicting teacher assignments',
            description: conflict.description
          });
          break;
        case 'room_conflict':
          recommendations.push({
            priority: 'high',
            action: 'Resolve room booking conflicts',
            description: conflict.description
          });
          break;
        case 'capacity_conflict':
          recommendations.push({
            priority: 'medium',
            action: 'Address capacity issues',
            description: conflict.description
          });
          break;
      }
    });
    
    return recommendations;
  }
  
  async applyOptimizations(schedule, conflicts, options) {
    let optimizedSchedule = [...schedule];
    
    // Apply different optimization strategies
    switch (options.strategy) {
      case 'conflict_resolution':
        optimizedSchedule = await this.resolveConflicts(optimizedSchedule, conflicts);
        break;
      case 'teacher_preference':
        optimizedSchedule = await this.optimizeTeacherPreferences(optimizedSchedule);
        break;
      case 'room_utilization':
        optimizedSchedule = await this.optimizeRoomUtilization(optimizedSchedule);
        break;
      default:
        optimizedSchedule = await this.generalOptimization(optimizedSchedule, conflicts);
    }
    
    return optimizedSchedule;
  }
  
  async resolveConflicts(schedule, conflicts) {
    // Implementation for conflict resolution
    // This would involve rescheduling conflicting entries
    return schedule;
  }
  
  async optimizeTeacherPreferences(schedule) {
    // Implementation for teacher preference optimization
    return schedule;
  }
  
  async optimizeRoomUtilization(schedule) {
    // Implementation for room utilization optimization
    return schedule;
  }
  
  async generalOptimization(schedule, conflicts) {
    // Implementation for general optimization
    return schedule;
  }
  
  calculateImprovements(originalConflicts, newConflicts) {
    return {
      conflictsReduced: originalConflicts.total - newConflicts.total,
      criticalReduced: originalConflicts.critical - newConflicts.critical,
      highReduced: originalConflicts.high - newConflicts.high,
      mediumReduced: originalConflicts.medium - newConflicts.medium,
      lowReduced: originalConflicts.low - newConflicts.low
    };
  }
  
  calculateQualityScore(result) {
    let score = 100;
    
    // Deduct points for conflicts
    if (result.conflicts) {
      score -= result.conflicts.summary.critical * 20;
      score -= result.conflicts.summary.high * 10;
      score -= result.conflicts.summary.medium * 5;
      score -= result.conflicts.summary.low * 1;
    }
    
    // Add points for good utilization
    if (result.statistics) {
      const avgUtilization = (
        parseFloat(result.statistics.utilizationRate.teachers) +
        parseFloat(result.statistics.utilizationRate.rooms)
      ) / 2;
      
      if (avgUtilization > 80) score += 10;
      else if (avgUtilization > 60) score += 5;
    }
    
    return Math.max(0, score);
  }
  
  generateQualityRecommendations(result) {
    const recommendations = [];
    
    if (result.conflicts && result.conflicts.summary.total > 0) {
      recommendations.push('Consider resolving conflicts to improve timetable quality');
    }
    
    if (result.statistics) {
      const teacherUtilization = parseFloat(result.statistics.utilizationRate.teachers);
      const roomUtilization = parseFloat(result.statistics.utilizationRate.rooms);
      
      if (teacherUtilization < 50) {
        recommendations.push('Teacher utilization is low - consider optimizing teacher assignments');
      }
      
      if (roomUtilization < 50) {
        recommendations.push('Room utilization is low - consider optimizing room assignments');
      }
    }
    
    return recommendations;
  }
  
  async fetchFromDatabase(dbOptions) {
    // Implementation for fetching data from database
    // This would use the MongoDB models we created earlier
    return {
      courses: [],
      teachers: [],
      rooms: []
    };
  }
  
  async applyPostProcessingRules(schedule, rules) {
    // Implementation for post-processing rules
    return schedule;
  }
}

module.exports = TimetableService;
