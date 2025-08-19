# Askio Frontend (Vite + React)

Frontend for Askio social app consuming the backend API.

## Environment
Create `.env` (or `.env.local`) for development:
```
VITE_API_BASE=http://localhost:4000
```
For production set `VITE_API_BASE` to your deployed backend, e.g.
```
VITE_API_BASE=https://api.example.com
```

## Commands
- `npm run dev` Start dev server with HMR
- `npm run build` Production build to `dist/`
- `npm run preview` Preview local build

## Deploy
Upload `dist/` to any static host (Vercel, Netlify, Cloudflare Pages, S3 + CDN). Ensure backend `ALLOWED_ORIGINS` includes the site origin.

## Authentication
Uses Clerk. Configure your Clerk frontend publishable key in index.html or via environment as per Clerk docs.

## Troubleshooting
- Media not loading: confirm backend CSP allows your frontend origin and filenames have correct extensions.
- 401 errors: ensure token is being retrieved by Clerk and passed in Authorization header.
