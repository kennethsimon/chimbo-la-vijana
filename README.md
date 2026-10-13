# Chimbo La Vijana Brunch

A production-oriented single-event platform for attendee registration, QR ticket delivery, booth scanning, food validation, and admin operations.

The platform is built as a monorepo with a Next.js frontend, Express.js backend, Postgres database, secure staff authentication, role-based permissions, and Resend email delivery.

## What It Does

- Attendees register publicly and receive an event ticket by email.
- Each attendee gets a backend-issued ticket code and QR code.
- Staff users log in through the dashboard.
- Exhibitors scan attendee QR codes for booth visits.
- Food staff scan the same attendee QR code for one-time food validation.
- Admins manage users, attendees, scan history, roles, booths, and event metrics.
- Dashboard users can have multiple roles.
- Scan history is permission-aware: admins see all scans, staff see only their own scans.

## Tech Stack

- Frontend: Next.js, React, Tailwind CSS, shadcn-style UI primitives, Radix Select/Popover, Lucide icons
- Backend: Express.js, Zod validation, bcrypt password hashing, JWT cookie sessions
- Database: Postgres
- Email: Resend
- QR: Server-side QR generation
- Package manager: pnpm workspaces

## Project Structure

```txt
.
├── backend
│   ├── migrations
│   ├── scripts
│   ├── src
│   │   ├── routes
│   │   ├── auth.js
│   │   ├── config.js
│   │   ├── db.js
│   │   ├── email.js
│   │   └── validators.js
│   └── test
├── frontend
│   ├── app
│   ├── components
│   ├── lib
│   └── public
├── docker-compose.yml
├── package.json
└── pnpm-workspace.yaml
```

## Main Routes

### Public

- `/register` - attendee registration
- `/login` - staff/admin login

### Staff

- `/exhibitor/scan` - QR scanning for booth and food flows
- `/profile` - user details, roles, and password change

### Admin

- `/admin/dashboard` - event metrics
- `/admin/attendees` - attendee list, search, CSV export
- `/admin/scans` - booth and food scan history, CSV export
- `/admin/users` - dashboard user list
- `/admin/users/new` - create dashboard users

## Roles And Permissions

The platform supports three roles:

- `admin`
- `exhibitor`
- `food`

Users can have multiple roles.

### Admin

- Can access all dashboard pages.
- Can create dashboard users.
- Can assign multiple roles.
- Can assign a booth to users who scan booths.
- Can activate/deactivate users.
- Can resend dashboard credentials.
- Can view all attendees and all scans.
- Can scan food.
- Can choose any active booth when scanning a booth visit.

### Exhibitor

- Can access the scanner.
- Can scan attendees for assigned booth visits.
- Can only record scans for their assigned booth.
- Can view only scan history they personally created.

### Food Staff

- Can access the scanner.
- Can validate one-time food claims.
- Can view only food scans they personally created.

## Core Security Rules

- Attendees do not have accounts.
- Dashboard users authenticate with email and password.
- Passwords are hashed with bcrypt.
- Auth is stored in secure HTTP-only cookie sessions.
- Admin-only routes reject non-admin users.
- Scanner routes check role permissions server-side.
- Food claims are protected by a unique database constraint.
- Booth visits are protected by a unique attendee + booth constraint.
- Attendee email and phone are protected by unique indexes.
- Public registration and login are rate limited.
- Request bodies are validated with Zod.
- Backend secrets never go to the frontend.

## API Summary

### Public

```http
POST /api/public/registrations
```

### Auth

```http
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
POST /api/auth/change-password
```

### Admin

```http
GET  /api/admin/dashboard
GET  /api/admin/attendees
GET  /api/admin/attendees/export
GET  /api/admin/scans
GET  /api/admin/scans/export
GET  /api/admin/users
POST /api/admin/users
POST /api/admin/users/:id/resend-credentials
PATCH /api/admin/users/:id
GET  /api/admin/booths
```

### Scanner

```http
POST /api/exhibitor/scans/lookup
POST /api/exhibitor/scans/visit
POST /api/exhibitor/scans/food
```

## Database Tables

- `attendees`
- `users`
- `booths`
- `visits`
- `food_claims`
- `email_logs`
- `schema_migrations`

Important constraints:

