# Vercel Deployment Guide for Heartland Youth Compass

This guide explains how to set up automatic deployments from GitHub to Vercel for the Heartland Youth Compass application.

## Prerequisites

1. A GitHub account with this repository pushed to it
2. A Vercel account (sign up at [vercel.com](https://vercel.com))
3. MongoDB Atlas account with a database set up

## Setting Up Vercel Auto-Deployments

### Step 1: Connect Your GitHub Repository to Vercel

1. Log in to your Vercel account
2. Click "Add New..." → "Project"
3. Select your GitHub account and find the Heartland-Care-Compass repository
4. Click "Import"

### Step 2: Configure Project Settings

1. **Framework Preset**: Select "Vite" from the dropdown
2. **Build and Output Settings**:
   - Build Command: `npm run build` (should be pre-filled)
   - Output Directory: `dist` (should be pre-filled)
   - Install Command: `npm ci` (should be pre-filled)

### Step 3: Set Up Environment Variables

Add the following environment variables in the Vercel project settings:

| Name | Value | Description |
|------|-------|-------------|
| `MONGODB_URI` | `mongodb+srv://...` | Your MongoDB connection string |
| `MONGODB_DB_NAME` | `heartlandCareCompass` | Your MongoDB database name |
| `JWT_SECRET` | `your-secure-secret` | A secure random string for JWT signing |
| `ADMIN_API_KEY` | `your-admin-key` | A secure API key for admin access |
| `OPENAI_API_KEY` | `your-openai-key` | (Optional) For AI report generation |

### Step 4: Deploy

1. Click "Deploy"
2. Vercel will build and deploy your application
3. Once complete, you'll receive a URL where your application is deployed

## Automatic Deployments

With the GitHub integration enabled in the vercel.json file, Vercel will automatically:

1. Deploy when you push to the main branch
2. Create preview deployments for pull requests
3. Comment on PRs with deployment links

## Custom Domain Setup (Optional)

1. In your Vercel project, go to "Settings" → "Domains"
2. Add your custom domain and follow the verification steps
3. Update your DNS settings as instructed by Vercel

## Troubleshooting Deployments

If you encounter issues with your Vercel deployment:

1. Check the build logs in the Vercel dashboard
2. Verify your environment variables are set correctly
3. Ensure your MongoDB Atlas cluster is accessible from Vercel's IP range
4. Check that your vercel.json configuration is valid

## Local Development vs. Vercel

When developing locally:
- Use `npm run dev:full` to run both frontend and backend
- Set environment variables in your local `.env` file

When deploying to Vercel:
- The frontend is built and served by Vercel
- For the backend API, you'll need to:
  - Deploy the server separately (e.g., on Render, Heroku, or a dedicated Vercel serverless function)
  - Update the `VITE_API_BASE_URL` environment variable to point to your API endpoint

## Monitoring Your Deployment

Vercel provides:
- Deployment logs
- Performance analytics
- Error tracking
- Status checks

Visit your Vercel dashboard regularly to monitor the health of your application.