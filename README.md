# WhiteRose Lead CRM & Business Operating System

An internal CRM built for **WhiteRose** (Cybersecurity & Software Development) to manage
the full business lifecycle: **Business Visit → Lead → Follow-up → Demo → Proposal →
Negotiation → Deal Won → Client → Project → Payment → Support.**

This is **Phase 1** of a 9-phase build. It ships a working, database-connected
foundation — not a UI mockup.

---

## What's included in Phase 1

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- Complete Prisma schema covering every module in the spec: Leads, Follow-ups, Tasks,
  Meetings, Proposals, Clients, Projects, Payments (+ Installments), Documents, Notes,
  Notifications, Audit Log, and admin-editable lookups (Industries, Lead Sources,
  Services, Areas, WhatsApp Templates, Company Settings)
- Authentication (Auth.js v5 / NextAuth, credentials provider, hashed passwords,
  forgot-password flow, secure sessions)
- Role-based access control: **Super Admin, Admin, Sales Executive, Developer** — stored
  in the database so more roles/permissions can be added later from Settings
- App shell: collapsible sidebar (all 16 modules), topbar with global search UI and
  theme toggle, mobile bottom nav + floating "Add Lead" button for on-site visits
- Dashboard — **wired to real Prisma queries**, not mock data: all stat cards (Total
  Leads, Hot Leads, Expected Revenue in ₹, Conversion Rate, etc.), two charts (Leads by
  Status, Leads by Industry), and a "Needs Your Attention" recommendations widget
- Seed script with realistic demo data (sample leads, a won deal converted to a client
  with an active project and payment installments, WhatsApp templates, etc.)

### Not yet built (upcoming phases, per the original build order)

| Phase | Scope |
|---|---|
| 2 | Leads list, Add Lead form, Lead Detail page, Kanban Pipeline, Activities/Notes |
| 3 | Follow-ups page, Reminders, Tasks, Calendar, Meetings/Demos |
| 4 | Proposal builder, PDF quotations, WhatsApp send actions |
| 5 | Client Conversion, Client Management, Projects |
| 6 | Payments, Installments, Revenue tracking |
| 7 | Reports, Analytics, Team Management |
| 8 | AI Assistant, Smart recommendations, OCR-ready visiting card scanner |
| 9 | Security review, responsive testing, production deployment |

The sidebar already links to all of these routes; they'll return 404 until each phase
is built — that's expected at this stage.

---

## Requirements

- Node.js 20+
- A MongoDB Atlas database (or any MongoDB instance)

## 1. Install dependencies

```bash
npm install
```

## 2. Configure environment variables

Copy the example file and fill in your real values:

```bash
cp .env.example .env
```

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | MongoDB Atlas connection string |
| `AUTH_SECRET` | Yes | Generate with `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | Yes | e.g. `http://localhost:3000` in dev |
| `OPENAI_API_KEY` | Optional | Powers the AI Assistant in Phase 8. The app works fully without it. |
| `WHATSAPP_API_TOKEN` | Optional | For the official WhatsApp Business API in a later phase; `wa.me` links work without it |
| `EMAIL_API_KEY` | Optional | For sending real forgot-password emails; the reset link is logged to the server console until this is configured |

**Never commit `.env` with real secrets.** `.gitignore` already excludes it.

## 3. Set up the database

```bash
npx prisma generate      # generate the Prisma Client
npx prisma db push       # push schema to MongoDB (no migrations needed)
npm run db:seed          # populate demo data
```

> Note: `prisma generate` and `migrate` need outbound network access to fetch Prisma's
> query engine binaries the first time. If you're behind a restrictive firewall/proxy,
> allow `binaries.prisma.sh` and `registry.npmjs.org`.

## 4. Run the app

```bash
npm run dev
```

Visit `http://localhost:3000`. Log in with the seeded accounts:

| Role | Email | Password |
|---|---|---|
| Super Admin | `admin@whiterose.in` | `Admin@123` |
| Sales Executive | `sales@whiterose.in` | `Sales@123` |

**Change these passwords (or delete the seeded users) before using this in
production.**

## 5. Useful scripts

```bash
npm run db:studio    # visual DB browser (Prisma Studio)
npm run db:push      # push schema changes without a migration (prototyping only)
npm run lint         # ESLint
npm run build        # production build
```

## 6. Deployment

- **App (frontend + API routes):** Netlify — connect the repo, set the environment
  variables listed above in the Netlify dashboard (Site settings → Build & deploy →
  Environment), and deploy.
- **Database:** MongoDB Atlas (or any managed MongoDB instance). Use the MongoDB
  connection string for `DATABASE_URL`.
- The architecture also supports Docker / a VPS / AWS if you later move off Netlify.

A `netlify.toml` is included in the repo root — it configures the Next.js build via
the `@netlify/plugin-nextjs` plugin and bundles Prisma schema files so that the
data client is available in serverless functions.

Before deploying:
```bash
npm run build   # must complete with zero errors
```

---

## Project structure

```
prisma/
  schema.prisma       All database models
  seed.ts              Demo data seeder
src/
  app/
    (auth)/login, forgot-password
    (dashboard)/dashboard, ...      # more routes land here each phase
    api/auth/...
  auth.ts               NextAuth config
  middleware.ts          Route protection
  lib/
    prisma.ts            Prisma client singleton
    rbac.ts               Roles & permissions
    dashboard-data.ts     Dashboard queries
    utils.ts              cn(), formatINR(), formatDate()
  components/
    ui/                   Button, Card, Input, Label, Badge
    layout/                Sidebar, Topbar, ThemeProvider, MobileBottomNav
    dashboard/              StatCard, charts, NeedsAttention
```

## Security notes (WhiteRose is a cybersecurity company — this matters)

- Passwords are hashed with bcrypt, never stored or logged in plain text
- All dashboard routes are protected by middleware; unauthenticated users are
  redirected to `/login`
- The forgot-password endpoint always returns a generic success response so it can't
  be used to enumerate registered email addresses
- Secrets live only in environment variables — nothing is hardcoded or exposed to the
  client bundle
- Role/permission checks happen server-side (`src/lib/rbac.ts`); the sidebar hides
  items the user can't access, but every API route and Server Action must independently
  verify permissions too as each module is built in later phases
- An `AuditLog` model is already in the schema, ready to record sensitive changes
  (deletions, payment status changes, deal value edits) starting in Phase 5/6

---

## Continuing to Phase 2

Once you've confirmed the app runs locally (`npm run dev`, login works, dashboard shows
seeded numbers), send this project back with:

> "Continue WhiteRose CRM — build Phase 2: Leads module (All Leads table, Add Lead
> form, Lead Detail page with tabs, Kanban Pipeline)."
