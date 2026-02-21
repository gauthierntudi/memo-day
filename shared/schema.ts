import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, date, timestamp, boolean, jsonb, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  location: text("location").notNull(),
  client: text("client").notNull(),
  contractor: text("contractor").notNull(),
  projectManager: text("project_manager"),
  status: text("status").notNull().default("active"),
});

export const insertProjectSchema = createInsertSchema(projects).omit({ id: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

export const dailyReports = pgTable("daily_reports", {
  id: serial("id").primaryKey(),
  reportNumber: text("report_number").notNull(),
  projectId: integer("project_id").notNull(),
  reportDate: text("report_date").notNull(),
  preparedBy: text("prepared_by").notNull(),
  shiftStart: text("shift_start").notNull(),
  shiftEnd: text("shift_end").notNull(),
  weatherCondition: text("weather_condition").notNull(),
  temperature: text("temperature").notNull(),
  windSpeed: text("wind_speed"),
  weatherImpact: text("weather_impact"),
  isWorkingDay: boolean("is_working_day").notNull().default(true),
  workActivities: jsonb("work_activities").notNull().default(sql`'[]'::jsonb`),
  labourForce: jsonb("labour_force").notNull().default(sql`'[]'::jsonb`),
  subcontractors: jsonb("subcontractors").notNull().default(sql`'[]'::jsonb`),
  safetyIncidents: jsonb("safety_incidents").notNull().default(sql`'[]'::jsonb`),
  securityIncidents: jsonb("security_incidents").notNull().default(sql`'[]'::jsonb`),
  cleaningStatus: text("cleaning_status").notNull().default("satisfactory"),
  cleaningNotes: text("cleaning_notes"),
  equipment: jsonb("equipment").notNull().default(sql`'[]'::jsonb`),
  materialsIn: jsonb("materials_in").notNull().default(sql`'[]'::jsonb`),
  materialsUsed: jsonb("materials_used").notNull().default(sql`'[]'::jsonb`),
  inventoryStatus: jsonb("inventory_status").notNull().default(sql`'[]'::jsonb`),
  overallProgress: integer("overall_progress").default(0),
  comments: text("comments"),
  status: text("status").notNull().default("draft"),
  submittedBy: text("submitted_by"),
  submittedAt: timestamp("submitted_at"),
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDailyReportSchema = createInsertSchema(dailyReports).omit({ id: true, createdAt: true, submittedAt: true, approvedAt: true });
export type InsertDailyReport = z.infer<typeof insertDailyReportSchema>;
export type DailyReport = typeof dailyReports.$inferSelect;

export const weeklyPlans = pgTable("weekly_plans", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  weekStartDate: text("week_start_date").notNull(),
  weekEndDate: text("week_end_date").notNull(),
  weekNumber: integer("week_number").notNull(),
  plannedActivities: jsonb("planned_activities").notNull().default(sql`'[]'::jsonb`),
  plannedLabour: jsonb("planned_labour").notNull().default(sql`'[]'::jsonb`),
  plannedSubcontractors: jsonb("planned_subcontractors").notNull().default(sql`'[]'::jsonb`),
  productivityTargets: jsonb("productivity_targets").notNull().default(sql`'[]'::jsonb`),
  milestones: jsonb("milestones").notNull().default(sql`'[]'::jsonb`),
  notes: text("notes"),
  status: text("status").notNull().default("draft"),
  submittedBy: text("submitted_by"),
  submittedAt: timestamp("submitted_at"),
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWeeklyPlanSchema = createInsertSchema(weeklyPlans).omit({ id: true, createdAt: true, submittedAt: true, approvedAt: true });
export type InsertWeeklyPlan = z.infer<typeof insertWeeklyPlanSchema>;
export type WeeklyPlan = typeof weeklyPlans.$inferSelect;

export interface WorkActivity {
  trade: string;
  description: string;
  location: string;
  percentComplete: number;
  status: string;
}

export interface LabourEntry {
  trade: string;
  count: number;
  hours: number;
}

export interface SubcontractorEntry {
  company: string;
  specialty: string;
  workersCount: number;
  workDescription: string;
}

export interface SafetyIncident {
  type: string;
  severity: string;
  description: string;
  actionTaken: string;
  reportedBy: string;
}

export interface SecurityIncident {
  type: string;
  description: string;
  actionTaken: string;
  reportedBy: string;
}

export interface EquipmentEntry {
  name: string;
  type: string;
  status: string;
  hoursUsed: number;
  operator: string;
}

export interface MaterialEntry {
  name: string;
  unit: string;
  quantity: number;
  supplier: string;
  deliveryNote: string;
}

export interface InventoryItem {
  name: string;
  unit: string;
  opening: number;
  received: number;
  used: number;
  closing: number;
  status: string;
}

export interface PlannedActivity {
  trade: string;
  description: string;
  targetPercent: number;
  priority: string;
}

export interface PlannedLabour {
  trade: string;
  plannedCount: number;
}

export interface PlannedSubcontractor {
  company: string;
  specialty: string;
  plannedWorkers: number;
  scope: string;
}

export interface ProductivityTarget {
  trade: string;
  metric: string;
  target: number;
  unit: string;
}

export interface Milestone {
  description: string;
  targetDate: string;
  status: string;
}

export const TRADES = [
  "Civil Works",
  "Structural",
  "Mechanical",
  "Electrical",
  "Plumbing",
  "HVAC",
  "Finishing",
  "Painting",
  "Landscaping",
  "Waterproofing",
  "Fire Protection",
  "Carpentry",
  "Masonry",
  "Steel Works",
  "Roofing",
  "Glazing",
  "Tiling",
  "Insulation",
] as const;

export const WEATHER_CONDITIONS = [
  "Sunny",
  "Partly Cloudy",
  "Cloudy",
  "Light Rain",
  "Heavy Rain",
  "Thunderstorm",
  "Windy",
  "Fog",
  "Hot",
  "Cold",
  "Dust Storm",
] as const;

export const EQUIPMENT_TYPES = [
  "Excavator",
  "Bulldozer",
  "Crane",
  "Concrete Mixer",
  "Dump Truck",
  "Loader",
  "Compactor",
  "Generator",
  "Forklift",
  "Scaffold",
  "Pump",
  "Welding Machine",
  "Tower Crane",
  "Backhoe",
  "Grader",
] as const;

export const EQUIPMENT_STATUS = [
  "Operational",
  "Idle",
  "Under Maintenance",
  "Breakdown",
] as const;

export const INCIDENT_TYPES = [
  "Near Miss",
  "First Aid",
  "Medical Treatment",
  "Lost Time Injury",
  "Property Damage",
  "Environmental",
  "Safety Compliance",
] as const;

export const SEVERITY_LEVELS = [
  "Low",
  "Medium",
  "High",
  "Critical",
] as const;

export const SECURITY_INCIDENT_TYPES = [
  "Theft",
  "Vandalism",
  "Unauthorized Access",
  "Property Damage",
  "Trespassing",
  "Other",
] as const;

export const CLEANING_STATUS = [
  "Excellent",
  "Satisfactory",
  "Needs Improvement",
  "Poor",
] as const;

export const MATERIAL_UNITS = [
  "Cubic Meters",
  "Tons",
  "Bags",
  "Pieces",
  "Meters",
  "Square Meters",
  "Liters",
  "Rolls",
  "Sheets",
  "Bundles",
  "Sets",
] as const;

export const ACTIVITY_STATUS = [
  "Not Started",
  "In Progress",
  "Completed",
  "Delayed",
  "On Hold",
] as const;

export const PRIORITY_LEVELS = [
  "Low",
  "Medium",
  "High",
  "Critical",
] as const;

export const INVENTORY_STATUS = [
  "Adequate",
  "Low",
  "Critical",
  "Out of Stock",
  "Overstocked",
] as const;

export const SUPER_ADMIN_EMAIL = "memdt@merinyaal.com";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  password: text("password"),
  orgRole: text("org_role").notNull(),
  appRole: text("app_role").notNull().default("user"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, password: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const APP_ROLES = ["admin", "user", "viewer"] as const;

export const ORG_ROLES = [
  "Board Member",
  "CEO",
  "Construction Manager",
  "Contract Administrator",
  "Development Manager",
  "Director",
  "Executive Director",
  "Foreman",
  "HR Manager",
  "HSE Manager",
  "Planning Engineer",
  "Project Manager",
  "Quality Control",
  "Quantity Surveyor",
  "Safety Officer",
  "Site Engineer",
  "Superintendent",
] as const;
