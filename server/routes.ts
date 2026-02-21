import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProjectSchema, insertDailyReportSchema, insertWeeklyPlanSchema, insertUserSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

function handleZodError(err: unknown) {
  if (err instanceof ZodError) {
    return fromZodError(err).message;
  }
  return (err as Error).message;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/projects", async (_req, res) => {
    const projects = await storage.getProjects();
    res.json(projects);
  });

  app.get("/api/projects/:id", async (req, res) => {
    const project = await storage.getProject(Number(req.params.id));
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json(project);
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const validated = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validated);
      res.status(201).json(project);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  app.get("/api/daily-reports", async (req, res) => {
    const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    let reports = await storage.getDailyReports();
    if (projectId) reports = reports.filter(r => r.projectId === projectId);
    if (startDate) reports = reports.filter(r => r.reportDate >= startDate);
    if (endDate) reports = reports.filter(r => r.reportDate <= endDate);
    res.json(reports);
  });

  app.get("/api/daily-reports/:id", async (req, res) => {
    const report = await storage.getDailyReport(Number(req.params.id));
    if (!report) return res.status(404).json({ message: "Report not found" });
    res.json(report);
  });

  app.post("/api/daily-reports", async (req, res) => {
    try {
      const validated = insertDailyReportSchema.parse(req.body);
      const report = await storage.createDailyReport(validated);
      res.status(201).json(report);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  app.patch("/api/daily-reports/:id", async (req, res) => {
    try {
      const partial = insertDailyReportSchema.partial().parse(req.body);
      const report = await storage.updateDailyReport(Number(req.params.id), partial);
      if (!report) return res.status(404).json({ message: "Report not found" });
      res.json(report);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  app.get("/api/weekly-plans", async (_req, res) => {
    const plans = await storage.getWeeklyPlans();
    res.json(plans);
  });

  app.get("/api/weekly-plans/:id", async (req, res) => {
    const plan = await storage.getWeeklyPlan(Number(req.params.id));
    if (!plan) return res.status(404).json({ message: "Plan not found" });
    res.json(plan);
  });

  app.post("/api/weekly-plans", async (req, res) => {
    try {
      const validated = insertWeeklyPlanSchema.parse(req.body);
      const plan = await storage.createWeeklyPlan(validated);
      res.status(201).json(plan);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  app.patch("/api/weekly-plans/:id", async (req, res) => {
    try {
      const partial = insertWeeklyPlanSchema.partial().parse(req.body);
      const plan = await storage.updateWeeklyPlan(Number(req.params.id), partial);
      if (!plan) return res.status(404).json({ message: "Plan not found" });
      res.json(plan);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  app.get("/api/users", async (_req, res) => {
    const userList = await storage.getUsers();
    res.json(userList);
  });

  app.get("/api/users/:id", async (req, res) => {
    const user = await storage.getUser(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  });

  app.post("/api/users", async (req, res) => {
    try {
      const validated = insertUserSchema.parse(req.body);
      const existing = await storage.getUserByEmail(validated.email);
      if (existing) return res.status(409).json({ message: "A user with this email already exists" });
      const user = await storage.createUser(validated);
      res.status(201).json(user);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const partial = insertUserSchema.partial().parse(req.body);
      const user = await storage.updateUser(req.params.id, partial);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (err: unknown) {
      res.status(400).json({ message: handleZodError(err) });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    const deleted = await storage.deleteUser(req.params.id);
    if (!deleted) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted" });
  });

  return httpServer;
}
