# Incident Reporting System - Quick Reference Guide

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.incidents.example .env

# Generate keys
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  # JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"  # ENCRYPTION_KEY

# Run migrations
mongosh < migrations/002_incident_reports.sql

# Start development
npm run dev:full

# Run tests
npm test
```

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `src/components/incidents/IncidentReportForm.tsx` | Main form component |
| `src/components/incidents/SignatureCanvas.tsx` | Digital signature |
| `src/components/incidents/FileUpload.tsx` | File attachments |
| `src/pages/IncidentReports.tsx` | List/dashboard page |
| `server/incident-routes.js` | API endpoints |
| `server/utils/encryption.js` | Encryption utilities |
| `src/types/incident-types.ts` | TypeScript types |
| `src/schemas/incident-schema.ts` | Zod validation |
| `migrations/002_incident_reports.sql` | Database schema |
| `tests/incident-api.test.js` | API tests |

---

## 🔌 API Endpoints

### Authentication
```
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
```

### Incidents
```
POST   /api/incidents              # Create incident
GET    /api/incidents              # List incidents (with filters)
GET    /api/incidents/:id          # Get single incident
PATCH  /api/incidents/:id          # Update incident
DELETE /api/incidents/:id          # Soft delete incident
POST   /api/incidents/:id/submit   # Submit for review
POST   /api/incidents/:id/approve  # Approve (supervisor only)
```

### Attachments
```
POST   /api/incidents/:id/attachments    # Upload files
DELETE /api/incidents/:id/attachments/:attachmentId
```

### Export
```
POST   /api/incidents/:id/export         # Generate PDF
  Body: { type: 'full' | 'anonymized', includeAttachments: boolean }
