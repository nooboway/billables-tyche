# Billables

Practice management and billing platform for modern law firms.

## Architecture

```
billables-tyche/
├── apps/
│   ├── backend/        Express API (TypeScript + Supabase)  ← used by mobile
│   └── mobile/         React Native / Expo app
├── replit-export-v2/   TanStack Start web frontend (React + Vite)
├── api/index.ts        Vercel serverless entry → Express backend
└── build-backend-vercel.js  Assembles .vercel/output for deployment
```

## How the pieces connect

| App | Talks to | Auth |
|---|---|---|
| Web frontend | Supabase directly (via TanStack Start server functions) | Supabase Auth session |
| Mobile app | Express backend (`/api/v1/*`) | Supabase JWT → `Authorization: Bearer <token>` |
| Express backend | Supabase (service role — bypasses RLS) | Validates Supabase JWTs in `auth.middleware.ts` |

## Environment variables

Copy `.env.example` to `.env` and fill in your values.

| Variable | Used by | Where to find it |
|---|---|---|
| `SUPABASE_URL` | backend, frontend SSR | Supabase dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | backend only | Supabase dashboard → Settings → API |
| `SUPABASE_PUBLISHABLE_KEY` | backend, frontend SSR | Supabase dashboard → Settings → API (anon key) |
| `VITE_SUPABASE_URL` | frontend build | Same as `SUPABASE_URL` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | frontend build | Same as `SUPABASE_PUBLISHABLE_KEY` |
| `ALLOWED_ORIGINS` | backend CORS | Your deployed frontend URL(s), comma-separated |
| `EXPO_PUBLIC_API_URL` | mobile | Your deployed backend URL + `/api/v1` |

## Vercel deployment

Set these in your Vercel project → Settings → Environment Variables:

```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app
```

The build command is:
```
npm run build
```

This runs `build:replit` (TanStack Start) then `build-backend-vercel.js` which assembles everything into `.vercel/output/` — the frontend handles all routes, and `/api/*` is proxied to the Express backend.

## Local development

**Backend:**
```bash
cd apps/backend
cp ../../.env.example ../../.env  # fill in values
npm run dev
```

**Frontend:**
```bash
cd replit-export-v2
npm run dev
```

**Mobile:**
```bash
cd apps/mobile
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1 npx expo start
```