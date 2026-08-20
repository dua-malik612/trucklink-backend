# TruckLink Backend

NestJS API for TruckLink driver onboarding, recruiter job postings, applications, notifications, moderation, and admin management.

## Run locally

Create or update `.env` with the required MongoDB, Redis, Cloudinary, and mail settings. The local API port is:

```env
PORT=3000
ADMIN_EMAIL=your-admin-email@example.com
ADMIN_PASSWORD=use-a-local-admin-password
```

The `ADMIN_EMAIL` and `ADMIN_PASSWORD` values provision one Admin account during startup. Keep them in `.env` only; never put them in frontend code or commit real secrets.

Install and run in development mode:

```powershell
npm install
npm run start:dev
```

The API is available at `http://localhost:3000/api`.

## Commands

```powershell
npm run start:dev  # Watch mode
npm run build      # Compile TypeScript
npm run start:prod # Run compiled output
npm run test       # Unit tests
npm run test:e2e   # End-to-end tests
npm run lint       # ESLint
```

## Frontend

From the sibling `trucklink-frontend` folder:

```powershell
cd ..\trucklink-frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:3001` and calls this API through `http://localhost:3000/api`.

## Important runtime note

Only one service should own each port. If port 3000 is already occupied, stop the old Node process before starting NestJS. The frontend intentionally uses port 3001.