```

### Audit
```
GET    /api/incidents/:id/audit-log      # View audit trail
```

---

## 🔐 Authentication

### Login
```javascript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password })
});
const { token, user } = await response.json();
```

### Authenticated Request
```javascript
const response = await fetch('/api/incidents', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

---

## 👥 User Roles

| Role | Permissions |
|------|-------------|
| **Staff** | Create/edit own drafts, view own incidents |
| **Supervisor** | View/edit all incidents, approve submissions |
| **Admin** | Full access including user management |

---

## 🔒 Encrypted Fields

The following fields are encrypted at rest using AES-256-GCM:

- `youthInfo.firstName`
- `youthInfo.lastName`
- `youthInfo.dateOfBirth`
- `medicalDetails`
- `witnesses[].name`

**SSN is hashed (SHA-256) and never stored in plain text.**

---

## 📝 Form Validation

### Required Fields
- `incidentDate`
- `incidentTime`
- `location`
- `incidentType`
- `severity`
- `youthInfo.firstName`
- `youthInfo.lastName`
- `description`
- `reportedBy`

### Field Formats
- **Date**: `YYYY-MM-DD`
- **Time**: `HH:mm` (24-hour)
- **Phone**: `(555) 555-5555` or `555-555-5555`
- **Email**: Standard email format
- **SSN**: `XXX-XX-XXXX` (masked in UI)

---

## 🎨 Form Tabs

### Tab 1: Basic Info
- Date, time, location
- Incident type, severity
- Youth information
- Reported by

### Tab 2: Details
- Description
- Antecedents
- Behavior observed
- Consequences
- Witnesses

### Tab 3: Actions
- Immediate actions taken
- Medical attention
- Notifications sent
- Follow-up required

### Tab 4: Attachments
- File uploads (images, PDFs)
- Max 10MB total
- Drag-and-drop support

### Tab 5: Signatures
- Digital signature capture
- Staff ID and timestamp

---

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Run Specific Test
```bash
npm test -- incident-api.test.js
```

### Run with Coverage
```bash
npm run test:coverage
```

### Test User Accounts
```javascript
// Staff
{ username: 'staff1', password: 'password123', role: 'staff' }

// Supervisor
{ username: 'supervisor1', password: 'password123', role: 'supervisor' }

// Admin
{ username: 'admin1', password: 'password123', role: 'admin' }
```

---

## 📤 Export Options

### Full Report (Internal)
```javascript
const response = await fetch(`/api/incidents/${id}/export`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'full',
    includeAttachments: true
  })
});
```

### Anonymized Report (External)
```javascript
const response = await fetch(`/api/incidents/${id}/export`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'anonymized',
    includeAttachments: false
  })
});
```

---

## 🔄 Autosave

The form automatically saves drafts every 3 seconds when:
- Form is dirty (has unsaved changes)
- User is authenticated
- Not currently saving or submitting

```javascript
// Autosave is handled automatically
// No manual intervention needed
```

---

## 🎯 Common Tasks

### Create New Incident
1. Navigate to `/incidents/new`
2. Fill required fields (marked with *)
3. Form autosaves every 3 seconds
4. Upload attachments (optional)
5. Add signature
6. Click "Submit for Review"

### Edit Existing Incident
1. Navigate to `/incidents`
2. Click incident from list
3. Make changes
4. Form autosaves automatically
5. Click "Save" or "Submit"

### Export Report
1. Open incident
2. Click "Export" button
3. Choose "Full" or "Anonymized"
4. Choose to include/exclude attachments
5. PDF downloads automatically

### View Audit Log
1. Open incident
2. Click "Audit Log" tab
3. View all actions taken
4. Filter by action type or date

---

## 🐛 Debugging

### Enable Debug Logging
```bash
DEBUG=incident:* npm run dev:full
```

### Check Encryption
```javascript
const { encryptionService } = require('./server/utils/encryption');
encryptionService.initialize(process.env.ENCRYPTION_MASTER_KEY);

const encrypted = encryptionService.encrypt('test data');
console.log('Encrypted:', encrypted);

const decrypted = encryptionService.decrypt(encrypted);
console.log('Decrypted:', decrypted);
```

### Verify JWT Token
```javascript
const jwt = require('jsonwebtoken');
const decoded = jwt.verify(token, process.env.JWT_SECRET);
console.log('Token payload:', decoded);
```

---

## 🔧 Configuration

### Environment Variables
```bash
# Required
MONGODB_URI=mongodb://localhost:27017/heartland
JWT_SECRET=<32-char-hex-string>
ENCRYPTION_MASTER_KEY=<32-byte-base64-string>

# Optional
PORT=3000
NODE_ENV=development
STORAGE_TYPE=local  # or 's3'
UPLOAD_DIR=./uploads
JWT_EXPIRATION=7d

# AWS S3 (if using)
AWS_REGION=us-east-1
AWS_S3_BUCKET=heartland-incidents
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
```

---

## 📊 Database Collections

### incident_reports
```javascript
{
  id: 'uuid',
  status: 'draft' | 'submitted' | 'approved' | 'archived',
  incidentDate: 'YYYY-MM-DD',
  incidentTime: 'HH:mm',
  location: 'string',
  incidentType: 'string',
  severity: 'low' | 'medium' | 'high' | 'critical',
  youthInfo: {
    firstName: 'encrypted',
    lastName: 'encrypted',
    dateOfBirth: 'encrypted',
    ssnHash: 'sha256-hash'
  },
  description: 'string',
  witnesses: [{ name: 'encrypted', role: 'string', statement: 'string' }],
  immediateActions: [{ action: 'string', takenBy: 'string', timestamp: 'ISO8601' }],
  attachments: [{ id: 'uuid', filename: 'string', url: 'string', type: 'string' }],
  signatures: [{ staffId: 'string', signature: 'base64', timestamp: 'ISO8601' }],
  createdAt: 'ISO8601',
  updatedAt: 'ISO8601',
  deletedAt: 'ISO8601 | null'
}
```

### incident_audit_logs
```javascript
{
  id: 'uuid',
  incidentId: 'uuid',
  action: 'create' | 'update' | 'view' | 'export' | 'delete',
  performedBy: 'user-id',
  performedAt: 'ISO8601',
  ipAddress: 'string',
  userAgent: 'string',
  changes: { before: {}, after: {} },
  exportType: 'full' | 'anonymized' | null
}
```

---

## 🎨 UI Components

### Import Components
```typescript
import IncidentReportForm from '@/components/incidents/IncidentReportForm';
import SignatureCanvas from '@/components/incidents/SignatureCanvas';
import FileUpload from '@/components/incidents/FileUpload';
```

### Use Form Component
```typescript
<IncidentReportForm
  incident={existingIncident}  // Optional
  onSave={handleSave}
  onSubmit={handleSubmit}
  readOnly={false}
/>
```

### Use Signature Component
```typescript
<SignatureCanvas
  onSave={(signature) => console.log(signature)}
  staffId="staff-123"
/>
```

### Use File Upload Component
```typescript
<FileUpload
  onUpload={(files) => console.log(files)}
  maxSize={10 * 1024 * 1024}  // 10MB
  accept={['image/jpeg', 'image/png', 'application/pdf']}
/>
```

---

## 🔍 Search & Filter

### Filter Incidents
```javascript
const response = await fetch('/api/incidents?' + new URLSearchParams({
  status: 'submitted',
  type: 'behavioral',
  severity: 'high',
  startDate: '2025-01-01',
  endDate: '2025-01-31',
  page: '1',
  limit: '20'
}), {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Search Incidents
```javascript
const response = await fetch('/api/incidents?' + new URLSearchParams({
  search: 'keyword',
  searchFields: 'description,location'
}), {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

---

## 🔐 Security Best Practices

### Never Log Sensitive Data
```javascript
// ❌ Bad
console.log('Youth info:', incident.youthInfo);

// ✅ Good
console.log('Incident ID:', incident.id);
```

### Always Validate Input
```javascript
// ✅ Use Zod schema
const result = IncidentReportSchema.safeParse(data);
if (!result.success) {
  return res.status(400).json({ errors: result.error.errors });
}
```

### Use Parameterized Queries
```javascript
// ✅ MongoDB automatically handles this
await db.collection('incidents').findOne({ id: incidentId });
```

### Sanitize User Input
```javascript
// ✅ Already handled by Express and Zod
// No additional sanitization needed
```

---

## 📈 Performance Tips

### Optimize Database Queries
```javascript
// ✅ Use indexes
db.collection('incidents').createIndex({ status: 1, createdAt: -1 });

// ✅ Limit fields returned
db.collection('incidents').find({}, { projection: { description: 0 } });

// ✅ Use pagination
db.collection('incidents').find().skip(20).limit(20);
```

### Optimize Frontend
```javascript
// ✅ Use React.memo for expensive components
const MemoizedComponent = React.memo(ExpensiveComponent);

// ✅ Debounce autosave
const debouncedSave = debounce(save, 3000);

// ✅ Lazy load components
const IncidentReports = lazy(() => import('./pages/IncidentReports'));
```

---

## 🆘 Troubleshooting

### Issue: "Encryption service not initialized"
**Solution**: Ensure `ENCRYPTION_MASTER_KEY` is set in `.env`

### Issue: "JWT token expired"
**Solution**: Refresh token or re-login

### Issue: "File upload failed"
**Solution**: Check file size (max 10MB) and type (JPEG, PNG, GIF, PDF only)

### Issue: "Validation error"
**Solution**: Check required fields and field formats

### Issue: "Unauthorized"
**Solution**: Ensure JWT token is included in Authorization header

### Issue: "Insufficient permissions"
**Solution**: Check user role and endpoint permissions

---

## 📞 Support

### Documentation
- **Main Docs**: `INCIDENT_REPORTING_SYSTEM.md`
- **Installation**: `INCIDENT_SYSTEM_INSTALL.md`
- **Operations**: `INCIDENT_SYSTEM_RUNBOOK.md`
- **Architecture**: `INCIDENT_SYSTEM_ARCHITECTURE.md`
- **Status**: `INCIDENT_SYSTEM_STATUS.md`

### Code Examples
- **Sample Data**: `sample-data/incident-samples.json`
- **API Tests**: `tests/incident-api.test.js`

---

## ✅ Checklist

### Before Deployment
- [ ] Generate production JWT_SECRET
- [ ] Generate production ENCRYPTION_MASTER_KEY
- [ ] Configure production database
- [ ] Set up S3 bucket (if using)
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Run all tests
- [ ] Train staff

### After Deployment
- [ ] Monitor error logs
- [ ] Review audit logs
- [ ] Collect user feedback
- [ ] Schedule key rotation (90 days)
- [ ] Test disaster recovery

---

**Last Updated**: January 2025  
**Version**: 1.0.0