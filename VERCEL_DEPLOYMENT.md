# 🚀 Vercel Deployment Guide

## 📋 Prerequisites

1. **MongoDB Atlas Account** (Free tier available)
   - Create cluster and get connection string
   - See `setup-mongodb.md` for detailed instructions

2. **Vercel Account** (Free tier available)
   - Sign up at [vercel.com](https://vercel.com)

3. **GitHub Repository** ✅ 
   - Already pushed to: https://github.com/Strongman1380/Heartland-Care-Compass.git

## 🔧 Step-by-Step Deployment

### 1. Deploy to Vercel

**Option A: Vercel Dashboard (Recommended)**
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import from GitHub: `Strongman1380/Heartland-Care-Compass`
4. Configure project settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

**Option B: Vercel CLI**
```bash
npm i -g vercel
vercel --prod
```

### 2. Configure Environment Variables

In Vercel Dashboard → Project → Settings → Environment Variables, add:

**Required Variables:**
```
MONGODB_URI = mongodb+srv://username:password@cluster.mongodb.net/heartlandCareCompass?retryWrites=true&w=majority
MONGODB_DB_NAME = heartlandCareCompass
JWT_SECRET = your-super-secure-jwt-secret-here
ADMIN_API_KEY = your-admin-api-key-here
NODE_ENV = production
```

**Optional Variables:**
```
OPENAI_API_KEY = your-openai-api-key (for AI reports)
OPENAI_MODEL = gpt-4o-mini
CORS_ORIGIN = https://yourdomain.vercel.app
```

### 3. MongoDB Atlas Setup

1. **Create MongoDB Atlas Account**
   - Go to [mongodb.com/atlas](https://mongodb.com/atlas)
   - Sign up for free account

2. **Create Cluster**
   - Choose M0 Sandbox (Free)
   - Select region closest to your users

3. **Create Database User**
   - Database Access → Add New Database User
   - Username/Password authentication
   - Read and write to any database

4. **Configure Network Access**
   - Network Access → Add IP Address
   - Add `0.0.0.0/0` (Allow from anywhere) for Vercel
   - Or add Vercel's IP ranges for better security

5. **Get Connection String**
   - Clusters → Connect → Connect your application
   - Copy connection string
   - Replace `<username>`, `<password>`, and `<dbname>`

### 4. Generate Secure Secrets

**JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Admin API Key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Deploy and Test

1. **Trigger Deployment**
   - Push to GitHub (already done ✅)
   - Vercel auto-deploys from main branch

2. **Test Deployment**
   - Visit your Vercel URL
   - Check `/api/health` endpoint
   - Should see: `{"status":"ok","database":"connected"}`

## 🌐 Your Deployed URLs

After deployment, you'll have:
- **Frontend**: `https://your-project.vercel.app`
- **API**: `https://your-project.vercel.app/api/*`
- **Health Check**: `https://your-project.vercel.app/api/health`

## 🔐 Authentication Setup

### Get JWT Token for API Access
```bash
curl -X POST https://your-project.vercel.app/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "your-admin-api-key"}'
```

### Use Token in Requests
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://your-project.vercel.app/api/youth
```

## 📊 Features Available After Deployment

### ✅ Full Application Features
- Youth profile management
- Daily behavior point tracking
- Progress notes with 1-4 rating scale
- Daily performance ratings (DPN)
- Court report generation
- AI-powered report insights
- CSV data export
- Print-friendly reports
- Counseling session tracking

### ✅ Production Benefits
- **Auto-scaling**: Handles traffic spikes automatically
- **Global CDN**: Fast loading worldwide
- **SSL/HTTPS**: Secure by default
- **MongoDB Atlas**: Professional database hosting
- **Zero downtime**: Automatic deployments

## 🛠️ Maintenance

### Update Application
1. Make changes locally
2. Commit and push to GitHub
3. Vercel auto-deploys from main branch

### Monitor Performance
- Vercel Dashboard → Analytics
- MongoDB Atlas → Metrics
- Check `/api/health` for status

### Backup Data
- MongoDB Atlas provides automatic backups
- Export data via application's CSV export feature

## 🆘 Troubleshooting

### Common Issues

**Build Fails:**
- Check environment variables are set
- Verify MongoDB connection string format
- Check build logs in Vercel dashboard

**Database Connection Issues:**
- Verify MongoDB Atlas IP whitelist includes `0.0.0.0/0`
- Check username/password in connection string
- Ensure cluster is not paused

**API Authentication Issues:**
- Verify JWT_SECRET and ADMIN_API_KEY are set
- Check token generation endpoint
- Ensure Authorization header format: `Bearer TOKEN`

### Support Resources
- Vercel Documentation: [vercel.com/docs](https://vercel.com/docs)
- MongoDB Atlas Docs: [docs.atlas.mongodb.com](https://docs.atlas.mongodb.com)
- GitHub Issues: Create issue in repository

## 🎉 Success!

Once deployed, your Heartland Care Compass application will be:
- ✅ **Live on the internet**
- ✅ **Backed by MongoDB Atlas**
- ✅ **Auto-scaling and secure**
- ✅ **Ready for production use**

**Your application is now enterprise-ready!** 🚀