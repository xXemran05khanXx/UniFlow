import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

import multer from 'multer';
import SyllabusExtractor from './pdfExtractor';
import TimetableGA from './geneticAlgorithm';

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize default data
  await storage.seedDefaultUsers();
  await storage.seedDefaultTimetables();
  await storage.seedDefaultRooms();

  // Users endpoint
  app.get("/api/users", async (req, res) => {
    try {
      // Get all users (excluding passwords)
      const users = await storage.getAllUsers();
      const usersWithoutPasswords = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Authentication endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { identifier, password, role } = req.body;
      
      if (!identifier || !password || !role) {
        return res.status(400).json({ error: "Missing credentials" });
      }

      const user = await storage.authenticateUser(identifier, password);
      
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (user.role !== role) {
        return res.status(401).json({ error: "Role mismatch" });
      }

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Timetable endpoints
  app.get("/api/timetables", async (req, res) => {
    try {
      const { department, userId } = req.query;
      
      let timetables;
      if (department) {
        timetables = await storage.getTimetablesByDepartment(department as string);
      } else if (userId) {
        timetables = await storage.getTimetablesByUser(userId as string);
      } else {
        timetables = await storage.getAllTimetables();
      }
      
      res.json(timetables);
    } catch (error) {
      console.error("Get timetables error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/timetables", async (req, res) => {
    try {
      const timetableData = req.body;
      const timetable = await storage.createTimetable(timetableData);
      res.status(201).json(timetable);
    } catch (error) {
      console.error("Create timetable error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/timetables/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const timetable = await storage.updateTimetable(id, updates);
      
      if (!timetable) {
        return res.status(404).json({ error: "Timetable not found" });
      }
      
      res.json(timetable);
    } catch (error) {
      console.error("Update timetable error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/timetables/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteTimetable(id);
      
      if (!success) {
        return res.status(404).json({ error: "Timetable not found" });
      }
      
      res.json({ message: "Timetable deleted successfully" });
    } catch (error) {
      console.error("Delete timetable error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Automated Timetable Generation Endpoints

  // Upload syllabus PDF and extract subjects
  app.post("/api/syllabus/upload", upload.single('syllabus'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No PDF file uploaded" });
      }

      const { department, year, division, uploadedBy } = req.body;
      
      if (!department || !year || !division) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const extractor = new SyllabusExtractor();
      
      try {
        // Extract subjects from PDF
        const extractedSubjects = await extractor.extractSubjects(req.file.buffer);
        
        // Save the upload record
        const upload = await storage.createSyllabusUpload({
          filename: req.file.originalname,
          department,
          year,
          division,
          extractedSubjects,
          uploadedBy
        });

        res.json({
          upload,
          extractedSubjects,
          message: `Successfully extracted ${extractedSubjects.length} subjects from PDF`
        });
      } catch (error) {
        console.error('PDF extraction failed, using sample data:', error);
        
        // Fallback to sample subjects if PDF extraction fails
        const sampleSubjects = extractor.createSampleSubjects(department, year);
        
        const upload = await storage.createSyllabusUpload({
          filename: req.file.originalname,
          department,
          year,
          division,
          extractedSubjects: sampleSubjects,
          uploadedBy
        });

        res.json({
          upload,
          extractedSubjects: sampleSubjects,
          message: `PDF extraction failed, using sample subjects for ${department} department`,
          warning: 'Consider manual subject entry for accuracy'
        });
      }
    } catch (error) {
      console.error("Syllabus upload error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Generate automated timetable using Genetic Algorithm
  app.post("/api/timetables/generate", async (req, res) => {
    try {
      const { department, year, division, subjects: inputSubjects, gaParams } = req.body;
      
      if (!department || !year || !division) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      console.log(`Starting automated timetable generation for ${department} ${year} ${division}`);

      // Get subjects (either from request or database)
      let subjects = inputSubjects;
      if (!subjects || subjects.length === 0) {
        subjects = await storage.getSubjectsByDepartment(department, year, division);
      }

      if (!subjects || subjects.length === 0) {
        return res.status(400).json({ error: "No subjects found. Please upload a syllabus first." });
      }

      // Get available rooms
      const allRooms = await storage.getAllRooms();
      if (allRooms.length === 0) {
        return res.status(400).json({ error: "No rooms configured. Please add rooms first." });
      }

      // Get available teachers
      const allTeachers = await storage.getUserByEmail('sarah.johnson@university.edu'); // Sample teacher
      const teachers = allTeachers ? [
        {
          id: allTeachers.id,
          name: allTeachers.name,
          isAvailable: allTeachers.isAvailable || true,
          maxHours: 20 // Default max hours per week
        }
      ] : [];

      // Prepare subjects for GA
      interface Subject {
        id?: string;
        name: string;
        lectureHours?: number;
        labHours?: number;
        isLab?: boolean;
      }

      const gaSubjects = subjects.map((s: Subject) => ({
        id: s.id || `subj-${Date.now()}-${Math.random()}`,
        name: s.name,
        lectureHours: s.lectureHours || 3,
        labHours: s.labHours || 0,
        isLab: s.isLab || false,
        teacherId: teachers.length > 0 ? teachers[0].id : undefined
      }));

      // Prepare rooms for GA
      const gaRooms = allRooms.map(r => ({
        id: r.id,
        name: r.name,
        type: r.type as 'classroom' | 'lab' | 'auditorium',
        capacity: r.capacity
      }));

      // Initialize and run Genetic Algorithm
      const ga = new TimetableGA(gaSubjects, gaRooms, teachers, gaParams);
      const result = ga.generateTimetable();

      // Convert GA result to database format
      const timetableEntries = result.bestTimetable.map(assignment => {
        const subject = gaSubjects.find((s: { id: string }) => s.id === assignment.subjectId);
        const room = gaRooms.find(r => r.id === assignment.roomId);
        
        return {
          userId: assignment.teacherId,
          subject: subject?.name || 'Unknown Subject',
          room: room?.name || 'Unknown Room',
          startTime: assignment.timeSlot.startTime,
          endTime: assignment.timeSlot.endTime,
          dayOfWeek: assignment.timeSlot.day,
          department,
          year,
          division
        };
      });

      // Save the generated timetable
      const generatedTimetable = await storage.createGeneratedTimetable({
        department,
        year,
        division,
        timetableData: timetableEntries,
        fitnessScore: result.fitnessScore,
        generationParams: gaParams || {},
        status: 'draft'
      });

      res.json({
        generatedTimetable,
        timetableEntries,
        fitnessScore: result.fitnessScore,
        generationData: result.generationData,
        message: `Successfully generated timetable with fitness score: ${result.fitnessScore}`
      });

    } catch (error) {
      console.error("Timetable generation error:", error);
      res.status(500).json({ 
        error: "Timetable generation failed", 
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Accept and save generated timetable to main timetables table
  app.post("/api/timetables/accept/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get the generated timetable
      const generatedTimetables = await storage.getGeneratedTimetables('', '', '');
      const generatedTimetable = generatedTimetables.find(gt => gt.id === id);
      
      if (!generatedTimetable) {
        return res.status(404).json({ error: "Generated timetable not found" });
      }

      // Clear existing timetables for this department/year/division
      const existingTimetables = await storage.getTimetablesByDepartment(generatedTimetable.department);
      for (const existing of existingTimetables) {
        if (existing.year === generatedTimetable.year && existing.division === generatedTimetable.division) {
          await storage.deleteTimetable(existing.id);
        }
      }

      // Insert new timetable entries
      const timetableData = generatedTimetable.timetableData as any[];
      const createdTimetables = [];
      
      for (const entry of timetableData) {
        const timetable = await storage.createTimetable(entry);
        createdTimetables.push(timetable);
      }

      // Update generated timetable status
      await storage.updateGeneratedTimetableStatus(id, 'active');

      res.json({
        message: "Timetable successfully accepted and saved",
        createdTimetables
      });

    } catch (error) {
      console.error("Accept timetable error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get rooms
  app.get("/api/rooms", async (req, res) => {
    try {
      const rooms = await storage.getAllRooms();
      res.json(rooms);
    } catch (error) {
      console.error("Get rooms error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get subjects
  app.get("/api/subjects", async (req, res) => {
    try {
      const { department, year, division } = req.query;
      let subjects;
      
      if (department) {
        subjects = await storage.getSubjectsByDepartment(department as string, year as string, division as string);
      } else {
        subjects = await storage.getAllSubjects();
      }
      
      res.json(subjects);
    } catch (error) {
      console.error("Get subjects error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get generated timetables
  app.get("/api/timetables/generated", async (req, res) => {
    try {
      const { department, year, division } = req.query;
      const timetables = await storage.getGeneratedTimetables(
        department as string || '', 
        year as string, 
        division as string
      );
      res.json(timetables);
    } catch (error) {
      console.error("Get generated timetables error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Meeting endpoints
  app.post("/api/meetings", async (req, res) => {
    try {
      const meetingData = req.body;
      const meeting = await storage.createMeeting(meetingData);
      res.json(meeting);
    } catch (error) {
      console.error("Create meeting error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/meetings", async (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }
      const meetings = await storage.getMeetingsByUser(userId as string);
      res.json(meetings);
    } catch (error) {
      console.error("Get meetings error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/meetings/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const meeting = await storage.updateMeetingStatus(id, status);
      if (!meeting) {
        return res.status(404).json({ error: "Meeting not found" });
      }
      res.json(meeting);
    } catch (error) {
      console.error("Update meeting status error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/meetings/upcoming", async (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }
      const meetings = await storage.getUpcomingMeetings(userId as string);
      res.json(meetings);
    } catch (error) {
      console.error("Get upcoming meetings error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/availability/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const { startTime, endTime } = req.query;
      
      if (!startTime || !endTime) {
        return res.status(400).json({ error: "Start time and end time are required" });
      }
      
      const isAvailable = await storage.checkUserAvailability(
        userId, 
        new Date(startTime as string), 
        new Date(endTime as string)
      );
      res.json({ available: isAvailable });
    } catch (error) {
      console.error("Check availability error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Notification endpoints
  app.post("/api/notifications", async (req, res) => {
    try {
      const notificationData = req.body;
      const notification = await storage.createNotification(notificationData);
      res.json(notification);
    } catch (error) {
      console.error("Create notification error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/notifications", async (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }
      const notifications = await storage.getNotificationsByUser(userId as string);
      res.json(notifications);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/notifications/:id/read", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.markNotificationAsRead(id);
      res.json({ success });
    } catch (error) {
      console.error("Mark notification as read error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/notifications/mark-all-read", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }
      const success = await storage.markAllNotificationsAsRead(userId);
      res.json({ success });
    } catch (error) {
      console.error("Mark all notifications as read error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
