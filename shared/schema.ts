import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, date, timestamp, boolean, jsonb, serial, real, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const CLIENT_TYPES = ["Group", "Non-group", "Own"] as const;

export interface DirectCostDetails {
  materialCost: number | null;
  labor: number | null;
  smallToolsEquipment: number | null;
  supervisionStaff: number | null;
  subContractors: number | null;
}

export interface IndirectCostDetails {
  mobilization: number | null;
  toolAndPlants: number | null;
  formwork: number | null;
  utilitiesSiteFacilities: number | null;
  taxesInsurance: number | null;
  headOfficeOverhead: number | null;
  contingencies: number | null;
}

export const DIRECT_COST_LABELS: Record<keyof DirectCostDetails, string> = {
  materialCost: "Material Cost",
  labor: "Labor",
  smallToolsEquipment: "Small Tools & Equipment, Consumables",
  supervisionStaff: "Supervision Staff",
  subContractors: "Sub-Contractors",
};

export const INDIRECT_COST_LABELS: Record<keyof IndirectCostDetails, string> = {
  mobilization: "Mobilization",
  toolAndPlants: "Tool & Plants",
  formwork: "Formwork",
  utilitiesSiteFacilities: "Utilities & Site Facilities",
  taxesInsurance: "Taxes & Insurance",
  headOfficeOverhead: "Head Office Overhead",
  contingencies: "Contingencies",
};

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  location: text("location").notNull(),
  client: text("client").notNull(),
  clientType: text("client_type").notNull().default("Own"),
  contractor: text("contractor").notNull(),
  projectManager: text("project_manager"),
  developmentManager: text("development_manager"),
  scopeOfWork: text("scope_of_work"),
  startDate: text("start_date"),
  plannedDeliveryDate: text("planned_delivery_date"),
  revisedBaselineDate: text("revised_baseline_date"),
  updatedDeliveryDate: text("updated_delivery_date"),
  projectValue: doublePrecision("project_value"),
  updatedProjectValue: doublePrecision("updated_project_value"),
  overallProgress: real("overall_progress").default(0),
  billedAmount: doublePrecision("billed_amount"),
  unbilledAmount: doublePrecision("unbilled_amount"),
  budgetedCost: doublePrecision("budgeted_cost"),
  updatedCost: doublePrecision("updated_cost"),
  actualDirectCost: doublePrecision("actual_direct_cost"),
  actualIndirectCost: doublePrecision("actual_indirect_cost"),
  directCostDetails: jsonb("direct_cost_details").$type<DirectCostDetails>(),
  indirectCostDetails: jsonb("indirect_cost_details").$type<IndirectCostDetails>(),
  delayDays: real("delay_days"),
  schedulePercentage: real("schedule_percentage"),
  performancePercentage: real("performance_percentage"),
  spiIndex: real("spi_index"),
  cpiIndex: real("cpi_index"),
  photos: jsonb("photos").$type<string[]>().default([]),
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
  photos: jsonb("photos").notNull().default(sql`'[]'::jsonb`),
  comments: text("comments"),
  status: text("status").notNull().default("draft"),
  submittedBy: text("submitted_by"),
  submittedAt: timestamp("submitted_at"),
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  activityLog: jsonb("activity_log").notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
});

export interface ActivityLogEntry {
  action: string;
  userName: string;
  timestamp: string;
  details?: string;
}

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
  photos?: string[];
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
  actualPercent?: number;
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
  "Assistant Surveyor",
  "Assistant Surveyor Local",
  "Carpentry",
  "Ceiling Worker",
  "Civil Works",
  "Concrete Masons",
  "Electrical",
  "Finishing",
  "Fire Protection",
  "General Labor",
  "Glazing",
  "HVAC",
  "Insulation",
  "Landscaping",
  "Masonry",
  "Masonry Mason",
  "Mechanical",
  "Painting",
  "Plumbing",
  "Roofing",
  "Scaffolders",
  "Steel Works",
  "Storekeeper",
  "Structural",
  "Tiling",
  "Timekeeper",
  "Tower Crane Operator",
  "Waterproofing",
  "Welder",
] as const;

export const WEATHER_CONDITIONS = [
  "Cloudy",
  "Cold",
  "Dust Storm",
  "Fog",
  "Heavy Rain",
  "Hot",
  "Light Rain",
  "Partly Cloudy",
  "Sunny",
  "Thunderstorm",
  "Windy",
] as const;

