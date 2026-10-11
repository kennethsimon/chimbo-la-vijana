# Chimbo Single-Event Platform

Production-oriented event platform with:

- Public attendee registration and QR email delivery through Resend.
- Express.js API with Postgres, secure staff sessions, and role-based access.
- Next.js frontend for attendee registration, exhibitor scanning, and admin operations.

## Apps

- `backend`: Express API, Postgres schema/migrations, Resend email, auth.
- `frontend`: Next.js app with `/register`, `/login`, `/exhibitor/scan`, and admin routes.

## Quick Start

```bash
pnpm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
docker compose up -d postgres
pnpm --filter backend db:migrate
pnpm --filter backend db:seed
pnpm dev
```

Backend defaults to `http://localhost:4000`; frontend defaults to `http://localhost:3000`.

Seeded admin credentials are controlled by `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `backend/.env`.

## Production Notes

- Use a managed Postgres database.
- Set `JWT_SECRET`, `DATABASE_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `FRONTEND_URL`, and `CORS_ORIGIN`.
- Serve both apps over HTTPS so browser camera scanning works reliably.
- Do not expose backend secrets to the frontend.
