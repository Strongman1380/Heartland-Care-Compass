# Incident Reporting System - Installation Guide

## 📋 Prerequisites

Before installing the Incident Reporting System, ensure you have:

### Required Software
- **Node.js**: Version 20.x or higher
- **npm**: Version 9.x or higher (comes with Node.js)
- **MongoDB**: Version 6.x or higher
- **Git**: For version control

### Optional Software
- **Docker**: For containerized deployment
- **AWS CLI**: If using S3 for file storage
- **PM2**: For production process management

### System Requirements
- **RAM**: Minimum 2GB, recommended 4GB+
- **Disk Space**: Minimum 10GB free space
- **OS**: Linux, macOS, or Windows with WSL2

## 🚀 Installation Steps

### Step 1: Clone or Navigate to Repository

```bash
cd "/Users/brandonhinrichs/Local Repositories/Apps/Heartland-Care-Compass-main"
```

### Step 2: Install Dependencies

The required dependencies have already been installed, but if you need to reinstall:

```bash
npm install
```

This will install:
- `multer` - File upload handling
- `@aws-sdk/client-s3` - AWS S3 integration
- `bcrypt` - Password hashing
- `ajv` and `ajv-formats` - JSON schema validation

### Step 3: Set Up Environment Variables

```bash
# Copy the example environment file
cp .env.incidents.example .env

# Edit the file with your configuration
nano .env  # or use your preferred editor
```

**Critical Variables to Configure:**

```env
# Generate a strong JWT secret
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

# Generate encryption master key
ENCRYPTION_MASTER_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")

# MongoDB connection
MONGODB_URI=mongodb://localhost:27017/heartland
MONGODB_DB_NAME=heartland

# Storage configuration
STORAGE_TYPE=local  # or 's3' for production
UPLOAD_DIR=./uploads/incidents
```

### Step 4: Set Up MongoDB

#### Option A: Local MongoDB

```bash
# Start MongoDB service
# On macOS with Homebrew:
brew services start mongodb-community

# On Linux with systemd:
sudo systemctl start mongod

# Verify MongoDB is running
mongosh --eval "db.version()"
```

#### Option B: MongoDB Atlas (Cloud)

1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a new cluster
3. Get connection string
4. Update `.env` with connection string:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/heartland?retryWrites=true&w=majority
```

### Step 5: Run Database Migrations

```bash
# Connect to MongoDB and run migration
mongosh $MONGODB_URI < migrations/002_incident_reports.sql

# Or if using local MongoDB:
mongosh heartland < migrations/002_incident_reports.sql
```

**Verify Migration:**

```bash
mongosh heartland --eval "db.getCollectionNames()"
```

You should see:
- `incident_reports`
- `incident_audit_logs`
- `incident_drafts`
- `incident_attachments`
- `encryption_keys`
- `user_roles`

### Step 6: Create Upload Directories

```bash
# Create directories for file uploads
mkdir -p uploads/incidents
mkdir -p uploads/temp
mkdir -p backups

# Set appropriate permissions
chmod 755 uploads
chmod 755 backups
```

### Step 7: Initialize Encryption

```bash
# Test encryption setup
node -e "
const { encryptionService } = require('./server/utils/encryption');
encryptionService.initialize(process.env.ENCRYPTION_MASTER_KEY);
const encrypted = encryptionService.encrypt('test');
const decrypted = encryptionService.decrypt(encrypted);
console.log('Encryption test:', decrypted === 'test' ? '✅ PASS' : '❌ FAIL');
"
```

### Step 8: Create Initial Admin User

```bash
# Run user creation script
node scripts/create-admin-user.js
```

Or manually in MongoDB:

```javascript
mongosh heartland

db.users.insertOne({
  id: "admin-1",
  email: "admin@heartland.org",
  firstName: "Admin",
  lastName: "User",
  passwordHash: "$2b$10$...", // Use bcrypt to hash password
  active: true,
  createdAt: new Date()
});

db.user_roles.insertOne({
  id: UUID(),
  user_id: "admin-1",
  role: "admin",
  granted_at: new Date()
});
```

### Step 9: Start the Application

#### Development Mode

```bash
# Start both API and frontend
npm run dev:full

# Or start separately:
# Terminal 1 - API server
npm run start

# Terminal 2 - Frontend dev server
npm run dev
```

#### Production Mode

```bash
# Build frontend
npm run build

# Start with PM2
pm2 start server-new.js --name heartland-incidents

# Or with Node.js directly
NODE_ENV=production node server-new.js
```

### Step 10: Verify Installation

1. **Check API Health:**
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T12:00:00.000Z",
  "database": "connected"
}
```

2. **Check Frontend:**
Open browser to http://localhost:8080

3. **Test Authentication:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@heartland.org","password":"your-password"}'
```

4. **Test Incident Creation:**
```bash
# Use the token from login
curl -X POST http://localhost:3000/api/incidents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d @sample-data/incident-samples.json
```

## 🔧 Configuration

### File Storage Configuration

#### Local Storage (Development)

```env
STORAGE_TYPE=local
UPLOAD_DIR=./uploads/incidents
```

#### AWS S3 (Production)

```env
STORAGE_TYPE=s3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=heartland-incidents
```

**Set up S3 bucket:**

```bash
# Create bucket
aws s3 mb s3://heartland-incidents

# Set bucket policy
aws s3api put-bucket-policy \
  --bucket heartland-incidents \
  --policy file://s3-bucket-policy.json

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket heartland-incidents \
  --versioning-configuration Status=Enabled
```

### HTTPS/SSL Configuration

For production, enable HTTPS:

```bash
# Generate self-signed certificate (development only)
openssl req -x509 -newkey rsa:4096 \
  -keyout key.pem -out cert.pem \
  -days 365 -nodes

