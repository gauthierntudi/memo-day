import { db } from "./db";
import { projects, dailyReports, weeklyPlans, users } from "@shared/schema";
import { sql } from "drizzle-orm";

export async function seedDatabase() {
  const existingUsers = await db.select().from(users);
  if (existingUsers.length === 0) {
    await db.insert(users).values([
      { name: "Ahmed Al Mansoori", email: "ahmed@memconstruction.ae", phone: "+971 50 123 4567", orgRole: "Project Manager", appRole: "admin", isActive: true },
      { name: "Khalid Bin Rashid", email: "khalid@memconstruction.ae", phone: "+971 55 234 5678", orgRole: "Site Engineer", appRole: "user", isActive: true },
      { name: "Fatima Al Hashemi", email: "fatima@memconstruction.ae", phone: "+971 52 345 6789", orgRole: "Safety Officer", appRole: "user", isActive: true },
      { name: "Omar Farooq", email: "omar@memconstruction.ae", phone: "+971 56 456 7890", orgRole: "Quantity Surveyor", appRole: "viewer", isActive: true },
      { name: "Sarah Mitchell", email: "sarah@memconstruction.ae", phone: "+971 50 567 8901", orgRole: "Director", appRole: "admin", isActive: true },
      { name: "Ravi Sharma", email: "ravi@memconstruction.ae", phone: "+971 55 678 9012", orgRole: "Foreman", appRole: "user", isActive: false },
    ]);
  }

  const existingProjects = await db.select().from(projects);
  if (existingProjects.length > 0) return;

  const [p1, p2, p3] = await db.insert(projects).values([
    { name: "Al Reem Tower", code: "ART-001", location: "Abu Dhabi, Al Reem Island", client: "Al Reem Development LLC", contractor: "MEM Construction", status: "active" },
    { name: "Marina Heights Residences", code: "MHR-002", location: "Dubai Marina, Dubai", client: "Marina Holdings Group", contractor: "MEM Construction", status: "active" },
    { name: "Business Bay Office Complex", code: "BBO-003", location: "Business Bay, Dubai", client: "Bay Commercial Properties", contractor: "MEM Construction", status: "active" },
  ]).returning();

  await db.insert(dailyReports).values([
    {
      reportNumber: "DCR-ART-001",
      projectId: p1.id,
      reportDate: "2026-02-16",
      preparedBy: "Ahmed Al Mansoori",
      shiftStart: "07:00",
      shiftEnd: "17:00",
      weatherCondition: "Sunny",
      temperature: "28-34",
      windSpeed: "12",
      weatherImpact: null,
      isWorkingDay: true,
      workActivities: [
        { trade: "Structural", description: "Concrete pouring for Level 12 slab. Formwork preparation for columns L12-C1 to L12-C8.", location: "Level 12", percentComplete: 65, status: "In Progress" },
        { trade: "Electrical", description: "Conduit installation in Level 10 corridors and common areas.", location: "Level 10", percentComplete: 40, status: "In Progress" },
        { trade: "Plumbing", description: "Riser installation for hot and cold water supply from Level 8 to Level 10.", location: "Levels 8-10", percentComplete: 55, status: "In Progress" },
      ],
      labourForce: [
        { trade: "Structural", count: 24, hours: 10 },
        { trade: "Electrical", count: 8, hours: 9 },
        { trade: "Plumbing", count: 6, hours: 9 },
        { trade: "Finishing", count: 12, hours: 8 },
        { trade: "Steel Works", count: 10, hours: 10 },
      ],
      subcontractors: [
        { company: "Gulf Steel Fabricators", specialty: "Steel Works", workersCount: 10, workDescription: "Rebar tying and placement for Level 12 slab" },
        { company: "Al Noor MEP Services", specialty: "Electrical", workersCount: 8, workDescription: "Conduit and cable tray installation" },
      ],
      safetyIncidents: [],
      securityIncidents: [],
      cleaningStatus: "Satisfactory",
      cleaningNotes: null,
      equipment: [
        { name: "Tower Crane TC-01", type: "Tower Crane", status: "Operational", hoursUsed: 10, operator: "Rajesh Kumar" },
        { name: "Concrete Pump CP-02", type: "Pump", status: "Operational", hoursUsed: 8, operator: "Ali Hassan" },
        { name: "CAT 320 Excavator", type: "Excavator", status: "Idle", hoursUsed: 0, operator: "" },
      ],
      materialsIn: [
        { name: "Ready Mix Concrete C40", unit: "Cubic Meters", quantity: 85, supplier: "Emirates ReadyMix", deliveryNote: "DN-4521" },
        { name: "Steel Rebar 16mm", unit: "Tons", quantity: 12, supplier: "Gulf Steel", deliveryNote: "DN-4522" },
      ],
      materialsUsed: [
        { name: "Ready Mix Concrete C40", unit: "Cubic Meters", quantity: 72, supplier: "Level 12 slab", deliveryNote: "" },
        { name: "Steel Rebar 16mm", unit: "Tons", quantity: 8, supplier: "Level 12 columns", deliveryNote: "" },
      ],
      inventoryStatus: [
        { name: "Cement (OPC)", unit: "Bags", opening: 250, received: 0, used: 30, closing: 220, status: "Adequate" },
        { name: "Plywood 18mm", unit: "Sheets", opening: 180, received: 50, used: 45, closing: 185, status: "Adequate" },
        { name: "PVC Pipes 4 inch", unit: "Meters", opening: 120, received: 0, used: 35, closing: 85, status: "Low" },
      ],
      overallProgress: 42,
      comments: "Good progress on Level 12 concrete work. Expecting to complete slab pour by end of week.",
      status: "submitted",
    },
    {
      reportNumber: "DCR-ART-002",
      projectId: p1.id,
      reportDate: "2026-02-17",
      preparedBy: "Ahmed Al Mansoori",
      shiftStart: "07:00",
      shiftEnd: "17:00",
      weatherCondition: "Partly Cloudy",
      temperature: "26-32",
      windSpeed: "18",
      weatherImpact: "High winds caused temporary suspension of crane operations between 11:00-12:30",
      isWorkingDay: true,
      workActivities: [
        { trade: "Structural", description: "Continued formwork for Level 12 columns. Curing of Level 12 slab.", location: "Level 12", percentComplete: 70, status: "In Progress" },
        { trade: "HVAC", description: "Ductwork installation in Level 9 mechanical room and corridors.", location: "Level 9", percentComplete: 30, status: "In Progress" },
        { trade: "Finishing", description: "Plastering works on Level 7 internal walls.", location: "Level 7", percentComplete: 60, status: "In Progress" },
      ],
      labourForce: [
        { trade: "Structural", count: 22, hours: 9 },
        { trade: "HVAC", count: 6, hours: 8 },
        { trade: "Finishing", count: 15, hours: 8 },
        { trade: "Electrical", count: 8, hours: 9 },
      ],
      subcontractors: [
        { company: "Gulf Steel Fabricators", specialty: "Steel Works", workersCount: 8, workDescription: "Rebar works continuation" },
        { company: "CoolAir Systems", specialty: "HVAC", workersCount: 6, workDescription: "Ductwork and diffuser installation" },
      ],
      safetyIncidents: [
        { type: "Near Miss", severity: "Low", description: "Unsecured tool fell from Level 10 scaffold. No injuries.", actionTaken: "Tool tethering policy reinforced. Toolbox talk conducted.", reportedBy: "Safety Officer" },
      ],
      securityIncidents: [],
      cleaningStatus: "Satisfactory",
      cleaningNotes: "Debris from formwork removal cleared by end of shift",
      equipment: [
        { name: "Tower Crane TC-01", type: "Tower Crane", status: "Operational", hoursUsed: 7, operator: "Rajesh Kumar" },
        { name: "Concrete Pump CP-02", type: "Pump", status: "Idle", hoursUsed: 0, operator: "" },
        { name: "Generator GEN-03", type: "Generator", status: "Operational", hoursUsed: 10, operator: "Abdul Rahman" },
      ],
      materialsIn: [
        { name: "Plasterboard 12.5mm", unit: "Sheets", quantity: 200, supplier: "Knauf Gulf", deliveryNote: "DN-4530" },
      ],
      materialsUsed: [
        { name: "Plaster Mix", unit: "Bags", quantity: 45, supplier: "Level 7 walls", deliveryNote: "" },
      ],
      inventoryStatus: [
        { name: "Cement (OPC)", unit: "Bags", opening: 220, received: 100, used: 25, closing: 295, status: "Adequate" },
        { name: "PVC Pipes 4 inch", unit: "Meters", opening: 85, received: 100, used: 20, closing: 165, status: "Adequate" },
      ],
      overallProgress: 44,
      comments: "Wind delays impacted crane operations. Schedule recovery plan being prepared.",
      status: "submitted",
    },
    {
      reportNumber: "DCR-MHR-001",
      projectId: p2.id,
      reportDate: "2026-02-16",
      preparedBy: "Khalid Bin Rashid",
      shiftStart: "06:30",
      shiftEnd: "18:00",
      weatherCondition: "Hot",
      temperature: "35-42",
      windSpeed: "8",
      weatherImpact: "Heat stress protocols activated. Additional water breaks provided.",
      isWorkingDay: true,
      workActivities: [
        { trade: "Civil Works", description: "Excavation for swimming pool and basement car park area B.", location: "Basement Level", percentComplete: 45, status: "In Progress" },
        { trade: "Waterproofing", description: "Membrane application on basement retaining wall sections 1-4.", location: "Basement", percentComplete: 30, status: "In Progress" },
        { trade: "Masonry", description: "Block work for ground floor partition walls, Zones A & B.", location: "Ground Floor", percentComplete: 25, status: "In Progress" },
      ],
      labourForce: [
        { trade: "Civil Works", count: 30, hours: 10 },
        { trade: "Waterproofing", count: 8, hours: 8 },
        { trade: "Masonry", count: 14, hours: 9 },
        { trade: "Steel Works", count: 12, hours: 10 },
      ],
      subcontractors: [
        { company: "ProWaterproof LLC", specialty: "Waterproofing", workersCount: 8, workDescription: "Basement membrane and protection board installation" },
      ],
      safetyIncidents: [],
      securityIncidents: [
        { type: "Unauthorized Access", description: "Two unauthorized persons found near excavation area during lunch break.", actionTaken: "Perimeter fencing reinforced. Additional security patrol added.", reportedBy: "Security Supervisor" },
      ],
      cleaningStatus: "Needs Improvement",
      cleaningNotes: "Excavation debris requires additional cleanup in access roads",
      equipment: [
        { name: "CAT 330 Excavator", type: "Excavator", status: "Operational", hoursUsed: 10, operator: "Mohammad Farooq" },
        { name: "Volvo Dump Truck", type: "Dump Truck", status: "Operational", hoursUsed: 9, operator: "Imran Ali" },
        { name: "Compactor RC-01", type: "Compactor", status: "Operational", hoursUsed: 6, operator: "Syed Ahmed" },
      ],
      materialsIn: [
        { name: "Waterproofing Membrane", unit: "Rolls", quantity: 30, supplier: "Sika Gulf", deliveryNote: "DN-8801" },
        { name: "Concrete Blocks 200mm", unit: "Pieces", quantity: 2000, supplier: "Emirates Block", deliveryNote: "DN-8802" },
      ],
      materialsUsed: [
        { name: "Waterproofing Membrane", unit: "Rolls", quantity: 12, supplier: "Basement walls", deliveryNote: "" },
        { name: "Concrete Blocks 200mm", unit: "Pieces", quantity: 800, supplier: "Ground floor partitions", deliveryNote: "" },
      ],
      inventoryStatus: [
        { name: "Waterproofing Membrane", unit: "Rolls", opening: 10, received: 30, used: 12, closing: 28, status: "Adequate" },
        { name: "Concrete Blocks 200mm", unit: "Pieces", opening: 500, received: 2000, used: 800, closing: 1700, status: "Overstocked" },
      ],
      overallProgress: 22,
      comments: "Foundation work progressing well. Waterproofing contractor mobilized fully.",
      status: "submitted",
    },
  ]);

  await db.insert(weeklyPlans).values([
    {
      projectId: p1.id,
      weekStartDate: "2026-02-16",
      weekEndDate: "2026-02-20",
      weekNumber: 8,
      plannedActivities: [
        { trade: "Structural", description: "Complete Level 12 slab pour and begin Level 13 formwork", targetPercent: 75, priority: "High" },
        { trade: "Electrical", description: "Complete Level 10 conduit installation", targetPercent: 60, priority: "Medium" },
        { trade: "HVAC", description: "Begin ductwork on Levels 8-9", targetPercent: 40, priority: "Medium" },
        { trade: "Finishing", description: "Continue plastering on Level 7", targetPercent: 80, priority: "Low" },
      ],
      plannedLabour: [
        { trade: "Structural", plannedCount: 25 },
        { trade: "Electrical", plannedCount: 10 },
        { trade: "HVAC", plannedCount: 8 },
        { trade: "Finishing", plannedCount: 15 },
        { trade: "Steel Works", plannedCount: 12 },
        { trade: "Plumbing", plannedCount: 8 },
      ],
      plannedSubcontractors: [
        { company: "Gulf Steel Fabricators", specialty: "Steel Works", plannedWorkers: 12, scope: "Rebar works for Level 12-13" },
        { company: "Al Noor MEP Services", specialty: "Electrical", plannedWorkers: 10, scope: "Level 10 electrical infrastructure" },
        { company: "CoolAir Systems", specialty: "HVAC", plannedWorkers: 8, scope: "Levels 8-9 ductwork" },
      ],
      productivityTargets: [
        { trade: "Structural", metric: "Concrete volume", target: 150, unit: "m3" },
        { trade: "Finishing", metric: "Plastered area", target: 400, unit: "m2" },
      ],
      milestones: [
        { description: "Level 12 slab completion", targetDate: "2026-02-18", status: "In Progress" },
        { description: "Level 10 MEP rough-in", targetDate: "2026-02-20", status: "Pending" },
      ],
      notes: "Focus on structural progress. MEP teams to coordinate access schedule.",
      status: "approved",
    },
    {
      projectId: p2.id,
      weekStartDate: "2026-02-16",
      weekEndDate: "2026-02-20",
      weekNumber: 8,
      plannedActivities: [
        { trade: "Civil Works", description: "Complete pool excavation and continue basement excavation", targetPercent: 60, priority: "High" },
        { trade: "Waterproofing", description: "Complete basement retaining wall waterproofing", targetPercent: 50, priority: "High" },
        { trade: "Masonry", description: "Block work for ground floor zones C & D", targetPercent: 50, priority: "Medium" },
      ],
      plannedLabour: [
        { trade: "Civil Works", plannedCount: 35 },
        { trade: "Waterproofing", plannedCount: 10 },
        { trade: "Masonry", plannedCount: 16 },
        { trade: "Steel Works", plannedCount: 14 },
      ],
      plannedSubcontractors: [
        { company: "ProWaterproof LLC", specialty: "Waterproofing", plannedWorkers: 10, scope: "Complete basement membrane" },
      ],
      productivityTargets: [
        { trade: "Civil Works", metric: "Excavated volume", target: 500, unit: "m3" },
        { trade: "Masonry", metric: "Block laid", target: 5000, unit: "blocks" },
      ],
      milestones: [
        { description: "Pool excavation complete", targetDate: "2026-02-19", status: "In Progress" },
      ],
      notes: "Hot weather expected. Ensure adequate hydration stations and rest shelters.",
      status: "approved",
    },
  ]);

  console.log("Database seeded successfully");
}
