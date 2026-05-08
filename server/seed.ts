import { db } from "./db";
import { projects, dailyReports, weeklyPlans, users, rolePrivileges, SUPER_ADMIN_EMAIL, ORG_ROLES, PERMISSIONS } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";
import bcrypt from "bcrypt";

const DEMO_EMAILS = [
  "ahmed@memconstruction.ae",
  "khalid@memconstruction.ae",
  "fatima@memconstruction.ae",
  "omar@memconstruction.ae",
  "sarah@memconstruction.ae",
  "ravi@memconstruction.ae",
];

const DEMO_PROJECT_CODES = ["ART-001", "MHR-002", "BBO-003"];

export async function seedDatabase() {
  const superAdmin = await db.select().from(users).where(eq(users.email, SUPER_ADMIN_EMAIL));
  if (superAdmin.length === 0) {
    const hashedPassword = await bcrypt.hash("admin123", 12);
    await db.insert(users).values({
      name: "Super Admin",
      email: SUPER_ADMIN_EMAIL,
      phone: null,
      password: hashedPassword,
      orgRole: "Director",
      appRole: "admin",
      isActive: true,
    });
  }

  const demoProjects = await db.select().from(projects).where(inArray(projects.code, DEMO_PROJECT_CODES));
  if (demoProjects.length > 0) {
    const demoProjectIds = demoProjects.map(p => p.id);
    await db.delete(dailyReports).where(inArray(dailyReports.projectId, demoProjectIds));
    await db.delete(weeklyPlans).where(inArray(weeklyPlans.projectId, demoProjectIds));
    await db.delete(projects).where(inArray(projects.id, demoProjectIds));
    console.log("Cleaned up demo projects and related data");
  }

  const demoUsers = await db.select().from(users).where(inArray(users.email, DEMO_EMAILS));
  if (demoUsers.length > 0) {
    await db.delete(users).where(inArray(users.email, DEMO_EMAILS));
    console.log("Cleaned up demo users");
  }

  const existingPrivileges = await db.select().from(rolePrivileges);
  if (existingPrivileges.length === 0) {
    const directorPermissions = [...PERMISSIONS];
    for (const role of ORG_ROLES) {
      let permissions: string[] = [];
      if (role === "Director") {
        permissions = directorPermissions;
      }
      await db.insert(rolePrivileges).values({
        orgRole: role,
        permissions,
      }).onConflictDoNothing();
    }
  } else {
    const allPerms = [...PERMISSIONS] as string[];
    for (const row of existingPrivileges) {
      const existing = row.permissions as string[];
      const missing = allPerms.filter(p => !existing.includes(p));
      if (missing.length > 0 && row.orgRole === "Director") {
        await db.update(rolePrivileges).set({ permissions: [...existing, ...missing] }).where(eq(rolePrivileges.orgRole, row.orgRole));
      }
    }
    const existingRoles = new Set(existingPrivileges.map(r => r.orgRole));
    for (const role of ORG_ROLES) {
      if (!existingRoles.has(role)) {
        const permissions = role === "Director" ? [...PERMISSIONS] : [];
        await db.insert(rolePrivileges).values({ orgRole: role, permissions }).onConflictDoNothing();
        console.log(`Seeded missing role privileges row for: ${role}`);
      }
    }
  }

  console.log("Database seeded successfully");
}
