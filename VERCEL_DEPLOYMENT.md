# Vercel Frontend Deployment

This repo is a monorepo with:

- `frontend` - Next.js app
- `backend` - Express API

Deploy only the Next.js frontend to Vercel.

## Recommended Vercel Project Settings

When importing the GitHub repo into Vercel, use these settings:

```txt
Repository: kennethsimon/chimbo-la-vijana
Framework Preset: Next.js
Root Directory: frontend
Install Command: pnpm install --frozen-lockfile
Build Command: pnpm build
Output Directory: .next
Development Command: pnpm dev
```

The important setting is:

```txt
Root Directory: frontend
```

Without this, Vercel may try to build the monorepo root instead of the Next.js app.

## Required Frontend Environment Variable

Set this in Vercel Project Settings → Environment Variables:

```ini
NEXT_PUBLIC_API_BASE_URL=https://your-backend-domain.example.com/api
```

Replace the value with the deployed Express backend URL.

For example:

```ini
NEXT_PUBLIC_API_BASE_URL=https://api.chimbo.example.com/api
```

## Backend CORS Settings

After Vercel gives you the frontend production URL, update the backend environment:

```ini
FRONTEND_URL=https://your-vercel-app.vercel.app
CORS_ORIGIN=https://your-vercel-app.vercel.app
```

If you later attach a custom domain, update both values to the custom domain.

## Git Integration Flow

Once the Vercel project is connected to GitHub:

- Pushes to `main` deploy production.
- Pull requests create preview deployments.
- Environment variables must be configured in Vercel, not committed to the repo.

## Local Validation Before Deploying

Run:

```bash
pnpm --filter frontend build
```

If this passes locally, the frontend should build on Vercel with the settings above.

## Current Local Build Status

The frontend production build has been verified locally.

## Notes

- The frontend is a browser app and does not need backend secrets.
- Do not set `RESEND_API_KEY`, `DATABASE_URL`, or `JWT_SECRET` in the Vercel frontend project.
- Only set `NEXT_PUBLIC_API_BASE_URL` for the frontend.
- Camera-based QR scanning works best over HTTPS, which Vercel provides automatically.
