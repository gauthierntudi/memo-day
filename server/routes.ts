import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { insertProjectSchema, insertDailyReportSchema, insertWeeklyPlanSchema, insertUserSchema, dailyReports, weeklyPlans, SUPER_ADMIN_EMAIL } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const uploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, unique + ext);
  },
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|heic)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

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

  app.use("/uploads", requireAuth, express.static(uploadsDir));

  app.post("/api/uploads", requireAuth, upload.array("photos", 10), (req, res) => {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }
    const urls = files.map(f => `/uploads/${f.filename}`);
    res.json({ urls });
  });

  app.delete("/api/uploads", requireAuth, (req, res) => {
    const { url } = req.body;
    if (url && typeof url === "string") {
      const filename = path.basename(url);
      const filePath = path.join(uploadsDir, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    res.json({ success: true });
  });

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

  app.patch("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      const partial = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(Number(req.params.id), partial);
      if (!project) return res.status(404).json({ message: "Project not found" });
      res.json(project);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  app.delete("/api/projects/:id", requireAuth, async (req, res) => {
    const deleted = await storage.deleteProject(Number(req.params.id));
    if (!deleted) return res.status(404).json({ message: "Project not found" });
    res.json({ message: "Project deleted" });
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

  app.post("/api/daily-reports/:id/submit", requireAuth, async (req, res) => {
    try {
      const report = await storage.getDailyReport(Number(req.params.id));
      if (!report) return res.status(404).json({ message: "Report not found" });
      if (report.status !== "draft" && report.status !== "rejected") {
        return res.status(400).json({ message: "Only draft or rejected reports can be submitted" });
      }
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ message: "User not found" });
      const updated = await storage.updateDailyReport(report.id, {
        status: "submitted",
        submittedBy: user.name,
        rejectionReason: null,
        approvedBy: null,
      });
      if (updated) {
        await db.update(dailyReports).set({ submittedAt: new Date(), approvedAt: null }).where(eq(dailyReports.id, report.id));
        const final = await storage.getDailyReport(report.id);
        return res.json(final);
      }
      res.json(updated);
    } catch (err: unknown) {
      res.status(500).json({ message: (err as Error).message });
    }
  });

  app.post("/api/daily-reports/:id/approve", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ message: "User not found" });
      if (user.orgRole !== "Development Manager") {
        return res.status(403).json({ message: "Only Development Managers can approve reports" });
      }
      const report = await storage.getDailyReport(Number(req.params.id));
      if (!report) return res.status(404).json({ message: "Report not found" });
      if (report.status !== "submitted") {
        return res.status(400).json({ message: "Only submitted reports can be approved" });
      }
      const updated = await storage.updateDailyReport(report.id, {
        status: "approved",
        approvedBy: user.name,
      });
      if (updated) {
        await db.update(dailyReports).set({ approvedAt: new Date() }).where(eq(dailyReports.id, report.id));
        const final = await storage.getDailyReport(report.id);
        return res.json(final);
      }
      res.json(updated);
    } catch (err: unknown) {
      res.status(500).json({ message: (err as Error).message });
    }
  });

  app.post("/api/daily-reports/:id/reject", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ message: "User not found" });
      if (user.orgRole !== "Development Manager") {
        return res.status(403).json({ message: "Only Development Managers can reject reports" });
      }
      const report = await storage.getDailyReport(Number(req.params.id));
      if (!report) return res.status(404).json({ message: "Report not found" });
      if (report.status !== "submitted") {
        return res.status(400).json({ message: "Only submitted reports can be rejected" });
      }
      const { reason } = req.body;
      const updated = await storage.updateDailyReport(report.id, {
        status: "rejected",
        rejectionReason: reason || "No reason provided",
        approvedBy: null,
      });
      res.json(updated);
    } catch (err: unknown) {
      res.status(500).json({ message: (err as Error).message });
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

  app.post("/api/weekly-plans/:id/submit", requireAuth, async (req, res) => {
    try {
      const plan = await storage.getWeeklyPlan(Number(req.params.id));
      if (!plan) return res.status(404).json({ message: "Plan not found" });
      if (plan.status !== "draft" && plan.status !== "rejected") {
        return res.status(400).json({ message: "Only draft or rejected plans can be submitted" });
      }
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ message: "User not found" });
      const updated = await storage.updateWeeklyPlan(plan.id, {
        status: "submitted",
        submittedBy: user.name,
        rejectionReason: null,
        approvedBy: null,
      });
      if (updated) {
        await db.update(weeklyPlans).set({ submittedAt: new Date(), approvedAt: null }).where(eq(weeklyPlans.id, plan.id));
        const final = await storage.getWeeklyPlan(plan.id);
        return res.json(final);
      }
      res.json(updated);
    } catch (err: unknown) {
      res.status(500).json({ message: (err as Error).message });
    }
  });

  app.post("/api/weekly-plans/:id/approve", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ message: "User not found" });
      if (user.orgRole !== "Development Manager") {
        return res.status(403).json({ message: "Only Development Managers can approve weekly plans" });
      }
      const plan = await storage.getWeeklyPlan(Number(req.params.id));
      if (!plan) return res.status(404).json({ message: "Plan not found" });
      if (plan.status !== "submitted") {
        return res.status(400).json({ message: "Only submitted plans can be approved" });
      }
      const updated = await storage.updateWeeklyPlan(plan.id, {
        status: "approved",
        approvedBy: user.name,
      });
      if (updated) {
        await db.update(weeklyPlans).set({ approvedAt: new Date() }).where(eq(weeklyPlans.id, plan.id));
        const final = await storage.getWeeklyPlan(plan.id);
        return res.json(final);
      }
      res.json(updated);
    } catch (err: unknown) {
      res.status(500).json({ message: (err as Error).message });
    }
  });

  app.post("/api/weekly-plans/:id/reject", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ message: "User not found" });
      if (user.orgRole !== "Development Manager") {
        return res.status(403).json({ message: "Only Development Managers can reject weekly plans" });
      }
      const plan = await storage.getWeeklyPlan(Number(req.params.id));
      if (!plan) return res.status(404).json({ message: "Plan not found" });
      if (plan.status !== "submitted") {
        return res.status(400).json({ message: "Only submitted plans can be rejected" });
      }
      const { reason } = req.body;
      const updated = await storage.updateWeeklyPlan(plan.id, {
        status: "rejected",
        rejectionReason: reason || "No reason provided",
        approvedBy: null,
      });
      res.json(updated);
    } catch (err: unknown) {
      res.status(500).json({ message: (err as Error).message });
    }
  });

  app.get("/api/users", requireAuth, async (_req, res) => {
    const userList = await storage.getUsers();
    const sanitized = userList.map(({ password, ...rest }) => rest);
    res.json(sanitized);
  });

  app.get("/api/users/:id", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.params.id as string);
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
      const id = req.params.id as string;
      const targetUser = await storage.getUser(id);
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
      const user = await storage.updateUser(id, partial);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { password, ...rest } = user;
      res.json(rest);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  app.delete("/api/users/:id", requireAuth, async (req, res) => {
    const id = req.params.id as string;
    const targetUser = await storage.getUser(id);
    if (!targetUser) return res.status(404).json({ message: "User not found" });
    if (targetUser.email === SUPER_ADMIN_EMAIL) {
      return res.status(403).json({ message: "Cannot delete the super admin" });
    }
    const deleted = await storage.deleteUser(id);
    if (!deleted) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted" });
  });

  app.post("/api/users/:id/set-password", requireAuth, async (req, res) => {
    const id = req.params.id as string;
    const { password: newPwd } = req.body;
    if (!newPwd || newPwd.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }
    const targetUser = await storage.getUser(id);
    if (!targetUser) return res.status(404).json({ message: "User not found" });
    const hashed = await bcrypt.hash(newPwd, 10);
    await storage.updateUserPassword(id, hashed);
    res.json({ message: "Password set" });
  });

  return httpServer;
}
