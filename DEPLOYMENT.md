Production Deployment
=====================

Overview
--------
- Stack: Vite + React (SPA) with Supabase as the backend (Auth + Database).
- No custom Node/Express server is required for production.

Recommended setup
- Hosting: Vercel (static build output in `dist`) or any static host (Netlify, S3/CloudFront, GitHub Pages).
- Backend: Supabase project (already referenced in `src/integrations/supabase/client.ts`).

Deploy to Vercel
----------------
1) Ensure dependencies are installed: `npm ci`
2) Build locally: `npm run build` (outputs to `dist`)
3) Connect the repo to Vercel and use the following settings:
   - Install Command: `npm ci`
   - Build Command: `npm run build`
   - Output Directory: `dist`

Supabase configuration
---------------------
- The client uses a publishable (anon) key and URL in `src/integrations/supabase/client.ts`.
- For production, consider swapping these to environment variables (Vite `import.meta.env`) and injecting at build time.
  - Example: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

Local development
-----------------
- Start the dev server: `npm run dev` (Vite on port 8080).
- Supabase calls run directly from the browser to your Supabase project.

Notes
-----
- Remove any unused server-related configs (Express/MongoDB). This app runs entirely as a static SPA with Supabase.
- Keep `vercel.json` if deploying to Vercel; it already matches the static setup.
