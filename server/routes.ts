import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { insertProjectSchema, insertDailyReportSchema, insertWeeklyPlanSchema, insertUserSchema, dailyReports, weeklyPlans, SUPER_ADMIN_EMAIL, ORG_ROLES, PERMISSIONS, type ActivityLogEntry } from "@shared/schema";

async function logEvent(userId: string | undefined, action: string, description: string, entityType?: string, entityId?: string) {
  try {
    let userName = "System";
    let userEmail: string | undefined;
    if (userId) {
      const user = await storage.getUser(userId);
      if (user) { userName = user.name; userEmail = user.email; }
    }
    await storage.createEventLog({ userId, userName, userEmail, action, entityType, entityId, description });
  } catch (e) {
    console.error("Failed to log event:", e);
  }
}
import { z, ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import rateLimit from "express-rate-limit";
import crypto from "crypto";

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
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedExt = /\.(jpg|jpeg|png|gif|webp|heic)$/i;
    const allowedMime = /^image\/(jpeg|png|gif|webp|heic)/i;
    if (allowedExt.test(path.extname(file.originalname)) && allowedMime.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed (jpg, png, gif, webp, heic)"));
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

async function getUserAllowedProjectIds(userId: string): Promise<{ allProjects: boolean; projectIds: number[] }> {
  const user = await storage.getUser(userId);
  if (!user) return { allProjects: false, projectIds: [] };
  const ids = user.projectIds as number[] | null;
  if (!ids || ids.length === 0) return { allProjects: false, projectIds: [] };
  if (ids.includes(-1)) return { allProjects: true, projectIds: [] };
  return { allProjects: false, projectIds: ids };
}

function canAccessProject(allowed: { allProjects: boolean; projectIds: number[] }, projectId: number): boolean {
  if (allowed.allProjects) return true;
  return allowed.projectIds.includes(projectId);
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many login attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  skip: () => process.env.NODE_ENV !== "production",
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { message: "Too many requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

async function requirePermission(req: Request, res: Response, permission: string): Promise<boolean> {
  const user = await storage.getUser(req.session.userId!);
  if (!user) { res.status(401).json({ message: "Not authenticated" }); return false; }
  if (user.appRole === "admin") return true;
  const rows = await storage.getRolePrivileges();
  const row = rows.find(r => r.orgRole === user.orgRole);
  const perms = row ? (row.permissions as string[]) : [];
  if (!perms.includes(permission)) {
    res.status(403).json({ message: "You do not have permission to perform this action" });
    return false;
  }
  return true;
}

function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return next();
  }
  const origin = req.get("origin");
  const host = req.get("host");
  if (origin) {
    const originHost = new URL(origin).host;
    if (originHost !== host) {
      return res.status(403).json({ message: "Cross-origin request blocked" });
    }
  }
  next();
}

const OPERATIONAL_FIELDS = [
  "budgetedCost", "updatedCost", "actualDirectCost", "actualIndirectCost",
  "directCostDetails", "indirectCostDetails",
  "delayDays", "schedulePercentage", "performancePercentage",
] as const;

const FINANCIAL_FIELDS = [
  "projectValue", "updatedProjectValue", "billedAmount", "unbilledAmount",
  "spiIndex", "cpiIndex",
] as const;

function stripProjectFields(project: any, canViewOperational: boolean, canViewFinancial: boolean) {
  const p = { ...project };
  if (canViewFinancial) {
    const pv = p.projectValue as number | null;
    const upv = p.updatedProjectValue as number | null;
    const bc = p.budgetedCost as number | null;
    const uc = p.updatedCost as number | null;
    const adc = p.actualDirectCost as number | null;
    const aic = p.actualIndirectCost as number | null;
    const ba = p.billedAmount as number | null;
    const uba = p.unbilledAmount as number | null;
    const ev = (ba != null || uba != null) ? (ba ?? 0) + (uba ?? 0) : null;
    const atc = (adc != null || aic != null) ? (adc ?? 0) + (aic ?? 0) : null;
    p.computedBudgetedGP = pv != null && bc != null && pv !== 0 ? ((pv - bc) / pv) * 100 : null;
    const updatedCV = upv ?? pv;
    const updatedC = uc ?? bc;
    p.computedUpdatedGP = updatedCV != null && updatedC != null && updatedCV !== 0 ? ((updatedCV - updatedC) / updatedCV) * 100 : null;
    p.computedCurrentGP = ev != null && atc != null && ev !== 0 ? ((ev - atc) / ev) * 100 : null;
    p.computedCostVariance = ev != null && atc != null ? ev - atc : null;
    p.computedEarnedValue = ev;
    p.computedActualTotalCost = atc;
  }
  if (!canViewOperational) {
    for (const f of OPERATIONAL_FIELDS) p[f] = null;
  }
  if (!canViewFinancial) {
    for (const f of FINANCIAL_FIELDS) p[f] = null;
  }
  return p;
}

async function getUserProjectPermissions(userId: string) {
  const user = await storage.getUser(userId);
  if (!user) return { canViewOperational: false, canViewFinancial: false, canEditOperational: false, canEditFinancial: false };
  if (user.appRole === "admin") return { canViewOperational: true, canViewFinancial: true, canEditOperational: true, canEditFinancial: true };
  const rows = await storage.getRolePrivileges();
  const row = rows.find(r => r.orgRole === user.orgRole);
  const perms = row ? (row.permissions as string[]) : [];
  return {
    canViewOperational: perms.includes("view_project_operational"),
    canViewFinancial: perms.includes("view_project_financial"),
    canEditOperational: perms.includes("edit_project_operational"),
    canEditFinancial: perms.includes("edit_project_financial"),
  };
}

async function syncWeeklyPlanFromReports(projectId: number, reportDate: string) {
  try {
    const allPlans = await storage.getWeeklyPlans();
    const plan = allPlans.find(
      p => p.projectId === projectId && p.weekStartDate <= reportDate && p.weekEndDate >= reportDate
    );
    if (!plan) return;
    const allReports = await storage.getDailyReports();
    const weekReports = allReports.filter(
      r => r.projectId === projectId && r.reportDate >= plan.weekStartDate && r.reportDate <= plan.weekEndDate
    );
    const plannedActivities = (plan.plannedActivities as any[]) || [];
    const updatedActivities = plannedActivities.map((a, i) => {
      let max = 0;
      for (const r of weekReports) {
        const arr = (r.plannedActivitiesActuals as { index: number; actualPercent: number }[]) || [];
        const found = arr.find(x => x.index === i);
        if (found && Number.isFinite(found.actualPercent) && found.actualPercent > max) max = found.actualPercent;
      }
      return { ...a, actualPercent: max };
    });
    const plannedLabour = (plan.plannedLabour as any[]) || [];
    const sortedReports = [...weekReports].sort((a, b) => a.reportDate.localeCompare(b.reportDate));
    const latestReport = sortedReports[sortedReports.length - 1];
    const latestLabourActuals = ((latestReport?.plannedLabourActuals as { index: number; actualCount: number }[]) || []);
    const updatedLabour = plannedLabour.map((l, i) => {
      const found = latestLabourActuals.find(x => x.index === i);
      return found ? { ...l, actualCount: found.actualCount } : { ...l, actualCount: l.actualCount ?? 0 };
    });
    await storage.updateWeeklyPlan(plan.id, {
      plannedActivities: updatedActivities as any,
      plannedLabour: updatedLabour as any,
    });
  } catch (e) {
    console.error("Failed to sync weekly plan from daily reports:", e);
  }
}

async function appendDailyReportLog(reportId: number, action: string, userName: string, details?: string) {
  const report = await storage.getDailyReport(reportId);
  if (!report) return;
  const log = (report.activityLog as ActivityLogEntry[]) || [];
  const entry: ActivityLogEntry = {
    action,
    userName,
    timestamp: new Date().toISOString(),
    ...(details ? { details } : {}),
  };
  log.push(entry);
  await db.update(dailyReports).set({ activityLog: log }).where(eq(dailyReports.id, reportId));
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.use("/api", apiLimiter);
  app.use("/api", csrfProtection);

  app.post("/api/uploads", requireAuth, upload.array("photos", 20), async (req, res) => {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }
    const MAX_BYTES = 600 * 1024;
    const urls: string[] = [];
    for (const f of files) {
      const raw = fs.readFileSync(f.path);
      try { fs.unlinkSync(f.path); } catch {}
      let finalBuf = raw;
      let mime = f.mimetype || "image/jpeg";
      if (raw.length > MAX_BYTES) {
        try {
          let quality = 80;
          let resized = await sharp(raw).jpeg({ quality }).toBuffer();
          while (resized.length > MAX_BYTES && quality > 10) {
            quality -= 10;
            resized = await sharp(raw).jpeg({ quality }).toBuffer();
          }
          if (resized.length > MAX_BYTES) {
            let width = 1920;
            while (resized.length > MAX_BYTES && width > 200) {
              width = Math.round(width * 0.75);
              resized = await sharp(raw).resize({ width, withoutEnlargement: true }).jpeg({ quality: Math.max(quality, 30) }).toBuffer();
            }
          }
          finalBuf = Buffer.from(resized);
          mime = "image/jpeg";
        } catch {}
      }
      urls.push(`data:${mime};base64,${finalBuf.toString("base64")}`);
    }
    logEvent(req.session.userId, "Upload Photos", `Uploaded ${urls.length} photo(s)`, "upload", undefined);
    res.json({ urls });
  });

  app.delete("/api/uploads", requireAuth, (_req, res) => {
    res.json({ success: true });
  });

  app.post("/api/auth/login", loginLimiter, async (req, res) => {
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
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ message: "Session error" });
      req.session.userId = user.id;
      req.session.userEmail = user.email;
      req.session.userRole = user.appRole;
      req.session.save((err) => {
        if (err) return res.status(500).json({ message: "Session error" });
        logEvent(user.id, "Login", `User logged in`, "user", user.id);
        res.json({ id: user.id, name: user.name, email: user.email, appRole: user.appRole, orgRole: user.orgRole });
      });
    });
  });

  app.post("/api/auth/logout", (req, res) => {
    const uid = req.session.userId;
    if (uid) logEvent(uid, "Logout", "User logged out", "user", uid);
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
    if (!user || !user.isActive) {
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
    if (user.password) {
      if (!currentPassword) {
        return res.status(400).json({ message: "Current password is required" });
      }
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) return res.status(401).json({ message: "Current password is incorrect" });
    }
    const hashed = await bcrypt.hash(newPassword, 12);
    await storage.updateUserPassword(user.id, hashed);
    logEvent(req.session.userId, "Password Changed", "User changed their own password", "user", user.id);
    res.json({ message: "Password updated" });
  });

  app.get("/api/projects", requireAuth, async (req, res) => {
    let projects = await storage.getProjects();
    const allowed = await getUserAllowedProjectIds(req.session.userId!);
    if (!allowed.allProjects) {
      projects = projects.filter(p => allowed.projectIds.includes(p.id));
    }
    const pp = await getUserProjectPermissions(req.session.userId!);
    res.json(projects.map(p => stripProjectFields(p, pp.canViewOperational, pp.canViewFinancial)));
  });

  app.get("/api/projects/:id", requireAuth, async (req, res) => {
    const project = await storage.getProject(Number(req.params.id));
    if (!project) return res.status(404).json({ message: "Project not found" });
    const allowed = await getUserAllowedProjectIds(req.session.userId!);
    if (!canAccessProject(allowed, project.id)) {
      return res.status(403).json({ message: "You do not have access to this project" });
    }
    const pp = await getUserProjectPermissions(req.session.userId!);
    res.json(stripProjectFields(project, pp.canViewOperational, pp.canViewFinancial));
  });

  app.post("/api/projects", requireAuth, async (req, res) => {
    if (!(await requirePermission(req, res, "edit_projects"))) return;
    try {
      const validated = insertProjectSchema.parse(req.body);
      const existing = await storage.getProjects();
      if (existing.some(p => p.code.toLowerCase() === validated.code.toLowerCase())) {
        return res.status(400).json({ message: "A project with this code already exists" });
      }
      const project = await storage.createProject(validated);
      logEvent(req.session.userId, "Create Project", `Created project "${validated.name}" (${validated.code})`, "project", String(project.id));
      res.status(201).json(project);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  app.patch("/api/projects/:id", requireAuth, async (req, res) => {
    if (!(await requirePermission(req, res, "edit_projects"))) return;
    try {
      const allowed = await getUserAllowedProjectIds(req.session.userId!);
      if (!canAccessProject(allowed, Number(req.params.id))) {
        return res.status(403).json({ message: "You do not have access to this project" });
      }
      const partial = insertProjectSchema.partial().parse(req.body);
      const pp = await getUserProjectPermissions(req.session.userId!);
      if (!pp.canEditOperational) {
        for (const f of OPERATIONAL_FIELDS) delete (partial as any)[f];
        delete (partial as any).code;
      }
      if (!pp.canEditFinancial) {
        for (const f of FINANCIAL_FIELDS) delete (partial as any)[f];
      }
      if (partial.code) {
        const existing = await storage.getProjects();
        if (existing.some(p => p.id !== Number(req.params.id) && p.code.toLowerCase() === partial.code!.toLowerCase())) {
          return res.status(400).json({ message: "A project with this code already exists" });
        }
      }
      const project = await storage.updateProject(Number(req.params.id), partial);
      if (!project) return res.status(404).json({ message: "Project not found" });
      logEvent(req.session.userId, "Update Project", `Updated project "${project.name}"`, "project", String(project.id));
      res.json(stripProjectFields(project, pp.canViewOperational, pp.canViewFinancial));
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  app.delete("/api/projects/:id", requireAuth, async (req, res) => {
    if (!(await requirePermission(req, res, "edit_projects"))) return;
    const allowed = await getUserAllowedProjectIds(req.session.userId!);
    if (!canAccessProject(allowed, Number(req.params.id))) {
      return res.status(403).json({ message: "You do not have access to this project" });
    }
    const proj = await storage.getProject(Number(req.params.id));
    const deleted = await storage.deleteProject(Number(req.params.id));
    if (!deleted) return res.status(404).json({ message: "Project not found" });
    logEvent(req.session.userId, "Delete Project", `Deleted project "${proj?.name || req.params.id}"`, "project", String(req.params.id));
    res.json({ message: "Project deleted" });
  });

  app.get("/api/daily-reports", requireAuth, async (req, res) => {
    const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const allowed = await getUserAllowedProjectIds(req.session.userId!);
    let reports = await storage.getDailyReports();
    if (!allowed.allProjects) {
      reports = reports.filter(r => allowed.projectIds.includes(r.projectId));
    }
    if (projectId) reports = reports.filter(r => r.projectId === projectId);
    if (startDate) reports = reports.filter(r => r.reportDate >= startDate);
    if (endDate) reports = reports.filter(r => r.reportDate <= endDate);
    res.json(reports);
  });

  app.get("/api/daily-reports/:id", requireAuth, async (req, res) => {
    const report = await storage.getDailyReport(Number(req.params.id));
    if (!report) return res.status(404).json({ message: "Report not found" });
    const allowed = await getUserAllowedProjectIds(req.session.userId!);
    if (!canAccessProject(allowed, report.projectId)) {
      return res.status(403).json({ message: "You do not have access to this project" });
    }
    res.json(report);
  });

  app.post("/api/daily-reports", requireAuth, async (req, res) => {
    if (!(await requirePermission(req, res, "create_daily_report"))) return;
    try {
      const validated = insertDailyReportSchema.parse(req.body);
      const allowed = await getUserAllowedProjectIds(req.session.userId!);
      if (!canAccessProject(allowed, validated.projectId)) {
        return res.status(403).json({ message: "You do not have access to this project" });
      }
      const user = await storage.getUser(req.session.userId!);
      const report = await storage.createDailyReport(validated);
      await appendDailyReportLog(report.id, "Created", user?.name || "Unknown");
      await syncWeeklyPlanFromReports(report.projectId, report.reportDate);
      logEvent(req.session.userId, "Create Daily Report", `Created daily report for ${validated.reportDate}`, "daily_report", String(report.id));
      const final = await storage.getDailyReport(report.id);
      res.status(201).json(final);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  app.patch("/api/daily-reports/:id", requireAuth, async (req, res) => {
    if (!(await requirePermission(req, res, "edit_save_daily_report"))) return;
    try {
      const existing = await storage.getDailyReport(Number(req.params.id));
      if (!existing) return res.status(404).json({ message: "Report not found" });
      const allowed = await getUserAllowedProjectIds(req.session.userId!);
      if (!canAccessProject(allowed, existing.projectId)) {
        return res.status(403).json({ message: "You do not have access to this project" });
      }
      const partial = insertDailyReportSchema.partial().parse(req.body);
      const user = await storage.getUser(req.session.userId!);
      const report = await storage.updateDailyReport(Number(req.params.id), partial);
      if (!report) return res.status(404).json({ message: "Report not found" });
      await appendDailyReportLog(report.id, "Saved", user?.name || "Unknown");
      await syncWeeklyPlanFromReports(report.projectId, report.reportDate);
      logEvent(req.session.userId, "Update Daily Report", `Updated daily report #${report.id} (${report.reportDate})`, "daily_report", String(report.id));
      const final = await storage.getDailyReport(report.id);
      res.json(final);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  app.post("/api/daily-reports/:id/submit", requireAuth, async (req, res) => {
    if (!(await requirePermission(req, res, "submit_daily_report"))) return;
    try {
      const report = await storage.getDailyReport(Number(req.params.id));
      if (!report) return res.status(404).json({ message: "Report not found" });
      const allowed = await getUserAllowedProjectIds(req.session.userId!);
      if (!canAccessProject(allowed, report.projectId)) {
        return res.status(403).json({ message: "You do not have access to this project" });
      }
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
        await appendDailyReportLog(report.id, "Submitted", user.name);
        logEvent(req.session.userId, "Submit Daily Report", `Submitted daily report #${report.id} (${report.reportDate})`, "daily_report", String(report.id));
        const final = await storage.getDailyReport(report.id);
        return res.json(final);
      }
      res.json(updated);
    } catch (err: unknown) {
      console.error("Submit daily report error:", err);
      res.status(500).json({ message: "Failed to submit report" });
    }
  });

  app.post("/api/daily-reports/:id/approve", requireAuth, async (req, res) => {
    if (!(await requirePermission(req, res, "approve_reject_daily_report"))) return;
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ message: "User not found" });
      const report = await storage.getDailyReport(Number(req.params.id));
      if (!report) return res.status(404).json({ message: "Report not found" });
      const allowed = await getUserAllowedProjectIds(req.session.userId!);
      if (!canAccessProject(allowed, report.projectId)) {
        return res.status(403).json({ message: "You do not have access to this project" });
      }
      if (report.status !== "submitted") {
        return res.status(400).json({ message: "Only submitted reports can be approved" });
      }
      const updated = await storage.updateDailyReport(report.id, {
        status: "approved",
        approvedBy: user.name,
      });
      if (updated) {
        await db.update(dailyReports).set({ approvedAt: new Date() }).where(eq(dailyReports.id, report.id));
        await appendDailyReportLog(report.id, "Approved", user.name);
        logEvent(req.session.userId, "Approve Daily Report", `Approved daily report #${report.id} (${report.reportDate})`, "daily_report", String(report.id));
        const final = await storage.getDailyReport(report.id);
        return res.json(final);
      }
      res.json(updated);
    } catch (err: unknown) {
      console.error("Approve daily report error:", err);
      res.status(500).json({ message: "Failed to approve report" });
    }
  });

  app.post("/api/daily-reports/:id/reject", requireAuth, async (req, res) => {
    if (!(await requirePermission(req, res, "approve_reject_daily_report"))) return;
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ message: "User not found" });
      const report = await storage.getDailyReport(Number(req.params.id));
      if (!report) return res.status(404).json({ message: "Report not found" });
      const allowed = await getUserAllowedProjectIds(req.session.userId!);
      if (!canAccessProject(allowed, report.projectId)) {
        return res.status(403).json({ message: "You do not have access to this project" });
      }
      if (report.status !== "submitted") {
        return res.status(400).json({ message: "Only submitted reports can be rejected" });
      }
      const { reason } = req.body;
      const updated = await storage.updateDailyReport(report.id, {
        status: "rejected",
        rejectionReason: reason || "No reason provided",
        approvedBy: null,
      });
      await appendDailyReportLog(report.id, "Rejected", user.name, reason || "No reason provided");
      logEvent(req.session.userId, "Reject Daily Report", `Rejected daily report #${report.id} (${report.reportDate}): ${reason || "No reason"}`, "daily_report", String(report.id));
      const final = await storage.getDailyReport(report.id);
      res.json(final);
    } catch (err: unknown) {
      console.error("Reject daily report error:", err);
      res.status(500).json({ message: "Failed to reject report" });
    }
  });

  app.get("/api/weekly-plans", requireAuth, async (req, res) => {
    const allowed = await getUserAllowedProjectIds(req.session.userId!);
    let plans = await storage.getWeeklyPlans();
    if (!allowed.allProjects) {
      plans = plans.filter(p => allowed.projectIds.includes(p.projectId));
    }
    res.json(plans);
  });

  app.get("/api/weekly-plans/:id", requireAuth, async (req, res) => {
    const plan = await storage.getWeeklyPlan(Number(req.params.id));
    if (!plan) return res.status(404).json({ message: "Plan not found" });
    const allowed = await getUserAllowedProjectIds(req.session.userId!);
    if (!canAccessProject(allowed, plan.projectId)) {
      return res.status(403).json({ message: "You do not have access to this project" });
    }
    res.json(plan);
  });

  app.post("/api/weekly-plans", requireAuth, async (req, res) => {
    if (!(await requirePermission(req, res, "create_weekly_plan"))) return;
    try {
      const validated = insertWeeklyPlanSchema.parse(req.body);
      const allowed = await getUserAllowedProjectIds(req.session.userId!);
      if (!canAccessProject(allowed, validated.projectId)) {
        return res.status(403).json({ message: "You do not have access to this project" });
      }
      if (validated.weekStartDate && validated.weekEndDate) {
        const existingPlans = await storage.getWeeklyPlans();
        const overlap = existingPlans.find(p =>
          p.projectId === validated.projectId &&
          p.weekStartDate && p.weekEndDate &&
          p.weekStartDate <= validated.weekEndDate &&
          p.weekEndDate >= validated.weekStartDate
        );
        if (overlap) {
          return res.status(400).json({ message: `Date range overlaps with existing weekly plan (Week ${overlap.weekNumber}: ${overlap.weekStartDate} — ${overlap.weekEndDate})` });
        }
      }
      const plan = await storage.createWeeklyPlan(validated);
      logEvent(req.session.userId, "Create Weekly Plan", `Created weekly plan for week ${validated.weekNumber} (${validated.weekStartDate} — ${validated.weekEndDate})`, "weekly_plan", String(plan.id));
      res.status(201).json(plan);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  app.patch("/api/weekly-plans/:id", requireAuth, async (req, res) => {
    if (!(await requirePermission(req, res, "edit_save_weekly_plan"))) return;
    try {
      const existing = await storage.getWeeklyPlan(Number(req.params.id));
      if (!existing) return res.status(404).json({ message: "Plan not found" });
      const allowed = await getUserAllowedProjectIds(req.session.userId!);
      if (!canAccessProject(allowed, existing.projectId)) {
        return res.status(403).json({ message: "You do not have access to this project" });
      }
      const partial = insertWeeklyPlanSchema.partial().parse(req.body);
      const effectiveProjectId = partial.projectId ?? existing.projectId;
      if (partial.projectId && partial.projectId !== existing.projectId) {
        if (!canAccessProject(allowed, partial.projectId)) {
          return res.status(403).json({ message: "You do not have access to the target project" });
        }
      }
      const effectiveStart = partial.weekStartDate ?? existing.weekStartDate;
      const effectiveEnd = partial.weekEndDate ?? existing.weekEndDate;
      if (effectiveStart && effectiveEnd) {
        const allPlans = await storage.getWeeklyPlans();
        const overlap = allPlans.find(p =>
          p.id !== existing.id &&
          p.projectId === effectiveProjectId &&
          p.weekStartDate && p.weekEndDate &&
          p.weekStartDate <= effectiveEnd &&
          p.weekEndDate >= effectiveStart
        );
        if (overlap) {
          return res.status(400).json({ message: `Date range overlaps with existing weekly plan (Week ${overlap.weekNumber}: ${overlap.weekStartDate} — ${overlap.weekEndDate})` });
        }
      }
      const plan = await storage.updateWeeklyPlan(Number(req.params.id), partial);
      if (!plan) return res.status(404).json({ message: "Plan not found" });
      logEvent(req.session.userId, "Update Weekly Plan", `Updated weekly plan #${plan.id}`, "weekly_plan", String(plan.id));
      res.json(plan);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  app.post("/api/weekly-plans/:id/actual-labour", requireAuth, async (req, res) => {
    if (!(await requirePermission(req, res, "edit_save_daily_report"))) return;
    try {
      const existing = await storage.getWeeklyPlan(Number(req.params.id));
      if (!existing) return res.status(404).json({ message: "Plan not found" });
      const allowed = await getUserAllowedProjectIds(req.session.userId!);
      if (!canAccessProject(allowed, existing.projectId)) {
        return res.status(403).json({ message: "You do not have access to this project" });
      }
      const bodySchema = z.object({
        actuals: z.array(z.object({
          index: z.number().int().min(0),
          actualCount: z.number().finite().min(0).max(100000),
        })).max(500),
      });
      const { actuals } = bodySchema.parse(req.body);
      const current = (existing.plannedLabour as any[]) || [];
      const updated = current.map((l, i) => {
        const found = actuals.find(x => x.index === i);
        return found ? { ...l, actualCount: found.actualCount } : l;
      });
      const plan = await storage.updateWeeklyPlan(existing.id, { plannedLabour: updated as any });
      if (!plan) return res.status(404).json({ message: "Plan not found" });
      logEvent(req.session.userId, "Update Actual Labour", `Updated actual labour on weekly plan #${plan.id}`, "weekly_plan", String(plan.id));
      res.json(plan);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  app.post("/api/weekly-plans/:id/actual-progress", requireAuth, async (req, res) => {
    if (!(await requirePermission(req, res, "edit_save_daily_report"))) return;
    try {
      const existing = await storage.getWeeklyPlan(Number(req.params.id));
      if (!existing) return res.status(404).json({ message: "Plan not found" });
      const allowed = await getUserAllowedProjectIds(req.session.userId!);
      if (!canAccessProject(allowed, existing.projectId)) {
        return res.status(403).json({ message: "You do not have access to this project" });
      }
      const bodySchema = z.object({
        actuals: z.array(z.object({
          index: z.number().int().min(0),
          actualPercent: z.number().finite().min(0).max(100),
        })).max(500),
      });
      const { actuals } = bodySchema.parse(req.body);
      const current = (existing.plannedActivities as any[]) || [];
      const updated = current.map((a, i) => {
        const found = actuals.find(x => x.index === i);
        return found ? { ...a, actualPercent: found.actualPercent } : a;
      });
      const plan = await storage.updateWeeklyPlan(existing.id, { plannedActivities: updated as any });
      if (!plan) return res.status(404).json({ message: "Plan not found" });
      logEvent(req.session.userId, "Update Actual Progress", `Updated actual progress on weekly plan #${plan.id}`, "weekly_plan", String(plan.id));
      res.json(plan);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  app.post("/api/weekly-plans/:id/submit", requireAuth, async (req, res) => {
    if (!(await requirePermission(req, res, "submit_weekly_plan"))) return;
    try {
      const plan = await storage.getWeeklyPlan(Number(req.params.id));
      if (!plan) return res.status(404).json({ message: "Plan not found" });
      const allowed = await getUserAllowedProjectIds(req.session.userId!);
      if (!canAccessProject(allowed, plan.projectId)) {
        return res.status(403).json({ message: "You do not have access to this project" });
      }
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
        logEvent(req.session.userId, "Submit Weekly Plan", `Submitted weekly plan #${plan.id}`, "weekly_plan", String(plan.id));
        const final = await storage.getWeeklyPlan(plan.id);
        return res.json(final);
      }
      res.json(updated);
    } catch (err: unknown) {
      console.error("Submit weekly plan error:", err);
      res.status(500).json({ message: "Failed to submit plan" });
    }
  });

  app.post("/api/weekly-plans/:id/approve", requireAuth, async (req, res) => {
    if (!(await requirePermission(req, res, "approve_reject_weekly_plan"))) return;
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ message: "User not found" });
      const plan = await storage.getWeeklyPlan(Number(req.params.id));
      if (!plan) return res.status(404).json({ message: "Plan not found" });
      const allowed = await getUserAllowedProjectIds(req.session.userId!);
      if (!canAccessProject(allowed, plan.projectId)) {
        return res.status(403).json({ message: "You do not have access to this project" });
      }
      if (plan.status !== "submitted") {
        return res.status(400).json({ message: "Only submitted plans can be approved" });
      }
      const updated = await storage.updateWeeklyPlan(plan.id, {
        status: "approved",
        approvedBy: user.name,
      });
      if (updated) {
        await db.update(weeklyPlans).set({ approvedAt: new Date() }).where(eq(weeklyPlans.id, plan.id));
        logEvent(req.session.userId, "Approve Weekly Plan", `Approved weekly plan #${plan.id}`, "weekly_plan", String(plan.id));
        const final = await storage.getWeeklyPlan(plan.id);
        return res.json(final);
      }
      res.json(updated);
    } catch (err: unknown) {
      console.error("Approve weekly plan error:", err);
      res.status(500).json({ message: "Failed to approve plan" });
    }
  });

  app.post("/api/weekly-plans/:id/reject", requireAuth, async (req, res) => {
    if (!(await requirePermission(req, res, "approve_reject_weekly_plan"))) return;
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ message: "User not found" });
      const plan = await storage.getWeeklyPlan(Number(req.params.id));
      if (!plan) return res.status(404).json({ message: "Plan not found" });
      const allowed = await getUserAllowedProjectIds(req.session.userId!);
      if (!canAccessProject(allowed, plan.projectId)) {
        return res.status(403).json({ message: "You do not have access to this project" });
      }
      if (plan.status !== "submitted") {
        return res.status(400).json({ message: "Only submitted plans can be rejected" });
      }
      const { reason } = req.body;
      const updated = await storage.updateWeeklyPlan(plan.id, {
        status: "rejected",
        rejectionReason: reason || "No reason provided",
        approvedBy: null,
      });
      logEvent(req.session.userId, "Reject Weekly Plan", `Rejected weekly plan #${plan.id}: ${reason || "No reason"}`, "weekly_plan", String(plan.id));
      res.json(updated);
    } catch (err: unknown) {
      console.error("Reject weekly plan error:", err);
      res.status(500).json({ message: "Failed to reject plan" });
    }
  });

  app.get("/api/users", requireAuth, async (req, res) => {
    if (!(await requirePermission(req, res, "view_users"))) return;
    const userList = await storage.getUsers();
    const sanitized = userList.map(({ password, ...rest }) => rest);
    res.json(sanitized);
  });

  app.get("/api/users/:id", requireAuth, async (req, res) => {
    if (!(await requirePermission(req, res, "view_users"))) return;
    const user = await storage.getUser(req.params.id as string);
    if (!user) return res.status(404).json({ message: "User not found" });
    const { password, ...rest } = user;
    res.json(rest);
  });

  app.post("/api/users", requireAuth, async (req, res) => {
    if (!(await requirePermission(req, res, "edit_users"))) return;
    try {
      const validated = insertUserSchema.parse(req.body);
      const existing = await storage.getUserByEmail(validated.email);
      if (existing) return res.status(409).json({ message: "A user with this email already exists" });
      const user = await storage.createUser(validated);
      logEvent(req.session.userId, "Create User", `Created user "${validated.name}" (${validated.email})`, "user", user.id);
      const { password, ...rest } = user;
      res.status(201).json(rest);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  app.patch("/api/users/:id", requireAuth, async (req, res) => {
    if (!(await requirePermission(req, res, "edit_users"))) return;
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
      logEvent(req.session.userId, "Update User", `Updated user "${user.name}" (${user.email})`, "user", user.id);
      const { password, ...rest } = user;
      res.json(rest);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  app.delete("/api/users/:id", requireAuth, async (req, res) => {
    if (!(await requirePermission(req, res, "edit_users"))) return;
    const id = req.params.id as string;
    const targetUser = await storage.getUser(id);
    if (!targetUser) return res.status(404).json({ message: "User not found" });
    if (targetUser.email === SUPER_ADMIN_EMAIL) {
      return res.status(403).json({ message: "Cannot delete the super admin" });
    }
    const deleted = await storage.deleteUser(id);
    if (!deleted) return res.status(404).json({ message: "User not found" });
    logEvent(req.session.userId, "Delete User", `Deleted user "${targetUser.name}" (${targetUser.email})`, "user", id);
    res.json({ message: "User deleted" });
  });

  app.post("/api/users/:id/set-password", requireAuth, async (req, res) => {
    if (!(await requirePermission(req, res, "edit_users"))) return;
    const id = req.params.id as string;
    const { password: newPwd } = req.body;
    if (!newPwd || newPwd.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }
    const targetUser = await storage.getUser(id);
    if (!targetUser) return res.status(404).json({ message: "User not found" });
    const hashed = await bcrypt.hash(newPwd, 12);
    await storage.updateUserPassword(id, hashed);
    logEvent(req.session.userId, "Set User Password", `Set password for user "${targetUser.name}" (${targetUser.email})`, "user", id);
    res.json({ message: "Password set" });
  });

  app.get("/api/my-permissions", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user) return res.status(401).json({ message: "Not authenticated" });
    if (user.appRole === "admin") {
      res.json({ permissions: [...PERMISSIONS], projectIds: user.projectIds || [] });
      return;
    }
    const rows = await storage.getRolePrivileges();
    const row = rows.find(r => r.orgRole === user.orgRole);
    const permissions = row ? (row.permissions as string[]) : [];
    res.json({ permissions, projectIds: user.projectIds || [] });
  });

  app.get("/api/role-privileges", requireAuth, async (req, res) => {
    if (!(await requirePermission(req, res, "view_role_privileges"))) return;
    const rows = await storage.getRolePrivileges();
    const map: Record<string, string[]> = {};
    for (const role of ORG_ROLES) {
      const row = rows.find(r => r.orgRole === role);
      map[role] = row ? (row.permissions as string[]) : [];
    }
    res.json(map);
  });

  app.put("/api/role-privileges", requireAuth, async (req, res) => {
    if (!(await requirePermission(req, res, "edit_role_privileges"))) return;
    const data = req.body as Record<string, string[]>;
    for (const [role, perms] of Object.entries(data)) {
      if (!ORG_ROLES.includes(role as any)) continue;
      const validPerms = (perms || []).filter(p => PERMISSIONS.includes(p as any));
      await storage.upsertRolePrivilege(role, validPerms);
    }
    logEvent(req.session.userId, "Update Role Privileges", "Updated role privileges matrix", "role_privileges", undefined);
    res.json({ message: "Privileges updated" });
  });

  app.get("/api/event-logs/top-users", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user || user.email !== SUPER_ADMIN_EMAIL) {
      return res.status(403).json({ message: "Access denied" });
    }
    const stats = await storage.getTopUsersStats(5);
    res.json(stats);
  });

  app.get("/api/event-logs", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user || user.email !== SUPER_ADMIN_EMAIL) {
      return res.status(403).json({ message: "Access denied" });
    }
    const limit = Math.max(1, Math.min(Math.floor(Number(req.query.limit) || 100), 500));
    const offset = Math.max(0, Math.floor(Number(req.query.offset) || 0));
    const action = (req.query.action as string) || undefined;
    const search = (req.query.search as string) || undefined;
    const [logs, total] = await Promise.all([
      storage.getEventLogs(limit, offset, action, search),
      storage.getEventLogCount(action, search),
    ]);
    res.json({ logs, total, limit, offset });
  });

  return httpServer;
}
