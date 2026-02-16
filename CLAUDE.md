# CLAUDE.md

## Project Overview

Birthday RSVP web app — guests submit RSVPs with child names and food choices; admins manage event details, food options, invites, and view metrics.

## Tech Stack

- **Frontend:** React 18 + Vite + React Router DOM (JavaScript/JSX)
- **Backend:** Node.js + Express (JavaScript, ES Modules)
- **Database:** MySQL (via mysql2)
- **Auth:** JWT + bcryptjs

## Project Structure

```
backend/
  server.js            # Express server (all routes, middleware, DB logic)
  scripts/seed-admin.js
  sql/schema.sql       # MySQL schema with seed data
frontend/
  src/
    main.jsx           # React entry point
    App.jsx            # Route definitions
    styles.css         # Global styles
    lib/api.js         # API helper functions
    pages/
      RsvpPage.jsx         # Guest RSVP form
      AdminLogin.jsx       # Admin login
      AdminDashboard.jsx   # Admin dashboard
```

## Development Commands

### Backend (`backend/`)

```sh
npm install
npm run dev          # Start Express server (port 3001)
npm run seed-admin   # Create admin user from env vars
```

### Frontend (`frontend/`)

```sh
npm install
npm run dev          # Start Vite dev server (port 5173)
npm run build        # Production build
```

## Environment Variables

### Backend (`backend/.env`)

- `PORT` — server port (default 3001)
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT` — MySQL connection
- `JWT_SECRET` — secret for signing tokens
- `FRONTEND_ORIGIN` — allowed CORS origin (e.g. `http://localhost:5173`)
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` — used by `seed-admin` script

### Frontend (`frontend/.env`)

- `VITE_API_URL` — backend URL (e.g. `http://localhost:3001`)

## Database Setup

```sql
CREATE DATABASE party_invite;
SOURCE backend/sql/schema.sql;
```

## Key Routes

- `/` — Guest RSVP page
- `/admin` — Admin login
- `/admin/dashboard` — Admin dashboard

## Notes

- No linter or test runner is currently configured.
- Backend is a single `server.js` file with all routes and middleware.
- RSVP endpoint is rate-limited (50 requests per 15 minutes).
- Admin routes require a JWT token (Bearer auth header).
