# Birthday RSVP Web App

## Overview
React SPA + Express API + MySQL. Guests submit RSVPs; admins manage event details, food choices, invites, and metrics.

## Setup

### 1. Database
Create a MySQL database and run the schema:

```
mysql -u root -p
CREATE DATABASE party_invite;
USE party_invite;
SOURCE backend/sql/schema.sql;
```

### 2. Backend
Copy env file and fill values:

```
cp backend/.env.example backend/.env
```

Set these values in `backend/.env`:
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET`
- `ADMIN_EMAIL=kjvwebdesign@gmail.com`
- `ADMIN_PASSWORD=Icr347iv3;po-=!`
- `FRONTEND_ORIGIN=http://localhost:5173`

Install deps and seed admin:

```
cd backend
npm install
npm run seed-admin
npm run dev
```

### 3. Frontend
Copy env file and install:

```
cp frontend/.env.example frontend/.env
cd frontend
npm install
npm run dev
```

Visit:
- RSVP page: http://localhost:5173/
- Admin: http://localhost:5173/admin

## CSV Import
Upload a CSV with column header `invite_name` (optional `phone`).

Example:

```
invite_name,phone
Smith Family,555-111-2222
Johnson Family,555-222-3333
```
