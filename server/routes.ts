import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProjectSchema, insertDailyReportSchema, insertWeeklyPlanSchema, insertUserSchema, SUPER_ADMIN_EMAIL } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import bcrypt from "bcrypt";

function handleZodError(err: unknown) {
  if (err instanceof ZodError) {
    return fromZodError(err).message;
  }
  return (err as Error).message;
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    if (!user.isActive) {
      return res.status(403).json({ message: "Your account has been deactivated. Contact an administrator." });
    }
    if (!user.password) {
      return res.status(401).json({ message: "No password set. Contact an administrator to set your password." });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    req.session.userId = user.id;
    req.session.userEmail = user.email;
    req.session.userRole = user.appRole;
    res.json({ id: user.id, name: user.name, email: user.email, appRole: user.appRole, orgRole: user.orgRole });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json({ id: user.id, name: user.name, email: user.email, appRole: user.appRole, orgRole: user.orgRole });
  });

  app.post("/api/auth/set-password", requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }
    const user = await storage.getUser(req.session.userId!);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.password && currentPassword) {
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) return res.status(401).json({ message: "Current password is incorrect" });
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await storage.updateUserPassword(user.id, hashed);
    res.json({ message: "Password updated" });
  });

  app.get("/api/projects", requireAuth, async (_req, res) => {
    const projects = await storage.getProjects();
    res.json(projects);
  });

  app.get("/api/projects/:id", requireAuth, async (req, res) => {
    const project = await storage.getProject(Number(req.params.id));
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json(project);
  });

  app.post("/api/projects", requireAuth, async (req, res) => {
    try {
      const validated = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validated);
      res.status(201).json(project);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  app.get("/api/daily-reports", requireAuth, async (req, res) => {
    const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    let reports = await storage.getDailyReports();
    if (projectId) reports = reports.filter(r => r.projectId === projectId);
    if (startDate) reports = reports.filter(r => r.reportDate >= startDate);
    if (endDate) reports = reports.filter(r => r.reportDate <= endDate);
    res.json(reports);
  });

  app.get("/api/daily-reports/:id", requireAuth, async (req, res) => {
    const report = await storage.getDailyReport(Number(req.params.id));
    if (!report) return res.status(404).json({ message: "Report not found" });
    res.json(report);
  });

  app.post("/api/daily-reports", requireAuth, async (req, res) => {
    try {
      const validated = insertDailyReportSchema.parse(req.body);
      const report = await storage.createDailyReport(validated);
      res.status(201).json(report);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  app.patch("/api/daily-reports/:id", requireAuth, async (req, res) => {
    try {
      const partial = insertDailyReportSchema.partial().parse(req.body);
      const report = await storage.updateDailyReport(Number(req.params.id), partial);
      if (!report) return res.status(404).json({ message: "Report not found" });
      res.json(report);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  app.get("/api/weekly-plans", requireAuth, async (_req, res) => {
    const plans = await storage.getWeeklyPlans();
    res.json(plans);
  });

  app.get("/api/weekly-plans/:id", requireAuth, async (req, res) => {
    const plan = await storage.getWeeklyPlan(Number(req.params.id));
    if (!plan) return res.status(404).json({ message: "Plan not found" });
    res.json(plan);
  });

  app.post("/api/weekly-plans", requireAuth, async (req, res) => {
    try {
      const validated = insertWeeklyPlanSchema.parse(req.body);
      const plan = await storage.createWeeklyPlan(validated);
      res.status(201).json(plan);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  app.patch("/api/weekly-plans/:id", requireAuth, async (req, res) => {
    try {
      const partial = insertWeeklyPlanSchema.partial().parse(req.body);
      const plan = await storage.updateWeeklyPlan(Number(req.params.id), partial);
      if (!plan) return res.status(404).json({ message: "Plan not found" });
      res.json(plan);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  app.get("/api/users", requireAuth, async (_req, res) => {
    const userList = await storage.getUsers();
    const sanitized = userList.map(({ password, ...rest }) => rest);
    res.json(sanitized);
  });

  app.get("/api/users/:id", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    const { password, ...rest } = user;
    res.json(rest);
  });

  app.post("/api/users", requireAuth, async (req, res) => {
    try {
      const validated = insertUserSchema.parse(req.body);
      const existing = await storage.getUserByEmail(validated.email);
      if (existing) return res.status(409).json({ message: "A user with this email already exists" });
      const user = await storage.createUser(validated);
      const { password, ...rest } = user;
      res.status(201).json(rest);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  app.patch("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) return res.status(404).json({ message: "User not found" });
      if (targetUser.email === SUPER_ADMIN_EMAIL) {
        if (req.body.isActive === false) {
          return res.status(403).json({ message: "Cannot deactivate the super admin" });
        }
        if (req.body.appRole && req.body.appRole !== "admin") {
          return res.status(403).json({ message: "Cannot change super admin role" });
        }
      }
      const partial = insertUserSchema.partial().parse(req.body);
      const user = await storage.updateUser(req.params.id, partial);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { password, ...rest } = user;
      res.json(rest);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  app.delete("/api/users/:id", requireAuth, async (req, res) => {
    const targetUser = await storage.getUser(req.params.id);
    if (!targetUser) return res.status(404).json({ message: "User not found" });
    if (targetUser.email === SUPER_ADMIN_EMAIL) {
      return res.status(403).json({ message: "Cannot delete the super admin" });
    }
    const deleted = await storage.deleteUser(req.params.id);
    if (!deleted) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted" });
  });

  app.post("/api/users/:id/set-password", requireAuth, async (req, res) => {
    const { password: newPwd } = req.body;
    if (!newPwd || newPwd.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }
    const targetUser = await storage.getUser(req.params.id);
    if (!targetUser) return res.status(404).json({ message: "User not found" });
    const hashed = await bcrypt.hash(newPwd, 10);
    await storage.updateUserPassword(req.params.id, hashed);
    res.json({ message: "Password set" });
  });

  return httpServer;
}
