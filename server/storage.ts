import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";
import {
  projects, dailyReports, weeklyPlans, users, rolePrivileges, eventLogs,
  type Project, type InsertProject,
  type DailyReport, type InsertDailyReport,
  type WeeklyPlan, type InsertWeeklyPlan,
  type User, type InsertUser,
  type RolePrivilege,
  type EventLog,
} from "@shared/schema";

export interface IStorage {
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;

  getDailyReports(): Promise<DailyReport[]>;
  getDailyReport(id: number): Promise<DailyReport | undefined>;
  createDailyReport(report: InsertDailyReport): Promise<DailyReport>;
  updateDailyReport(id: number, report: Partial<InsertDailyReport>): Promise<DailyReport | undefined>;

  getWeeklyPlans(): Promise<WeeklyPlan[]>;
  getWeeklyPlan(id: number): Promise<WeeklyPlan | undefined>;
  createWeeklyPlan(plan: InsertWeeklyPlan): Promise<WeeklyPlan>;
  updateWeeklyPlan(id: number, plan: Partial<InsertWeeklyPlan>): Promise<WeeklyPlan | undefined>;

  getUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  updateUserPassword(id: string, hashedPassword: string): Promise<void>;
  deleteUser(id: string): Promise<boolean>;

  getRolePrivileges(): Promise<RolePrivilege[]>;
  upsertRolePrivilege(orgRole: string, permissions: string[]): Promise<RolePrivilege>;

  getEventLogs(limit?: number, offset?: number, action?: string, search?: string): Promise<EventLog[]>;
  getEventLogCount(action?: string, search?: string): Promise<number>;
  createEventLog(log: { userId?: string; userName: string; userEmail?: string; action: string; entityType?: string; entityId?: string; description: string }): Promise<EventLog>;
  getTopUsersStats(limit?: number): Promise<Array<{ userName: string; userEmail: string | null; operationCount: number; totalConnectionMinutes: number }>>;
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

  async updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined> {
    const [updated] = await db.update(projects).set(project).where(eq(projects.id, id)).returning();
    return updated;
  }

  async deleteProject(id: number): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id)).returning();
    return result.length > 0;
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

  async getUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(user).where(eq(users.id, id)).returning();
    return updated;
  }

  async updateUserPassword(id: string, hashedPassword: string): Promise<void> {
    await db.update(users).set({ password: hashedPassword }).where(eq(users.id, id));
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  async getRolePrivileges(): Promise<RolePrivilege[]> {
    return db.select().from(rolePrivileges);
  }

  async upsertRolePrivilege(orgRole: string, permissions: string[]): Promise<RolePrivilege> {
    const [existing] = await db.select().from(rolePrivileges).where(eq(rolePrivileges.orgRole, orgRole));
    if (existing) {
      const [updated] = await db.update(rolePrivileges).set({ permissions }).where(eq(rolePrivileges.orgRole, orgRole)).returning();
      return updated;
    }
    const [created] = await db.insert(rolePrivileges).values({ orgRole, permissions }).returning();
    return created;
  }

  async getEventLogs(limit = 100, offset = 0, action?: string, search?: string): Promise<EventLog[]> {
    const conditions = [];
    if (action) conditions.push(eq(eventLogs.action, action));
    if (search) {
      const s = `%${search}%`;
      conditions.push(sql`(${eventLogs.userName} ILIKE ${s} OR ${eventLogs.description} ILIKE ${s} OR ${eventLogs.userEmail} ILIKE ${s})`);
    }
    const where = conditions.length > 0 ? sql`${sql.join(conditions, sql` AND `)}` : undefined;
    return db.select().from(eventLogs).where(where).orderBy(desc(eventLogs.createdAt)).limit(limit).offset(offset);
  }

  async getEventLogCount(action?: string, search?: string): Promise<number> {
    const conditions = [];
    if (action) conditions.push(eq(eventLogs.action, action));
    if (search) {
      const s = `%${search}%`;
      conditions.push(sql`(${eventLogs.userName} ILIKE ${s} OR ${eventLogs.description} ILIKE ${s} OR ${eventLogs.userEmail} ILIKE ${s})`);
    }
    const where = conditions.length > 0 ? sql`${sql.join(conditions, sql` AND `)}` : undefined;
    const result = await db.select({ count: sql`count(*)::int` }).from(eventLogs).where(where);
    return result[0]?.count as number || 0;
  }

  async createEventLog(log: { userId?: string; userName: string; userEmail?: string; action: string; entityType?: string; entityId?: string; description: string }): Promise<EventLog> {
    const [created] = await db.insert(eventLogs).values(log).returning();
    return created;
  }

  async getTopUsersStats(limit = 5): Promise<Array<{ userName: string; userEmail: string | null; operationCount: number; totalConnectionMinutes: number }>> {
    const topUsers = await db.select({
      userName: eventLogs.userName,
      userEmail: eventLogs.userEmail,
      operationCount: sql<number>`count(*)::int`,
    }).from(eventLogs).groupBy(eventLogs.userName, eventLogs.userEmail).orderBy(sql`count(*) DESC`).limit(limit);

    const results = [];
    for (const u of topUsers) {
      const loginEvents = await db.select({ createdAt: eventLogs.createdAt })
        .from(eventLogs)
        .where(sql`${eventLogs.userName} = ${u.userName} AND ${eventLogs.action} = 'Login'`)
        .orderBy(eventLogs.createdAt);
      const logoutEvents = await db.select({ createdAt: eventLogs.createdAt })
        .from(eventLogs)
        .where(sql`${eventLogs.userName} = ${u.userName} AND ${eventLogs.action} = 'Logout'`)
        .orderBy(eventLogs.createdAt);

      let totalMinutes = 0;
      const logouts = [...logoutEvents];
      for (const login of loginEvents) {
        const logoutIdx = logouts.findIndex(lo => lo.createdAt && login.createdAt && lo.createdAt > login.createdAt);
        if (logoutIdx !== -1) {
          const diff = (logouts[logoutIdx].createdAt!.getTime() - login.createdAt!.getTime()) / 60000;
          totalMinutes += diff;
          logouts.splice(logoutIdx, 1);
        }
      }

      results.push({
        userName: u.userName,
        userEmail: u.userEmail,
        operationCount: u.operationCount,
        totalConnectionMinutes: Math.round(totalMinutes),
      });
    }
    return results;
  }
}

export const storage = new DatabaseStorage();
