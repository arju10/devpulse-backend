# devpulse-backend

A collaborative platform for software teams to report bugs, suggest features, and coordinate resolutions.

**Live URL:** https://devpulse-backend-theta.vercel.app/

## Features
- User registration and authentication (JWT)
- Role-based access control (contributor / maintainer)
- Create, read, update, and delete issues
- Filter and sort issues by type, status, and date

## Tech Stack
- Node.js (LTS), TypeScript, Express.js
- PostgreSQL (Supabase), native `pg` driver, raw SQL
- bcrypt (password hashing), jsonwebtoken (auth)
- Deployed on Vercel

## Setup

1. Clone the repo and install dependencies:
```bash
   git clone https://github.com/arju10/devpulse-backend.git
   cd devpulse-backend
   npm install
```
2. Copy `.env.example` to `.env` and fill in values.
3. Run the SQL schema in your Supabase SQL editor (see schema below).
4. Start development server:
```bash
   npm run dev
```

## API Endpoints

| Method | Endpoint | Access |
|--------|----------|--------|
| POST | /api/auth/signup | Public |
| POST | /api/auth/login | Public |
| POST | /api/issues | Authenticated |
| GET | /api/issues | Public |
| GET | /api/issues/:id | Public |
| PATCH | /api/issues/:id | Authenticated |
| DELETE | /api/issues/:id | Maintainer only |

## Database Schema

**users** — id, name, email, password (hashed), role (contributor/maintainer), created_at, updated_at

**issues** — id, title (max 150), description (min 20), type (bug/feature_request), status (open/in_progress/resolved), reporter_id, created_at, updated_at