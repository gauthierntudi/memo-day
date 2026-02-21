import { db } from "./db";
import { eq } from "drizzle-orm";
import {
  projects, dailyReports, weeklyPlans,
  type Project, type InsertProject,
  type DailyReport, type InsertDailyReport,
  type WeeklyPlan, type InsertWeeklyPlan,
} from "@shared/schema";

export interface IStorage {
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;

  getDailyReports(): Promise<DailyReport[]>;
  getDailyReport(id: number): Promise<DailyReport | undefined>;
  createDailyReport(report: InsertDailyReport): Promise<DailyReport>;
  updateDailyReport(id: number, report: Partial<InsertDailyReport>): Promise<DailyReport | undefined>;

  getWeeklyPlans(): Promise<WeeklyPlan[]>;
  getWeeklyPlan(id: number): Promise<WeeklyPlan | undefined>;
  createWeeklyPlan(plan: InsertWeeklyPlan): Promise<WeeklyPlan>;
  updateWeeklyPlan(id: number, plan: Partial<InsertWeeklyPlan>): Promise<WeeklyPlan | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getProjects(): Promise<Project[]> {
    return db.select().from(projects);
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [created] = await db.insert(projects).values(project).returning();
    return created;
  }

  async getDailyReports(): Promise<DailyReport[]> {
    return db.select().from(dailyReports);
  }

  async getDailyReport(id: number): Promise<DailyReport | undefined> {
    const [report] = await db.select().from(dailyReports).where(eq(dailyReports.id, id));
    return report;
  }

  async createDailyReport(report: InsertDailyReport): Promise<DailyReport> {
    const [created] = await db.insert(dailyReports).values(report).returning();
    return created;
  }

  async updateDailyReport(id: number, report: Partial<InsertDailyReport>): Promise<DailyReport | undefined> {
    const [updated] = await db.update(dailyReports).set(report).where(eq(dailyReports.id, id)).returning();
    return updated;
  }

  async getWeeklyPlans(): Promise<WeeklyPlan[]> {
    return db.select().from(weeklyPlans);
  }

  async getWeeklyPlan(id: number): Promise<WeeklyPlan | undefined> {
    const [plan] = await db.select().from(weeklyPlans).where(eq(weeklyPlans.id, id));
    return plan;
  }

  async createWeeklyPlan(plan: InsertWeeklyPlan): Promise<WeeklyPlan> {
    const [created] = await db.insert(weeklyPlans).values(plan).returning();
    return created;
  }

  async updateWeeklyPlan(id: number, plan: Partial<InsertWeeklyPlan>): Promise<WeeklyPlan | undefined> {
    const [updated] = await db.update(weeklyPlans).set(plan).where(eq(weeklyPlans.id, id)).returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
