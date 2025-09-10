Production Deployment
=====================

This repo ships the React client (Vite) and an Express API server.

Recommended setup
- Frontend: GitHub Pages (already configured via .github/workflows/deploy.yml)
- API: Render (simple, managed Node, supports MongoDB Atlas)

1) Backend on Render
--------------------

Render can auto-provision a web service from this repo using the blueprint file render.yaml.

Steps
1. Fork or connect this GitHub repo to Render
2. Add a new “Blueprint” and point it at this repo root
3. Render reads render.yaml and configures a Web Service named heartland-care-compass-api
4. Set the following Environment Variables in Render → Service → Environment
   - MONGODB_URI: your MongoDB Atlas connection string
   - MONGODB_DB_NAME: heartlandCareCompass (or your DB name)
   - JWT_SECRET: a strong random secret
   - ADMIN_API_KEY: a bootstrap key that the app uses to obtain JWTs
   - OPENAI_API_KEY: your OpenAI key (for AI narratives)
   - OPENAI_MODEL: gpt-4o-mini (default)
   - NODE_ENV: production (preset)
   - NODE_VERSION: 20 (preset)
   - PORT: 3000 (preset)
   - CORS_ORIGIN: comma-separated list of allowed origins, e.g.
     https://strongman1380.github.io,https://heartland-care-compass.vercel.app

Build & Start commands (from render.yaml)
- Build: npm ci && npm run build
- Start: node server-mongodb.js

Notes
- The server serves dist as static if present, but your production UI remains on GitHub Pages. The API will be used via CORS.
- Keep Auto Deploy enabled to deploy on every push to main.

2) Frontend on GitHub Pages
---------------------------

Already set up: .github/workflows/deploy.yml builds Vite and deploys to Pages.

To connect the frontend to the API, set a repo secret and rebuild:
- In GitHub → Settings → Secrets → Actions → New repository secret
  - Name: PROD_API_BASE_URL
  - Value: https://<your-render-service>.onrender.com/api

The workflow injects this as VITE_API_BASE_URL during build.

3) Local testing (optional)
---------------------------

- Start API + Web together: npm run dev:full (web on 8080, API on 3000)
- Or run separately:
  - API: npm run start
  - Web: npm run dev

4) AI Narratives
----------------

- Set OPENAI_API_KEY (and optionally OPENAI_MODEL) in Render
- In the app’s Reports form, toggle “Use AI to draft narrative” for PDF/DOCX

5) CORS & CSP
-------------

- CORS_ORIGIN must include your frontend origins (GitHub Pages, Vercel, custom domains) for API requests to succeed.
- index.html includes a CSP connect-src that allows connections to *.onrender.com, *.railway.app, *.fly.dev, *.vercel.app.
  If using a custom API domain, add it to CSP or relax it as needed.

6) Troubleshooting
------------------

- Blank PDF/DOCX: fixed by exporting directly from HTML; ensure the logo URL loads (it is inlined when possible).
- 401 from API: sign in using the “Sign In” button (ADMIN_API_KEY → JWT) or verify CORS_ORIGIN includes the frontend.
- 404 on GH Pages: use app links (BASE_URL-aware) starting at https://<user>.github.io/Heartland-Care-Compass/