# Or use Let's Encrypt (production)
sudo certbot certonly --standalone \
  -d heartland.example.com
```

Update server configuration:

```javascript
// server-new.js
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};

https.createServer(options, app).listen(443);
```

### Email Notifications (Optional)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@heartland.org
```

## 🧪 Testing

### Run Test Suite

```bash
# Install test dependencies
npm install --save-dev jest supertest @types/jest

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test tests/incident-api.test.js
```

### Load Sample Data

```bash
# Load sample incidents
node scripts/load-sample-data.js

# Or manually:
mongoimport --db heartland \
  --collection incident_reports \
  --file sample-data/incident-samples.json \
  --jsonArray
```

## 🐳 Docker Deployment

### Build Docker Image

```bash
# Create Dockerfile
cat > Dockerfile << 'EOF'
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "server-new.js"]
EOF

# Build image
docker build -t heartland-incidents:latest .
```

### Run with Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    image: heartland-incidents:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/heartland
    env_file:
      - .env.production
    depends_on:
      - mongo
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs

  mongo:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
    environment:
      - MONGO_INITDB_DATABASE=heartland

volumes:
  mongo-data:
```

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

## 📊 Monitoring Setup

### PM2 Monitoring

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start server-new.js --name heartland-incidents

# Enable monitoring
pm2 monitor

# Set up startup script
pm2 startup
pm2 save
```

### Log Rotation

```bash
# Install PM2 log rotate
pm2 install pm2-logrotate

# Configure
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

### Health Checks

Add to crontab:

```bash
# Check every 5 minutes
*/5 * * * * curl -f http://localhost:3000/health || systemctl restart heartland-incidents
```

## 🔐 Security Hardening

### 1. Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 443/tcp  # HTTPS
sudo ufw deny 3000/tcp  # Block direct API access
sudo ufw enable
```

### 2. Fail2Ban Setup

```bash
# Install fail2ban
sudo apt-get install fail2ban

# Configure for Node.js app
sudo nano /etc/fail2ban/jail.local
```

```ini
[heartland-incidents]
enabled = true
port = 3000
filter = heartland-incidents
logpath = /var/log/heartland-incidents/error.log
maxretry = 5
bantime = 3600
```

### 3. Regular Updates

```bash
# Create update script
cat > scripts/update-system.sh << 'EOF'
#!/bin/bash
npm audit fix
npm update
pm2 restart heartland-incidents
EOF

chmod +x scripts/update-system.sh

# Schedule weekly updates
crontab -e
# Add: 0 2 * * 0 /path/to/scripts/update-system.sh
```

## 🔄 Backup Configuration

### Automated Backups

```bash
# Make backup script executable
chmod +x scripts/backup-incidents.sh

# Add to crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * /path/to/scripts/backup-incidents.sh

# Weekly full backup
0 3 * * 0 /path/to/scripts/backup-full.sh
```

### Test Restore

```bash
# Test restore procedure
./scripts/restore-backup.sh 20250115_020000

# Verify data
mongosh heartland --eval "db.incident_reports.countDocuments()"
```

## 🚨 Troubleshooting

### Common Issues

#### 1. MongoDB Connection Failed

```bash
# Check MongoDB status
systemctl status mongod

# Check connection
mongosh $MONGODB_URI --eval "db.stats()"

# Check firewall
sudo ufw status
```

#### 2. Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

#### 3. Permission Denied on Uploads

```bash
# Fix permissions
sudo chown -R $USER:$USER uploads/
chmod -R 755 uploads/
```

#### 4. Encryption Errors

```bash
# Verify encryption key
node -e "console.log(process.env.ENCRYPTION_MASTER_KEY.length)"
# Should output: 44 (32 bytes base64 encoded)

# Test encryption
node scripts/test-encryption.js
```

## ✅ Post-Installation Checklist

- [ ] MongoDB is running and accessible
- [ ] Environment variables are configured
- [ ] Encryption key is generated and secure
- [ ] Upload directories exist with correct permissions
- [ ] Admin user is created
- [ ] Application starts without errors
- [ ] API health check passes
- [ ] Frontend loads correctly
- [ ] Can create test incident
- [ ] File upload works
- [ ] Signature capture works
- [ ] PDF export works
- [ ] Backups are configured
- [ ] Monitoring is set up
- [ ] SSL/HTTPS is configured (production)
- [ ] Firewall rules are in place
- [ ] Documentation is accessible

## 📞 Support

If you encounter issues during installation:

1. Check logs: `pm2 logs heartland-incidents`
2. Review error messages carefully
3. Consult troubleshooting section above
4. Check MongoDB logs: `/var/log/mongodb/mongod.log`
5. Contact system administrator: admin@heartland.org

## 🎉 Next Steps

After successful installation:

1. **Configure Users**: Add staff, supervisor, and admin users
2. **Test Workflow**: Create a test incident through the full workflow
3. **Train Staff**: Provide training on the new system
4. **Import Data**: If migrating, import existing incident data
5. **Set Up Monitoring**: Configure alerts and monitoring
6. **Schedule Maintenance**: Set up regular maintenance tasks
7. **Review Security**: Conduct security audit
8. **Document Procedures**: Create internal documentation

## 📚 Additional Resources

- **Main Documentation**: `INCIDENT_REPORTING_SYSTEM.md`
- **Operations Guide**: `INCIDENT_SYSTEM_RUNBOOK.md`
- **API Documentation**: http://localhost:3000/api/docs
- **Sample Data**: `sample-data/incident-samples.json`

---

**Installation Complete!** 🎊

Your Incident Reporting System is now ready to use.

Access the application at: http://localhost:8080
API endpoint: http://localhost:3000

Default admin credentials (change immediately):
- Email: admin@heartland.org
- Password: (set during user creation)