---
description: Repository Information Overview
alwaysApply: true
---

# Heartland Youth Compass Information

## Summary
A youth management platform for Heartland Boys Home. The application provides functionality for tracking youth information, behavior points, progress notes, and daily ratings.

## Structure
- **src/**: React frontend application with TypeScript
- **public/**: Static assets and files
- **dist/**: Production build output
- **.github/**: GitHub workflows for CI/CD
- **server-mongodb.js**: Express server with MongoDB integration
- **database.js**: MongoDB connection and collection management

## Language & Runtime
**Frontend Language**: TypeScript
**Backend Language**: JavaScript (Node.js)
**Runtime**: Node.js
**Build System**: Vite
**Package Manager**: npm

## Dependencies
**Main Dependencies**:
- React 18.3.1
- React Router DOM 6.26.2
- Express 4.21.2
- MongoDB 6.19.0
- Firebase 9.23.0
- Tailwind CSS 3.4.11
- shadcn/ui (via Radix UI components)
- Zod 3.23.8
- React Hook Form 7.53.0

**Development Dependencies**:
- TypeScript 5.5.3
- Vite 5.4.1
- ESLint 9.9.0
- Tailwind CSS 3.4.11
- PostCSS 8.4.47

## Build & Installation
```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Start server
npm start
```

## Database
**Type**: MongoDB Atlas
**Collections**:
- youth
- behaviorPoints
- progressNotes
- dailyRatings
- assessments

**Connection**: MongoDB Atlas cloud database

## API Endpoints
**Base URL**: `/api`
**Health Check**: `/api/health`

**Youth Management**:
- GET/POST `/api/youth`
- GET/PUT/DELETE `/api/youth/:id`

**Behavior Points**:
- GET `/api/behavior-points/youth/:youthId`
- POST `/api/behavior-points`

**Progress Notes**:
- GET `/api/progress-notes/youth/:youthId`
- POST `/api/progress-notes`

**Daily Ratings**:
- GET `/api/daily-ratings/youth/:youthId`
- POST `/api/daily-ratings`

## Deployment
**Static Hosting Options**:
- GitHub Pages (configured with custom base path)
- Vercel (supports Vite out of the box)
- Netlify

**GitHub Pages Deployment**:
```bash
npm run deploy:gh
```

**Environment Variables**:
- MONGODB_URI: MongoDB connection string
- MONGODB_DB_NAME: Database name
- PORT: Server port (default: 3000)
- NODE_ENV: Environment mode