- `attendees.ticket_code` is unique.
- `attendees.email` is unique case-insensitively.
- `attendees.phone` is unique after backend normalization.
- `users.email` is unique.
- `food_claims.attendee_id` is unique.
- Booth visit uniqueness is enforced per attendee and booth.

## Local Setup

### Requirements

- Node.js 20+
- pnpm
- Docker Desktop or a local Postgres instance
- Resend API key for real email sending

### Install

```bash
pnpm install
```

### Environment Files

Create backend env:

```bash
cp backend/.env.example backend/.env
```

Create frontend env:

```bash
cp frontend/.env.example frontend/.env.local
```

For local development with the frontend on port `3001`, set:

```ini
FRONTEND_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:3001
```

Frontend:

```ini
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api
```

### Backend Environment Variables

```ini
PORT=4000
NODE_ENV=development
DATABASE_URL=postgres://postgres:postgres@localhost:5432/chimbo
JWT_SECRET=replace-with-a-long-random-secret
SESSION_COOKIE_NAME=chimbo_session
FRONTEND_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:3001
RESEND_API_KEY=
EMAIL_FROM="Chimbo La Vijana Brunch <onboarding@resend.dev>"
EVENT_NAME=Chimbo La Vijana Brunch
SMS_API_BASE_URL=https://messaging-service.co.tz
SMS_API_TOKEN=
SMS_SENDER_ID=
SEED_ADMIN_NAME=System Admin
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=ChangeMe123!
```

Do not commit real `.env` files.

## Database Setup

Start Postgres:

```bash
docker compose up -d postgres
```

Run migrations:

```bash
pnpm --filter backend db:migrate
```

Seed admin account and default booths:

```bash
pnpm --filter backend db:seed
```

Default seed credentials are controlled by:

```ini
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=ChangeMe123!
```

## Running Locally

Run both apps:

```bash
pnpm dev
```

Or run separately:

```bash
pnpm dev:backend
pnpm dev:frontend
```

Default local URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`

To run frontend on port `3001`:

```bash
pnpm --filter frontend exec next dev -p 3001
```

## Email And QR Tickets

Registration email uses Resend.

The email includes:

- Event ticket design
- Attendee name
- Ticket code
- QR code
- Event guidance

Dashboard user credentials email includes:

- User name
- Login email
- Temporary password
- Assigned roles
- Booth assignment when relevant
- Reminder to change password

Use this sender during Resend sandbox testing:

```ini
EMAIL_FROM="Chimbo La Vijana Brunch <onboarding@resend.dev>"
```

For production, verify your own sending domain in Resend and replace `EMAIL_FROM`.

## Testing

Backend tests:

```bash
pnpm --filter backend test
```

Backend syntax check:

```bash
pnpm --filter backend build
```

Frontend production build:

```bash
pnpm --filter frontend build
```

Full workspace check:

```bash
pnpm build
```

## CSV Exports

Admins can export:

- Attendees from `/admin/attendees`
- Scan history from `/admin/scans`

Staff scan exports are scoped to the scans they personally created.

## Deployment Notes

Recommended production setup:

- Managed Postgres database
- Backend hosted as a Node.js service
- Frontend hosted as a Next.js app
- HTTPS enabled for both services
- `CORS_ORIGIN` locked to the deployed frontend URL
- Strong `JWT_SECRET`
- Verified Resend sending domain
- Secure environment variable storage

Camera QR scanning requires a secure context in most browsers, so production should use HTTPS.

## Vercel Frontend Deployment

Deploy the Next.js frontend as a Vercel project with:

```txt
Root Directory: frontend
Framework Preset: Next.js
Build Command: pnpm build
Node.js Version: 24.x
```

Set this Vercel frontend environment variable:

```ini
NEXT_PUBLIC_API_BASE_URL=https://your-backend-domain.example.com/api
```

See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for the full setup guide.

## Production Checklist

- Set production `DATABASE_URL`
- Set a strong `JWT_SECRET`
- Set `NODE_ENV=production`
- Set `FRONTEND_URL`
- Set `CORS_ORIGIN`
- Set `RESEND_API_KEY`
- Set verified production `EMAIL_FROM`
- Run migrations
- Seed or create the first admin user
- Confirm registration email delivery
- Confirm food scans cannot be repeated
- Confirm booth scans cannot be repeated for the same booth
- Confirm each role only sees allowed pages

## License

Private project for Chimbo La Vijana Brunch.
