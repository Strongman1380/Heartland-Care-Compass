---
description: Repository Information Overview
alwaysApply: true
---

# Heartland Youth Compass Information

## Summary
A youth management platform for Heartland Boys Home. The application helps track youth profiles, behavior points, progress notes, and daily ratings in a residential care setting.

## Structure
- **src/**: Frontend React application with components, pages, and utilities
- **public/**: Static assets and files served directly
- **.github/**: GitHub Actions workflow for deployment
- **server-mongodb.js**: Main Express.js backend server with MongoDB integration

- **database.js**: MongoDB connection and collection management

## Language & Runtime
**Language**: TypeScript/JavaScript
**Version**: Node.js 20.x (specified in package.json engines)
**Build System**: Vite
**Package Manager**: npm (with bun.lockb indicating Bun support)

## Dependencies
**Main Dependencies**:
- **Frontend**: React 18.3.1, React Router 6.26.2, TypeScript 5.5.3
- **UI**: shadcn-ui components (Radix UI primitives), Tailwind CSS 3.4.11
- **Backend**: Express 4.21.2, MongoDB 6.19.0, JWT 9.0.2
- **Data Validation**: Zod 3.23.8
- **Charting**: Recharts 2.12.7

**Development Dependencies**:
- ESLint 9.9.0, TypeScript-ESLint 8.0.1
- Vite 5.4.1 with React-SWC plugin
- Concurrently 9.2.1 for running multiple processes

## Build & Installation
```bash
# Install dependencies
npm i

# Development mode (frontend only)
npm run dev

# Full stack development (API + frontend)
npm run dev:full

# Production build
npm run build

# Start server
npm run start
```

## Docker
No Docker configuration found in the repository.

## Testing
**targetFramework**: Jest
**Existing Tests**: API tests using Jest with supertest for incident reporting endpoints

## Deployment
**GitHub Pages**:
- Automated deployment via GitHub Actions workflow
- Custom base path configuration for GitHub Pages
- Commands: `npm run deploy:gh`

**Vercel**:
- Configuration in vercel.json
- Supports direct deployment from GitHub

**Environment Variables**:
- MongoDB connection: MONGODB_URI, MONGODB_DB_NAME
- Authentication: JWT_SECRET, ADMIN_API_KEY
- Optional OpenAI integration: OPENAI_API_KEY

## API Structure
**Authentication**: JWT-based with simple API key bootstrap
**Endpoints**:
- `/api/youth`: CRUD operations for youth profiles
- `/api/behavior-points`: Track daily behavior points
- `/api/progress-notes`: Record progress notes for youth
- `/api/daily-ratings`: Track daily performance ratings
- `/api/ai/summarize-report`: Optional AI-assisted report generation