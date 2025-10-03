# Incident Reporting System - Operations Runbook

## Table of Contents
1. [Encryption Key Rotation](#encryption-key-rotation)
2. [Access Management](#access-management)
3. [Backup and Recovery](#backup-and-recovery)
4. [Incident Response](#incident-response)
5. [Maintenance Procedures](#maintenance-procedures)
6. [Troubleshooting](#troubleshooting)

---

## Encryption Key Rotation

### When to Rotate Keys
- **Scheduled**: Every 90 days (recommended)
- **Immediate**: If key compromise is suspected
- **Staff Changes**: When staff with key access leaves
- **Security Audit**: As required by compliance

### Key Rotation Procedure

#### Step 1: Generate New Key
```bash
# SSH into production server
ssh admin@heartland-prod

# Generate new encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Save output securely (use password manager)
# Example output: "xK8vN2mP9qR5sT7uW1yZ3aB4cD6eF8gH0iJ2kL4mN6oP8qR0sT2uW4yZ6aB8cD0e="
```

#### Step 2: Add New Key to Database
```bash
# Connect to MongoDB
mongosh "mongodb+srv://cluster.mongodb.net/heartland" --username admin

# Insert new key (version increments automatically)
db.encryption_keys.insertOne({
  version: 2,  // Increment from current version
  key_encrypted: "xK8vN2mP9qR5sT7uW1yZ3aB4cD6eF8gH0iJ2kL4mN6oP8qR0sT2uW4yZ6aB8cD0e=",
  algorithm: "AES-256-GCM",
  created_at: new Date(),
  active: false  // Not active yet
});
```

#### Step 3: Re-encrypt Existing Data
```bash
# Run re-encryption script
node scripts/reencrypt-data.js --old-version 1 --new-version 2

# This script will:
# 1. Load old key (version 1)
# 2. Decrypt all encrypted fields
# 3. Encrypt with new key (version 2)
# 4. Update records with new encrypted data
# 5. Update encryption_key_version field
```

#### Step 4: Activate New Key
```bash
# In MongoDB
db.encryption_keys.updateOne(
  { version: 1 },
  { $set: { active: false, rotated_at: new Date() } }
);

db.encryption_keys.updateOne(
  { version: 2 },
  { $set: { active: true } }
);
```

#### Step 5: Update Environment Variables
```bash
# Update .env file
nano /opt/heartland/incidents/.env

# Change:
ENCRYPTION_MASTER_KEY=<new-key-from-step-1>
ENCRYPTION_KEY_VERSION=2

# Restart application
pm2 restart heartland-incidents
```

#### Step 6: Verify
```bash
# Test encryption/decryption
node scripts/test-encryption.js

# Check logs for errors
pm2 logs heartland-incidents --lines 100

# Verify a few incident reports can be viewed
curl -H "Authorization: Bearer $TOKEN" \
  https://api.heartland.example.com/api/incidents/test-id
```

#### Step 7: Archive Old Key
```bash
# Keep old key for 90 days in case of issues
# Store in secure vault (e.g., AWS Secrets Manager, 1Password)

# After 90 days, mark as archived
db.encryption_keys.updateOne(
  { version: 1 },
  { $set: { archived: true, archived_at: new Date() } }
);
```

### Re-encryption Script

Create `scripts/reencrypt-data.js`:
```javascript
const { MongoClient } = require('mongodb');
const { EncryptionService } = require('../server/utils/encryption');

async function reencryptData(oldVersion, newVersion) {
  const client = await MongoClient.connect(process.env.MONGODB_URI);
  const db = client.db(process.env.MONGODB_DB_NAME);
  
  // Load keys
  const oldKey = await db.collection('encryption_keys')
    .findOne({ version: oldVersion });
  const newKey = await db.collection('encryption_keys')
    .findOne({ version: newVersion });
  
  if (!oldKey || !newKey) {
    throw new Error('Keys not found');
  }
  
  // Initialize encryption services
  const oldEncryption = new EncryptionService();
  oldEncryption.initialize(oldKey.key_encrypted, oldVersion);
  
  const newEncryption = new EncryptionService();
  newEncryption.initialize(newKey.key_encrypted, newVersion);
  
  // Get all incidents with old key version
  const incidents = await db.collection('incident_reports')
    .find({ encryption_key_version: oldVersion })
    .toArray();
  
  console.log(`Re-encrypting ${incidents.length} incidents...`);
  
  let processed = 0;
  for (const incident of incidents) {
    try {
      // Decrypt with old key
      const youthName = incident.youth_name_encrypted 
        ? oldEncryption.decrypt(incident.youth_name_encrypted)
        : null;
      const youthDOB = incident.youth_dob_encrypted
        ? oldEncryption.decrypt(incident.youth_dob_encrypted)
        : null;
      const medicalDetails = incident.medical_details_encrypted
        ? oldEncryption.decrypt(incident.medical_details_encrypted)
        : null;
      
      // Encrypt with new key
      const updates = {
        encryption_key_version: newVersion
      };
      
      if (youthName) {
        updates.youth_name_encrypted = newEncryption.encrypt(youthName);
      }
      if (youthDOB) {
        updates.youth_dob_encrypted = newEncryption.encrypt(youthDOB);
      }
      if (medicalDetails) {
        updates.medical_details_encrypted = newEncryption.encrypt(medicalDetails);
      }
      
      // Update record
      await db.collection('incident_reports').updateOne(
        { id: incident.id },
        { $set: updates }
      );
      
      processed++;
      if (processed % 10 === 0) {
        console.log(`Processed ${processed}/${incidents.length}`);
      }
    } catch (error) {
      console.error(`Error processing incident ${incident.id}:`, error);
    }
  }
  
  console.log(`Re-encryption complete. Processed ${processed} incidents.`);
  await client.close();
}

// Run
const oldVersion = parseInt(process.argv[2]);
const newVersion = parseInt(process.argv[3]);

if (!oldVersion || !newVersion) {
  console.error('Usage: node reencrypt-data.js <old-version> <new-version>');
  process.exit(1);
}

reencryptData(oldVersion, newVersion)
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Re-encryption failed:', err);
    process.exit(1);
  });
```

---

## Access Management

### Adding a New User

#### Step 1: Create User Account
```bash
# Via API
curl -X POST https://api.heartland.example.com/api/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@heartland.org",
    "firstName": "John",
    "lastName": "Doe",
    "role": "staff"
  }'
```

#### Step 2: Assign Role
```bash
# In MongoDB
db.user_roles.insertOne({
  id: UUID(),
  user_id: "user-id-from-step-1",
  role: "staff",  // or "supervisor" or "admin"
  granted_at: new Date(),
  granted_by: "admin-user-id"
});
```

#### Step 3: Send Welcome Email
```bash
# Trigger password reset email
curl -X POST https://api.heartland.example.com/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@heartland.org"
  }'
```

### Changing User Role

```bash
# Revoke old role
db.user_roles.updateOne(
  { user_id: "user-id", role: "staff" },
  { $set: { revoked_at: new Date() } }
);

# Grant new role
db.user_roles.insertOne({
  id: UUID(),
  user_id: "user-id",
  role: "supervisor",
  granted_at: new Date(),
  granted_by: "admin-user-id"
});
```

### Removing User Access

```bash
# Revoke all roles
db.user_roles.updateMany(
  { user_id: "user-id", revoked_at: { $exists: false } },
  { $set: { revoked_at: new Date() } }
);

# Invalidate sessions
db.sessions.deleteMany({ user_id: "user-id" });

# Mark user as inactive
db.users.updateOne(
  { id: "user-id" },
  { $set: { active: false, deactivated_at: new Date() } }
);
```

### Audit User Access

```bash
# View user's recent activity
db.incident_audit_logs.find({
  performed_by: "user-id",
  performed_at: { $gte: new Date(Date.now() - 30*24*60*60*1000) }
}).sort({ performed_at: -1 });

# View incidents user has accessed
db.incident_audit_logs.aggregate([
  { $match: { performed_by: "user-id" } },
  { $group: { _id: "$incident_id", actions: { $push: "$action" } } }
]);
```

---

## Backup and Recovery

### Daily Backup Procedure

```bash
#!/bin/bash
# /opt/heartland/scripts/backup-incidents.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/incidents"
S3_BUCKET="s3://heartland-backups/incidents"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup MongoDB
mongodump \
  --uri="$MONGODB_URI" \
  --db="$MONGODB_DB_NAME" \
  --out="$BACKUP_DIR/mongo_$DATE"

# Backup uploaded files
tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" /opt/heartland/uploads

# Encrypt backups
gpg --encrypt --recipient backup@heartland.org \
  "$BACKUP_DIR/mongo_$DATE"
gpg --encrypt --recipient backup@heartland.org \
  "$BACKUP_DIR/uploads_$DATE.tar.gz"

# Upload to S3
aws s3 sync $BACKUP_DIR $S3_BUCKET

# Clean up local backups older than 7 days
find $BACKUP_DIR -type f -mtime +7 -delete

# Log completion
echo "$(date): Backup completed successfully" >> /var/log/heartland-backup.log
```

### Schedule Backups

```bash
# Add to crontab
crontab -e

# Daily at 2 AM
0 2 * * * /opt/heartland/scripts/backup-incidents.sh

# Weekly full backup (Sundays at 3 AM)
0 3 * * 0 /opt/heartland/scripts/backup-full.sh
```

### Restore from Backup

```bash
#!/bin/bash
# Restore procedure

# Download from S3
aws s3 cp s3://heartland-backups/incidents/mongo_20250115_020000.tar.gz.gpg .
aws s3 cp s3://heartland-backups/incidents/uploads_20250115_020000.tar.gz.gpg .

# Decrypt
gpg --decrypt mongo_20250115_020000.tar.gz.gpg > mongo_backup.tar.gz
gpg --decrypt uploads_20250115_020000.tar.gz.gpg > uploads_backup.tar.gz

# Extract
tar -xzf mongo_backup.tar.gz
tar -xzf uploads_backup.tar.gz

# Restore MongoDB
mongorestore \
  --uri="$MONGODB_URI" \
  --db="$MONGODB_DB_NAME" \
  --drop \
  mongo_backup/

# Restore uploads
rm -rf /opt/heartland/uploads/*
cp -r uploads_backup/* /opt/heartland/uploads/

# Restart application
pm2 restart heartland-incidents

echo "Restore completed"
```

---

## Incident Response

### Security Breach Response

#### Immediate Actions (0-1 hour)
1. **Isolate affected systems**
   ```bash
   # Stop application
   pm2 stop heartland-incidents
   
   # Block external access
   sudo ufw deny 3000
   ```

2. **Assess scope**
   ```bash
   # Check audit logs
   db.incident_audit_logs.find({
     performed_at: { $gte: new Date("2025-01-15T00:00:00Z") }
   }).sort({ performed_at: -1 });
   
   # Check for unauthorized access
   db.incident_audit_logs.find({
     action: "viewed",
     performed_by: { $nin: ["known-user-ids"] }
   });
   ```

3. **Notify stakeholders**
   - IT Security Team
   - Management
   - Legal counsel (if PII accessed)

#### Short-term Actions (1-24 hours)
1. **Rotate all keys**
   - Follow key rotation procedure above
   - Generate new JWT secret
   - Reset all user passwords

2. **Patch vulnerabilities**
   ```bash
   # Update dependencies
   npm audit fix
   npm update
   
   # Apply security patches
   git pull origin security-patches
   npm install
   ```

3. **Review access logs**
   ```bash
   # Export audit logs
   mongoexport \
     --uri="$MONGODB_URI" \
     --collection=incident_audit_logs \
     --out=audit_export_$(date +%Y%m%d).json
   ```

#### Long-term Actions (1-7 days)
1. **Conduct forensic analysis**
2. **Update security policies**
3. **Provide staff training**
4. **File required breach notifications** (if applicable)

### Data Corruption Response

```bash
# Verify data integrity
node scripts/verify-data-integrity.js

# If corruption detected:
# 1. Stop application
pm2 stop heartland-incidents

# 2. Restore from last known good backup
./scripts/restore-backup.sh 20250114_020000

# 3. Replay transactions from audit log
node scripts/replay-transactions.js --from="2025-01-14T02:00:00Z"

# 4. Verify restoration
node scripts/verify-data-integrity.js

# 5. Restart application
pm2 start heartland-incidents
```

---

## Maintenance Procedures

### Weekly Maintenance

```bash
#!/bin/bash
# /opt/heartland/scripts/weekly-maintenance.sh

# Check disk space
df -h | grep -E '(Filesystem|/opt|/var)'

# Check database size
mongo --eval "db.stats()" $MONGODB_URI

# Optimize database
mongo --eval "db.runCommand({ compact: 'incident_reports' })" $MONGODB_URI

# Clean up old drafts (>30 days)
mongo --eval "
  db.incident_drafts.deleteMany({
    last_saved: { \$lt: new Date(Date.now() - 30*24*60*60*1000) }
  })
" $MONGODB_URI

# Check for failed uploads
find /opt/heartland/uploads/temp -type f -mtime +1 -delete

# Review error logs
tail -n 100 /var/log/heartland-incidents/error.log

# Check SSL certificate expiration
openssl x509 -in /etc/ssl/certs/heartland.crt -noout -enddate

# Generate health report
node scripts/health-check.js > /var/log/heartland-health-$(date +%Y%m%d).log
```

### Monthly Maintenance

```bash
# Review and archive old incidents (>1 year)
db.incident_reports.updateMany(
  {
    incident_date: { $lt: new Date(Date.now() - 365*24*60*60*1000) },
    status: "resolved"
  },
  { $set: { status: "archived" } }
);

# Generate compliance report
node scripts/generate-compliance-report.js --month=$(date +%Y-%m)

# Review user access
node scripts/audit-user-access.js

# Update dependencies
npm outdated
npm update

# Run security audit
npm audit
```

---

## Troubleshooting

### Application Won't Start

```bash
# Check logs
pm2 logs heartland-incidents --lines 50

# Common issues:
# 1. MongoDB connection
mongo $MONGODB_URI --eval "db.stats()"

# 2. Port already in use
lsof -i :3000
kill -9 <PID>

# 3. Environment variables
cat .env | grep -v "^#"

# 4. File permissions
ls -la /opt/heartland/incidents
chown -R heartland:heartland /opt/heartland/incidents
```

### Slow Performance

```bash
# Check database indexes
mongo --eval "db.incident_reports.getIndexes()" $MONGODB_URI

# Add missing indexes
mongo --eval "
  db.incident_reports.createIndex({ incident_date: -1 });
  db.incident_reports.createIndex({ status: 1 });
  db.incident_reports.createIndex({ created_by: 1 });
" $MONGODB_URI

# Check slow queries
mongo --eval "db.setProfilingLevel(2)" $MONGODB_URI
# Wait a few minutes
mongo --eval "db.system.profile.find().sort({millis:-1}).limit(10)" $MONGODB_URI

# Check server resources
top
free -h
df -h
```

### Encryption Errors

```bash
# Verify encryption key
node -e "
  const { encryptionService } = require('./server/utils/encryption');
  encryptionService.initialize(process.env.ENCRYPTION_MASTER_KEY);
  const encrypted = encryptionService.encrypt('test');
  const decrypted = encryptionService.decrypt(encrypted);
  console.log('Encryption test:', decrypted === 'test' ? 'PASS' : 'FAIL');
"

# Check key version mismatch
db.incident_reports.aggregate([
  { $group: { _id: "$encryption_key_version", count: { $sum: 1 } } }
]);

# If mismatch, run re-encryption
node scripts/reencrypt-data.js <old-version> <new-version>
```

### File Upload Issues

```bash
# Check upload directory permissions
ls -la /opt/heartland/uploads
chmod 755 /opt/heartland/uploads
chown heartland:heartland /opt/heartland/uploads

# Check disk space
df -h /opt/heartland/uploads

# Check file size limits
grep -r "maxFileSize" /opt/heartland/incidents/server/

# Test S3 connection (if using S3)
aws s3 ls s3://heartland-incidents/
```

---

## Emergency Contacts

- **System Administrator**: admin@heartland.org / (555) 123-4567
- **Database Administrator**: dba@heartland.org / (555) 123-4568
- **Security Team**: security@heartland.org / (555) 123-4569
- **On-Call**: oncall@heartland.org / (555) 123-4570

## Escalation Path

1. **Level 1**: System Administrator (response time: 1 hour)
2. **Level 2**: IT Manager (response time: 2 hours)
3. **Level 3**: CTO (response time: 4 hours)
4. **Level 4**: External Vendor Support (response time: 24 hours)

---

**Last Updated**: January 2025
**Version**: 1.0
**Next Review**: April 2025