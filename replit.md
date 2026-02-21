# MEM ERP - Construction Daily Report System

## Overview
A comprehensive construction management application for collecting daily construction reports from multiple work sites. The system covers activities, weather, labour, subcontractors, safety/security incidents, cleaning, equipment, materials, and inventory tracking. It auto-generates weekly reports compared against weekly plans and provides executive summaries.

## Architecture
- **Frontend**: React + TypeScript with Vite, TanStack Query, wouter routing, shadcn/ui components, Recharts for charts
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS with shadcn/ui design system

## Project Structure
```
client/src/
  pages/
    dashboard.tsx          - Main dashboard with stats and quick links
    daily-reports.tsx      - List of daily reports with filtering
    daily-report-form.tsx  - Multi-tab daily report form (General, Weather, Activities, Labour, Subcontractors, Safety, Security, Housekeeping, Equipment, Materials, Inventory)
    projects.tsx           - Project management page
    weekly-plans.tsx       - List of weekly plans
    weekly-plan-form.tsx   - Weekly plan creation with activities, labour, subcontractors, targets, milestones
    weekly-report.tsx      - Auto-generated weekly report with charts comparing plan vs actual
    executive-summary.tsx  - Executive summaries with weekly/monthly/quarterly views
  components/
    app-sidebar.tsx        - Navigation sidebar
    theme-provider.tsx     - Dark/light mode
    theme-toggle.tsx       - Theme switch button
server/
  index.ts                 - Express server entry
  routes.ts                - API routes
  storage.ts               - Database storage layer
  db.ts                    - Database connection
  seed.ts                  - Seed data
shared/
  schema.ts                - Drizzle schema + TypeScript types + constants
```

## Key Features
1. **Daily Reports**: Multi-section form with dropdowns, sliders, switches for weather, activities per trade, labour counts, subcontractors, safety/security incidents, equipment, materials, inventory
2. **Approval Workflow**: Daily reports follow draft → submitted → approved/rejected flow. Project managers submit reports; Development Managers approve or reject with reason. Rejected reports can be re-submitted.
3. **Weekly Plans**: Planned activities, labour targets, subcontractors, productivity metrics, milestones
4. **Weekly Report**: Auto-generated from daily reports, compared against weekly plan with bar/pie charts
5. **Executive Summary**: Aggregated views across weekly/monthly/quarterly with trend charts
6. **Projects**: Project management with name, code, location, client, contractor, project manager assignment

## API Routes
- `GET/POST /api/projects` - List/create projects
- `GET/PATCH/DELETE /api/projects/:id` - Get/update/delete project
- `GET/POST /api/daily-reports` - List/create daily reports
- `GET/PATCH /api/daily-reports/:id` - Get/update daily report
- `POST /api/daily-reports/:id/submit` - Submit report for approval
- `POST /api/daily-reports/:id/approve` - Approve report (Development Manager only)
- `POST /api/daily-reports/:id/reject` - Reject report with reason (Development Manager only)
- `GET/POST /api/weekly-plans` - List/create weekly plans
- `GET/PATCH /api/weekly-plans/:id` - Get/update weekly plan

## Database
PostgreSQL with tables: projects, daily_reports, weekly_plans, users
JSONB columns used for arrays (work_activities, labour_force, subcontractors, etc.)
