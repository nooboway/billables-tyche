# Replit Export V2

This project is a Vite + React application originally exported from Replit. It includes a full UI built with Radix UI components, TanStack router, Supabase integration, and various utilities.

## Development

```bash
npm install   # install dependencies (you may also use `bun install` if Bun is installed)
npm run dev   # start the development server at http://localhost:5173
```

## Production Build

```bash
npm run build   # creates a production‑ready `dist/` folder
npm run preview # preview the built site locally
```

## Deployment

The repository contains a `vercel.json` configuration for static deployment on Vercel. After building, you can deploy with:

```bash
vercel --prod   # requires the Vercel CLI and an authenticated account
```

If you prefer manual deployment, upload the contents of `dist/` to any static hosting provider.

## Environment Variables

See `.env.example` for required variables.
