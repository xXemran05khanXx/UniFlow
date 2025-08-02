import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(), // 'student', 'teacher', 'admin'
  name: text("name").notNull(),
  department: text("department"),
  isAvailable: boolean("is_available").default(true), // for teachers
  createdAt: timestamp("created_at").defaultNow(),
});

export const timetables = pgTable("timetables", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").references(() => users.id),
  subject: text("subject").notNull(),
  room: text("room").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  dayOfWeek: text("day_of_week").notNull(),
  department: text("department").notNull(),
  year: text("year"),
  division: text("division"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const meetings = pgTable("meetings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizerId: text("organizer_id").references(() => users.id),
  participantId: text("participant_id").references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  room: text("room"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: text("status").default("pending"), // 'pending', 'accepted', 'declined'
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").references(() => users.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // 'class', 'meeting', 'room_change', 'general'
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertTimetableSchema = createInsertSchema(timetables).omit({
  id: true,
  createdAt: true,
});

export const insertMeetingSchema = createInsertSchema(meetings).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

// New tables for automated timetable generation
export const subjects = pgTable("subjects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  code: text("code"),
  department: text("department").notNull(),
  year: text("year").notNull(),
  division: text("division").notNull(),
  lectureHours: integer("lecture_hours").notNull(),
  labHours: integer("lab_hours").default(0),
  isLab: boolean("is_lab").default(false),
  teacherId: text("teacher_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const rooms = pgTable("rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  type: text("type").notNull(), // 'classroom', 'lab', 'auditorium'
  capacity: integer("capacity").notNull(),
  department: text("department"),
  isAvailable: boolean("is_available").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const generatedTimetables = pgTable("generated_timetables", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  department: text("department").notNull(),
  year: text("year").notNull(),
  division: text("division").notNull(),
  timetableData: jsonb("timetable_data").notNull(), // Store the complete generated timetable
  fitnessScore: integer("fitness_score"),
  generationParams: jsonb("generation_params"), // Store GA parameters used
  status: text("status").default("draft"), // 'draft', 'active', 'archived'
  createdAt: timestamp("created_at").defaultNow(),
});

export const syllabusUploads = pgTable("syllabus_uploads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: text("filename").notNull(),
  department: text("department").notNull(),
  year: text("year").notNull(),
  division: text("division").notNull(),
  extractedSubjects: jsonb("extracted_subjects"), // Subjects extracted from PDF
  uploadedBy: text("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});



export const insertSubjectSchema = createInsertSchema(subjects).omit({
  id: true,
  createdAt: true,
});

export const insertRoomSchema = createInsertSchema(rooms).omit({
  id: true,
  createdAt: true,
});

export const insertGeneratedTimetableSchema = createInsertSchema(generatedTimetables).omit({
  id: true,
  createdAt: true,
});

export const insertSyllabusUploadSchema = createInsertSchema(syllabusUploads).omit({
  id: true,
  createdAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Timetable = typeof timetables.$inferSelect;
export type InsertTimetable = z.infer<typeof insertTimetableSchema>;
export type Meeting = typeof meetings.$inferSelect;
export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Subject = typeof subjects.$inferSelect;
export type InsertSubject = z.infer<typeof insertSubjectSchema>;
export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type GeneratedTimetable = typeof generatedTimetables.$inferSelect;
export type InsertGeneratedTimetable = z.infer<typeof insertGeneratedTimetableSchema>;
export type SyllabusUpload = typeof syllabusUploads.$inferSelect;
export type InsertSyllabusUpload = z.infer<typeof insertSyllabusUploadSchema>;