export const EQUIPMENT_TYPES = [
  "Backhoe",
  "Bulldozer",
  "Compactor",
  "Concrete Mixer",
  "Crane",
  "Dump Truck",
  "Excavator",
  "Forklift",
  "Generator",
  "Grader",
  "Loader",
  "Pump",
  "Scaffold",
  "Tower Crane",
  "Welding Machine",
] as const;

export const EQUIPMENT_STATUS = [
  "Operational",
  "Idle",
  "Under Maintenance",
  "Breakdown",
] as const;

export const INCIDENT_TYPES = [
  "Environmental",
  "First Aid",
  "Lost Time Injury",
  "Medical Treatment",
  "Near Miss",
  "Property Damage",
  "Safety Compliance",
] as const;

export const SEVERITY_LEVELS = [
  "Low",
  "Medium",
  "High",
  "Critical",
] as const;

export const SECURITY_INCIDENT_TYPES = [
  "Other",
  "Property Damage",
  "Theft",
  "Trespassing",
  "Unauthorized Access",
  "Vandalism",
] as const;

export const CLEANING_STATUS = [
  "Excellent",
  "Satisfactory",
  "Needs Improvement",
  "Poor",
] as const;

export const MATERIAL_UNITS = [
  "Bags",
  "Bundles",
  "Cubic Meters",
  "Liters",
  "Meters",
  "Pieces",
  "Rolls",
  "Sets",
  "Sheets",
  "Square Meters",
  "Tons",
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
  projectIds: jsonb("project_ids").$type<number[]>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, password: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const PERMISSIONS = [
  "view_dashboard",
  "view_daily_report",
  "create_daily_report",
  "edit_save_daily_report",
  "submit_daily_report",
  "approve_reject_daily_report",
  "view_weekly_plan",
  "create_weekly_plan",
  "edit_save_weekly_plan",
  "submit_weekly_plan",
  "approve_reject_weekly_plan",
  "view_weekly_report",
  "view_executive_summary",
  "view_projects",
  "view_projects_steering",
  "view_projects_overview",
  "edit_projects",
  "view_project_operational",
  "edit_project_operational",
  "view_project_financial",
  "edit_project_financial",
  "view_users",
  "edit_users",
  "view_role_privileges",
  "edit_role_privileges",
] as const;

export const PERMISSION_LABELS: Record<string, string> = {
  view_dashboard: "View Dashboard",
  view_daily_report: "View Daily Report",
  create_daily_report: "Create Daily Report",
  edit_save_daily_report: "Edit & Save Daily Report Draft",
  submit_daily_report: "Submit / Resubmit Daily Report",
  approve_reject_daily_report: "Approve / Reject Daily Report",
  view_weekly_plan: "View Weekly Plan",
  create_weekly_plan: "Create Weekly Plan",
  edit_save_weekly_plan: "Edit & Save Weekly Plan Draft",
  submit_weekly_plan: "Submit / Resubmit Weekly Plan",
  approve_reject_weekly_plan: "Approve / Reject Weekly Plan",
  view_weekly_report: "View Weekly Report",
  view_executive_summary: "View Executive Summary",
  view_projects: "View Project Info",
  view_projects_steering: "View Projects Steering",
  view_projects_overview: "View Project Overview",
  edit_projects: "Edit Project Info",
  view_project_operational: "View Operational Indicators",
  edit_project_operational: "Edit Operational Indicators",
  view_project_financial: "View Financial Indicators",
  edit_project_financial: "Edit Financial Indicators",
  view_users: "View User List",
  edit_users: "Edit User List",
  view_role_privileges: "View Role Privileges",
  edit_role_privileges: "Edit Role Privileges",
};

export const rolePrivileges = pgTable("role_privileges", {
  id: serial("id").primaryKey(),
  orgRole: text("org_role").notNull().unique(),
  permissions: jsonb("permissions").notNull().default([]),
});

export const insertRolePrivilegeSchema = createInsertSchema(rolePrivileges).omit({ id: true });
export type InsertRolePrivilege = z.infer<typeof insertRolePrivilegeSchema>;
export type RolePrivilege = typeof rolePrivileges.$inferSelect;

export const eventLogs = pgTable("event_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
  userName: text("user_name").notNull(),
  userEmail: text("user_email"),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type EventLog = typeof eventLogs.$inferSelect;

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
