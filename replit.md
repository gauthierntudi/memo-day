# MEM - DAY ON SITE - Construction Daily Report System

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
    projects.tsx           - Project management page (accepts hideFinancial, pageTitle props)
    projects-steering.tsx  - Projects Steering page (same as Projects but without Financial Indicators)
    weekly-plans.tsx       - List of weekly plans
    weekly-plan-form.tsx   - Weekly plan creation with activities, labour, subcontractors, targets, milestones
    weekly-report.tsx      - Auto-generated weekly report with charts comparing plan vs actual
    executive-summary.tsx  - Executive summaries with weekly/monthly/quarterly views
    projects-overview.tsx  - Portfolio-level KPIs, charts, and performance analysis across all projects
    event-log.tsx          - Super admin event log with all system operations, users, timestamps, descriptions
  components/
    app-sidebar.tsx        - Navigation sidebar
    photo-grid.tsx         - Reusable photo grid with upload, enlarge, show/hide toggle (max 20, 3 visible by default)
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
2. **Approval Workflow**: Daily reports and weekly plans follow draft → submitted → approved/rejected flow. Approval/rejection is permission-based via the privileges table. Rejected items can be re-submitted.
7. **Role-Based Permissions**: Dynamic permissions system driven by the privileges table in Settings. Controls sidebar visibility, button activation, and route access. 17 permissions across 17 org roles. Changes to the privileges table are reflected immediately in the UI. Hook: `usePermissions()` from `@/hooks/use-permissions.tsx`. API: `GET /api/my-permissions`.
8. **Project Permission Split**: Project detail view is split into Operational Indicators (costs, schedule %, delay, performance %) and Financial Indicators (contract value, earned value, SPI, CPI, GP). Each section has independent view/edit permissions: `view_project_operational`, `edit_project_operational`, `view_project_financial`, `edit_project_financial`. Backend strips fields from API responses based on permissions and computes derived financial metrics (GP, cost variance, earned value, actual total cost) server-side so financial-only users see correct values. Projects Overview page also gates KPI cards, charts, and table columns by these permissions.
3. **Weekly Plans**: Planned activities, labour targets, subcontractors, productivity metrics, milestones
4. **Weekly Report**: Auto-generated from daily reports, compared against weekly plan with bar/pie charts
5. **Executive Summary**: Aggregated views across weekly/monthly/quarterly with trend charts
6. **Projects**: Project management with name, code, location, client, contractor, project manager assignment. Date fields: Start Date, Planned Completion Date, Revised Baseline for Completion, Expected Completion Date. Schedule % is manually input by user. Delay Days auto-computed from Revised Baseline (or Planned Completion if no revised baseline). SPI = Performance % / Schedule %.

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
- `POST /api/weekly-plans/:id/submit` - Submit plan for approval
- `POST /api/weekly-plans/:id/approve` - Approve plan (Development Manager only)
- `POST /api/weekly-plans/:id/reject` - Reject plan with reason (Development Manager only)
- `GET /api/my-permissions` - Get current user's permissions based on org role
- `GET /api/role-privileges` - Get all role privileges matrix
- `PUT /api/role-privileges` - Update role privileges matrix
- `GET /api/event-logs` - Get paginated event logs (super admin only, ?limit=&offset=)

## Database
PostgreSQL with tables: projects, daily_reports, weekly_plans, users, event_logs
JSONB columns used for arrays (work_activities, labour_force, subcontractors, etc.)
New columns: `budgeted_cost`, `updated_cost` on projects table for cost planning; Budgeted GP = (Contract Value - Budgeted Cost) / Contract Value; Updated GP = (Updated Contract Value - Updated Cost) / Updated Contract Value
JSONB columns `direct_cost_details` and `indirect_cost_details` store cost breakdowns:
- Direct: Material Cost, Labor, Small Tools & Equipment, Supervision Staff, Sub-Contractors
- Indirect: Mobilization, Tool & Plants, Formwork, Utilities & Site Facilities, Taxes & Insurance, Head Office Overhead, Contingencies
Sub-items auto-sum to the main direct/indirect cost fields; users can also enter main totals directly

## Security
- **Authentication**: bcrypt password hashing (cost factor 12), session-based auth with express-session + connect-pg-simple
- **Session**: Cookie named `mem.sid`, httpOnly, sameSite=lax, secure in production, 30-day expiry, session regeneration on login
- **Security Headers**: Helmet middleware (X-Frame-Options, HSTS, X-Content-Type-Options, Referrer-Policy, etc.); CSP disabled due to inline styles/scripts
- **Rate Limiting**: Login: 10 attempts per 15 minutes; API: 120 requests per minute
- **CSRF Protection**: Origin header validation on mutating requests
- **Authorization**: requireAuth middleware on all API routes; requirePermission for role-based access; project-scoped access control on all project/report/plan routes (GET, PATCH, DELETE)
- **Input Validation**: Zod schemas on all write endpoints; Drizzle ORM prevents SQL injection
- **Error Handling**: Generic error messages for 500-level errors; internal details logged server-side only
- **Body Limits**: JSON/URL-encoded: 5MB; File uploads via multer: 20MB with image-only file filter
- **Password Policy**: Minimum 6 characters; current password required when changing existing password
