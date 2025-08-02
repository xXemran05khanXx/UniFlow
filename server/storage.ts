import { 
  users, 
  timetables, 
  subjects,
  rooms,
  generatedTimetables,
  syllabusUploads,
  meetings,
  notifications,
  type User, 
  type InsertUser, 
  type Timetable, 
  type InsertTimetable,
  type Subject,
  type InsertSubject,
  type Room,
  type InsertRoom,
  type GeneratedTimetable,
  type InsertGeneratedTimetable,
  type SyllabusUpload,
  type InsertSyllabusUpload,
  type Meeting,
  type InsertMeeting,
  type Notification,
  type InsertNotification
} from "@shared/schema";
import { db } from "./db";
import { eq, or } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  authenticateUser(identifier: string, password: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  seedDefaultUsers(): Promise<void>;
  
  // Timetable operations
  createTimetable(timetable: InsertTimetable): Promise<Timetable>;
  getTimetablesByDepartment(department: string): Promise<Timetable[]>;
  getTimetablesByUser(userId: string): Promise<Timetable[]>;
  getAllTimetables(): Promise<Timetable[]>;
  updateTimetable(id: string, updates: Partial<InsertTimetable>): Promise<Timetable | undefined>;
  deleteTimetable(id: string): Promise<boolean>;
  seedDefaultTimetables(): Promise<void>;
  
  // Subject operations
  createSubject(subject: InsertSubject): Promise<Subject>;
  getSubjectsByDepartment(department: string, year?: string, division?: string): Promise<Subject[]>;
  getAllSubjects(): Promise<Subject[]>;
  updateSubject(id: string, updates: Partial<InsertSubject>): Promise<Subject | undefined>;
  deleteSubject(id: string): Promise<boolean>;
  
  // Room operations
  createRoom(room: InsertRoom): Promise<Room>;
  getRoomsByType(type: string): Promise<Room[]>;
  getAllRooms(): Promise<Room[]>;
  updateRoom(id: string, updates: Partial<InsertRoom>): Promise<Room | undefined>;
  deleteRoom(id: string): Promise<boolean>;
  
  // Meeting operations
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  getMeetingsByUser(userId: string): Promise<Meeting[]>;
  updateMeetingStatus(id: string, status: string): Promise<Meeting | undefined>;
  getUpcomingMeetings(userId: string): Promise<Meeting[]>;
  checkUserAvailability(userId: string, startTime: Date, endTime: Date): Promise<boolean>;
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  markNotificationAsRead(id: string): Promise<boolean>;
  markAllNotificationsAsRead(userId: string): Promise<boolean>;
  seedDefaultRooms(): Promise<void>;
  
  // Generated timetable operations
  createGeneratedTimetable(timetable: InsertGeneratedTimetable): Promise<GeneratedTimetable>;
  getGeneratedTimetables(department: string, year?: string, division?: string): Promise<GeneratedTimetable[]>;
  updateGeneratedTimetableStatus(id: string, status: string): Promise<GeneratedTimetable | undefined>;
  
  // Syllabus upload operations
  createSyllabusUpload(upload: InsertSyllabusUpload): Promise<SyllabusUpload>;
  getSyllabusUploads(department: string, year?: string): Promise<SyllabusUpload[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;  
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async authenticateUser(identifier: string, password: string): Promise<User | undefined> {
    // Find user by username or email
    const [user] = await db.select().from(users).where(
      or(eq(users.username, identifier), eq(users.email, identifier))
    );
    
    if (!user) return undefined;
    
    // Check password
    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Hash password before storing
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        password: hashedPassword,
      })
      .returning();
    return user;
  }

  async seedDefaultUsers(): Promise<void> {
    // Check if users already exist
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length > 0) return;

    // Create default users for testing
    const defaultUsers = [
      {
        username: 'student123',
        email: 'john.doe@university.edu',
        password: 'password123',
        role: 'student',
        name: 'John Doe',
        department: 'Computer Science'
      },
      {
        username: 'teacher456',
        email: 'sarah.johnson@university.edu', 
        password: 'password123',
        role: 'teacher',
        name: 'Dr. Sarah Johnson',
        department: 'Mathematics',
        isAvailable: true
      },
      {
        username: 'admin789',
        email: 'michael.chen@university.edu',
        password: 'password123', 
        role: 'admin',
        name: 'Dr. Michael Chen'
      }
    ];

    for (const userData of defaultUsers) {
      await this.createUser(userData as InsertUser);
    }
  }

  // Timetable operations
  async createTimetable(insertTimetable: InsertTimetable): Promise<Timetable> {
    const [timetable] = await db
      .insert(timetables)
      .values(insertTimetable)
      .returning();
    return timetable;
  }

  async getTimetablesByDepartment(department: string): Promise<Timetable[]> {
    return await db.select().from(timetables).where(eq(timetables.department, department));
  }

  async getTimetablesByUser(userId: string): Promise<Timetable[]> {
    return await db.select().from(timetables).where(eq(timetables.userId, userId));
  }

  async getAllTimetables(): Promise<Timetable[]> {
    return await db.select().from(timetables);
  }

  async updateTimetable(id: string, updates: Partial<InsertTimetable>): Promise<Timetable | undefined> {
    const [timetable] = await db
      .update(timetables)
      .set(updates)
      .where(eq(timetables.id, id))
      .returning();
    return timetable || undefined;
  }

  async deleteTimetable(id: string): Promise<boolean> {
    const result = await db.delete(timetables).where(eq(timetables.id, id));
    return result.rowCount > 0;
  }

  async seedDefaultTimetables(): Promise<void> {
    // Check if timetables already exist
    const existing = await db.select().from(timetables).limit(1);
    if (existing.length > 0) return;

    // Get the seeded users
    const teacherUser = await this.getUserByUsername('teacher456');
    const studentUser = await this.getUserByUsername('student123');

    if (!teacherUser || !studentUser) return;

    // Sample timetable data
    const defaultTimetables = [
      // Mathematics classes by Dr. Sarah Johnson
      {
        userId: teacherUser.id,
        subject: 'Calculus I',
        room: 'Math-105',
        startTime: '09:00',
        endTime: '10:30',
        dayOfWeek: 'Monday',
        department: 'Mathematics',
        year: '1st Year',
        division: 'A'
      },
      {
        userId: teacherUser.id,
        subject: 'Linear Algebra',
        room: 'Math-203',
        startTime: '14:00',
        endTime: '15:30',
        dayOfWeek: 'Monday',
        department: 'Mathematics',
        year: '2nd Year',
        division: 'B'
      },
      {
        userId: teacherUser.id,
        subject: 'Statistics',
        room: 'Math-105',
        startTime: '11:00',
        endTime: '12:30',
        dayOfWeek: 'Tuesday',
        department: 'Mathematics',
        year: '3rd Year',
        division: 'A'
      },
      // Computer Science classes
      {
        userId: studentUser.id, // This will be replaced with actual teacher IDs
        subject: 'Data Structures',
        room: 'CS-201',
        startTime: '09:00',
        endTime: '10:30',
        dayOfWeek: 'Tuesday',
        department: 'Computer Science',
        year: '2nd Year',
        division: 'A'
      },
      {
        userId: studentUser.id,
        subject: 'Algorithm Design',
        room: 'CS-301',
        startTime: '14:00',
        endTime: '15:30',
        dayOfWeek: 'Wednesday',
        department: 'Computer Science',
        year: '3rd Year',
        division: 'A'
      },
      {
        userId: studentUser.id,
        subject: 'Database Systems',
        room: 'CS-205',
        startTime: '11:00',
        endTime: '12:30',
        dayOfWeek: 'Thursday',
        department: 'Computer Science',
        year: '2nd Year',
        division: 'B'
      }
    ];

    for (const timetableData of defaultTimetables) {
      await this.createTimetable(timetableData as InsertTimetable);
    }
  }

  // Subject operations
  async createSubject(insertSubject: InsertSubject): Promise<Subject> {
    const [subject] = await db
      .insert(subjects)
      .values(insertSubject)
      .returning();
    return subject;
  }

  async getSubjectsByDepartment(department: string, year?: string, division?: string): Promise<Subject[]> {
    let query = db.select().from(subjects).where(eq(subjects.department, department));
    
    if (year) {
      query = query.where(eq(subjects.year, year));
    }
    if (division) {
      query = query.where(eq(subjects.division, division));
    }
    
    return await query;
  }

  async getAllSubjects(): Promise<Subject[]> {
    return await db.select().from(subjects);
  }

  async updateSubject(id: string, updates: Partial<InsertSubject>): Promise<Subject | undefined> {
    const [subject] = await db
      .update(subjects)
      .set(updates)
      .where(eq(subjects.id, id))
      .returning();
    return subject || undefined;
  }

  async deleteSubject(id: string): Promise<boolean> {
    const result = await db.delete(subjects).where(eq(subjects.id, id));
    return result.rowCount > 0;
  }

  // Room operations
  async createRoom(insertRoom: InsertRoom): Promise<Room> {
    const [room] = await db
      .insert(rooms)
      .values(insertRoom)
      .returning();
    return room;
  }

  async getRoomsByType(type: string): Promise<Room[]> {
    return await db.select().from(rooms).where(eq(rooms.type, type));
  }

  async getAllRooms(): Promise<Room[]> {
    return await db.select().from(rooms);
  }

  async updateRoom(id: string, updates: Partial<InsertRoom>): Promise<Room | undefined> {
    const [room] = await db
      .update(rooms)
      .set(updates)
      .where(eq(rooms.id, id))
      .returning();
    return room || undefined;
  }

  async deleteRoom(id: string): Promise<boolean> {
    const result = await db.delete(rooms).where(eq(rooms.id, id));
    return result.rowCount > 0;
  }

  // Meeting operations
  async createMeeting(meeting: InsertMeeting): Promise<Meeting> {
    const [newMeeting] = await db.insert(meetings).values(meeting).returning();
    
    // Create notification for participant
    if (meeting.participantId) {
      await this.createNotification({
        userId: meeting.participantId,
        title: "New Meeting Request",
        message: `You have a new meeting request: ${meeting.title}`,
        type: "meeting"
      });
    }
    
    return newMeeting;
  }

  async getMeetingsByUser(userId: string): Promise<Meeting[]> {
    return await db.select().from(meetings)
      .where(or(eq(meetings.organizerId, userId), eq(meetings.participantId, userId)));
  }

  async updateMeetingStatus(id: string, status: string): Promise<Meeting | undefined> {
    const [updatedMeeting] = await db.update(meetings)
      .set({ status })
      .where(eq(meetings.id, id))
      .returning();
    
    if (updatedMeeting && status !== 'pending') {
      // Notify organizer about status change
      await this.createNotification({
        userId: updatedMeeting.organizerId!,
        title: "Meeting Response",
        message: `Your meeting "${updatedMeeting.title}" was ${status}`,
        type: "meeting"
      });
    }
    
    return updatedMeeting;
  }

  async getUpcomingMeetings(userId: string): Promise<Meeting[]> {
    const now = new Date();
    return await db.select().from(meetings)
      .where(or(eq(meetings.organizerId, userId), eq(meetings.participantId, userId)));
  }

  async checkUserAvailability(userId: string, startTime: Date, endTime: Date): Promise<boolean> {
    // Check for conflicting meetings
    const conflictingMeetings = await db.select().from(meetings)
      .where(or(eq(meetings.organizerId, userId), eq(meetings.participantId, userId)));
    
    // Check for conflicting timetable entries
    const userTimetables = await this.getTimetablesByUser(userId);
    
    // Simple availability check - in real implementation, would check time overlaps
    return conflictingMeetings.length === 0;
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId));
  }

  async markNotificationAsRead(id: string): Promise<boolean> {
    const result = await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
    return true;
  }

  async markAllNotificationsAsRead(userId: string): Promise<boolean> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
    return true;
  }

  async seedDefaultRooms(): Promise<void> {
    // Check if rooms already exist
    const existing = await db.select().from(rooms).limit(1);
    if (existing.length > 0) return;

    const defaultRooms = [
      // Classrooms
      { name: 'CS-101', type: 'classroom', capacity: 60, department: 'Computer Science' },
      { name: 'CS-102', type: 'classroom', capacity: 60, department: 'Computer Science' },
      { name: 'CS-201', type: 'classroom', capacity: 45, department: 'Computer Science' },
      { name: 'CS-202', type: 'classroom', capacity: 45, department: 'Computer Science' },
      { name: 'Math-105', type: 'classroom', capacity: 80, department: 'Mathematics' },
      { name: 'Math-203', type: 'classroom', capacity: 50, department: 'Mathematics' },
      
      // Labs
      { name: 'CS-Lab1', type: 'lab', capacity: 30, department: 'Computer Science' },
      { name: 'CS-Lab2', type: 'lab', capacity: 30, department: 'Computer Science' },
      { name: 'CS-Lab3', type: 'lab', capacity: 25, department: 'Computer Science' },
      { name: 'Physics-Lab', type: 'lab', capacity: 20, department: 'Physics' },
      { name: 'Chemistry-Lab', type: 'lab', capacity: 25, department: 'Chemistry' },
      
      // Auditoriums
      { name: 'Main-Auditorium', type: 'auditorium', capacity: 300, department: null },
      { name: 'CS-Auditorium', type: 'auditorium', capacity: 150, department: 'Computer Science' }
    ];

    for (const roomData of defaultRooms) {
      await this.createRoom(roomData as InsertRoom);
    }
  }

  // Generated timetable operations
  async createGeneratedTimetable(insertGeneratedTimetable: InsertGeneratedTimetable): Promise<GeneratedTimetable> {
    const [timetable] = await db
      .insert(generatedTimetables)
      .values(insertGeneratedTimetable)
      .returning();
    return timetable;
  }

  async getGeneratedTimetables(department: string, year?: string, division?: string): Promise<GeneratedTimetable[]> {
    let query = db.select().from(generatedTimetables).where(eq(generatedTimetables.department, department));
    
    if (year) {
      query = query.where(eq(generatedTimetables.year, year));
    }
    if (division) {
      query = query.where(eq(generatedTimetables.division, division));
    }
    
    return await query;
  }

  async updateGeneratedTimetableStatus(id: string, status: string): Promise<GeneratedTimetable | undefined> {
    const [timetable] = await db
      .update(generatedTimetables)
      .set({ status })
      .where(eq(generatedTimetables.id, id))
      .returning();
    return timetable || undefined;
  }

  // Syllabus upload operations
  async createSyllabusUpload(insertSyllabusUpload: InsertSyllabusUpload): Promise<SyllabusUpload> {
    const [upload] = await db
      .insert(syllabusUploads)
      .values(insertSyllabusUpload)
      .returning();
    return upload;
  }

  async getSyllabusUploads(department: string, year?: string): Promise<SyllabusUpload[]> {
    let query = db.select().from(syllabusUploads).where(eq(syllabusUploads.department, department));
    
    if (year) {
      query = query.where(eq(syllabusUploads.year, year));
    }
    
    return await query;
  }
}

export const storage = new DatabaseStorage();
