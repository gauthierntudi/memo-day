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

export const TEST_USER_EMAIL = "test@memconstruction.ae";
export const TEST_USER_PASSWORD = "test123";

const ROLE_DEFAULT_PERMISSIONS: Partial<Record<(typeof ORG_ROLES)[number], string[]>> = {
  "Project Manager": [
    "view_dashboard",
    "view_daily_report",
    "create_daily_report",
    "edit_save_daily_report",
    "submit_daily_report",
    "view_weekly_plan",
    "create_weekly_plan",
    "edit_save_weekly_plan",
    "submit_weekly_plan",
    "view_weekly_report",
    "view_projects",
    "view_projects_steering",
    "view_project_operational",
    "edit_project_operational",
  ],
};

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
      projectIds: [-1],
    });
  }

  const testUser = await db.select().from(users).where(eq(users.email, TEST_USER_EMAIL));
  if (testUser.length === 0) {
    const hashedPassword = await bcrypt.hash(TEST_USER_PASSWORD, 12);
    await db.insert(users).values({
      name: "Test User",
      email: TEST_USER_EMAIL,
      phone: null,
      password: hashedPassword,
      orgRole: "Project Manager",
      appRole: "user",
      isActive: true,
      projectIds: [-1],
    });
    console.log(`Seeded test user: ${TEST_USER_EMAIL}`);
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
      const permissions =
        role === "Director"
          ? directorPermissions
          : ROLE_DEFAULT_PERMISSIONS[role] ?? [];
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
      const roleDefaults = ROLE_DEFAULT_PERMISSIONS[row.orgRole as (typeof ORG_ROLES)[number]];
      if (roleDefaults && existing.length === 0) {
        await db.update(rolePrivileges).set({ permissions: roleDefaults }).where(eq(rolePrivileges.orgRole, row.orgRole));
        console.log(`Seeded default permissions for role: ${row.orgRole}`);
      }
    }
    const existingRoles = new Set(existingPrivileges.map(r => r.orgRole));
    for (const role of ORG_ROLES) {
      if (!existingRoles.has(role)) {
        const permissions =
          role === "Director" ? [...PERMISSIONS] : ROLE_DEFAULT_PERMISSIONS[role] ?? [];
        await db.insert(rolePrivileges).values({ orgRole: role, permissions }).onConflictDoNothing();
        console.log(`Seeded missing role privileges row for: ${role}`);
      }
    }
  }

  console.log("Database seeded successfully");
}
