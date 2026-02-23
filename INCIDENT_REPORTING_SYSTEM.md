# Incident Reporting System - Heartland Boys Home

## Overview

A comprehensive, trauma-informed incident reporting system designed specifically for residential youth care facilities. This system prioritizes security, privacy, accessibility, and compliance with regulatory requirements.

## Features

### ✅ Core Functionality
- **Comprehensive Incident Documentation**: Capture all aspects of incidents including antecedents, behaviors, and consequences
- **Multi-Step Form**: Organized into logical sections (Basic Info, Details, Actions, Attachments, Signatures)
- **Autosave**: Automatic draft saving every 3 seconds to prevent data loss
- **File Attachments**: Support for images and PDFs with client-side preview (10MB total limit)
- **Digital Signatures**: Touch/mouse signature capture with timestamp
- **Progress Tracking**: Visual progress indicator showing form completion

### 🔒 Security & Privacy
- **Field-Level Encryption**: Sensitive data (youth names, DOB, medical details) encrypted at rest using AES-256-GCM
- **SSN Protection**: Never stores plain SSN; uses SHA-256 hash only
- **Role-Based Access Control (RBAC)**: Three roles - staff, supervisor, admin
- **Audit Logging**: Complete audit trail of all create/update/view/export actions
- **Anonymized Exports**: Option to export reports with PII redacted
- **JWT Authentication**: Secure token-based authentication

### ♿ Accessibility
- **WCAG 2.1 AA Compliant**: Meets accessibility standards
- **Keyboard Navigation**: Full keyboard support throughout
- **Screen Reader Friendly**: Proper ARIA labels and semantic HTML
- **Error Messages**: Clear, inline validation messages
- **Focus Management**: Logical tab order and focus indicators

### 🎨 Trauma-Informed Design
- **Non-Judgmental Language**: Helper text encourages objective documentation
- **Clear Instructions**: Guidance at every step
- **Visual Hierarchy**: Clean, organized interface reduces cognitive load
- **Progress Feedback**: Users always know where they are in the process

## Architecture

### Frontend Stack
- **React 18.3.1** with TypeScript
- **React Hook Form** with Zod validation
- **Tailwind CSS** + shadcn/ui components
- **Date-fns** for date handling

### Backend Stack
- **Node.js 20.x** with Express
- **MongoDB** for data storage
- **JWT** for authentication
- **Multer** for file uploads
- **Crypto** (Node.js built-in) for encryption

### Database Schema

```sql
-- See migrations/002_incident_reports.sql for complete schema

Tables:
- incident_reports: Main incident data
- incident_audit_logs: Audit trail
- incident_drafts: Autosaved drafts
- incident_attachments: File metadata
- encryption_keys: Key rotation management
- user_roles: RBAC configuration
```

## Installation

### Prerequisites
- Node.js 20.x or higher
- MongoDB 6.x or higher
- npm or bun package manager

### Steps

1. **Install Dependencies**
```bash
npm install
```

2. **Set Environment Variables**
```bash
cp .env.example .env
```

Edit `.env` and configure:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/heartland
MONGODB_DB_NAME=heartland

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Encryption
ENCRYPTION_MASTER_KEY=your-base64-encoded-master-key
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# File Storage
STORAGE_TYPE=local  # or 's3'
UPLOAD_DIR=./uploads

# S3 Configuration (if using S3)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=heartland-incidents

# Server
PORT=3000
NODE_ENV=development
```

3. **Run Database Migrations**
```bash
npm run migrate
```

4. **Start Development Server**
```bash
# Full stack (API + Frontend)
npm run dev:full

# Or separately:
npm run start  # API only
npm run dev    # Frontend only
```

5. **Access the Application**
- Frontend: http://localhost:8080
- API: http://localhost:3000

## API Endpoints

### Authentication
```
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
```

### Incidents
```
POST   /api/incidents              Create new incident
GET    /api/incidents              List incidents (with filters)
GET    /api/incidents/:id          Get single incident
PATCH  /api/incidents/:id          Update incident
DELETE /api/incidents/:id          Soft delete incident

POST   /api/incidents/:id/attachments    Upload files
DELETE /api/incidents/:id/attachments/:attachmentId

POST   /api/incidents/:id/export   Export as PDF
GET    /api/incidents/:id/audit-log      View audit log (supervisor+)
```

### Query Parameters for List
```
?status=draft,submitted
?incidentType=behavioral,medical
?severity=serious,critical
?dateFrom=2025-01-01
?dateTo=2025-12-31
?youthId=123
?search=keyword
?page=1
?pageSize=20
```

## Usage Guide

### Creating an Incident Report

1. **Navigate to Incidents**
   - Click "Incidents" in the main navigation
   - Click "New Incident Report"

2. **Basic Information**
   - Enter date, time, and location
   - Select incident type and severity
   - Enter youth information
   - Click "Save Draft" or "Next"

3. **Details**
   - Provide summary (10-200 characters)
   - Write detailed description (minimum 50 characters)
   - Document antecedents, behavior, and consequences
   - Add witnesses if applicable

4. **Actions Taken**
   - Document all immediate actions
   - Indicate if medical attention was required
   - Record parent/guardian notifications
   - Note authority notifications if applicable
   - Specify follow-up requirements

5. **Attachments**
   - Upload photos, videos, or documents
   - Maximum 10 files, 10MB total
   - Supported formats: JPEG, PNG, GIF, PDF

6. **Signatures**
   - Add staff signature(s)
   - Enter staff name and ID
   - Sign using mouse or touch
   - At least one signature required

7. **Submit**
   - Review all sections
   - Click "Submit Report"
   - Report status changes to "submitted"

### Viewing Incidents

**Staff**: Can view incidents they created or are involved in
**Supervisors/Admins**: Can view all incidents

### Exporting Reports

1. Open an incident report
2. Click "Export PDF"
3. Choose export type:
   - **Full**: Complete report with all information
   - **Anonymized**: PII redacted for external sharing
4. PDF is generated and downloaded

### Searching & Filtering

Use the filter panel to:
- Filter by status, type, severity
- Filter by date range
- Search by keywords
- Filter by youth or staff member

## Security Best Practices

### Encryption Key Management

**Initial Setup**
```bash
# Generate a new master key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Add to .env
ENCRYPTION_MASTER_KEY=<generated-key>
```

**Key Rotation** (See Runbook below)

### Access Control

**Role Permissions**:
- **Staff**: Create/edit own drafts, view own incidents
- **Supervisor**: View/edit all incidents, approve submissions
- **Admin**: Full access including user management and exports

### Data Protection

1. **Never log sensitive data** in application logs
2. **Use HTTPS** in production (enforced)
3. **Validate all inputs** server-side
4. **Sanitize outputs** to prevent XSS
5. **Rate limit** API endpoints
6. **Regular backups** of encrypted data

## Testing

### Run Tests
```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

### Test Data
```bash
# Seed test data
npm run seed:test

# Clear test data
npm run seed:clear
```

## Deployment

### Production Checklist

- [ ] Set strong `JWT_SECRET`
- [ ] Generate new `ENCRYPTION_MASTER_KEY`
- [ ] Configure S3 for file storage
- [ ] Enable HTTPS/SSL
- [ ] Set up MongoDB replica set
- [ ] Configure backup strategy
- [ ] Set up monitoring and alerts
- [ ] Review and test RBAC policies
- [ ] Enable rate limiting
- [ ] Configure CORS properly
- [ ] Set up log aggregation
- [ ] Test disaster recovery

### Environment Variables (Production)
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/heartland
JWT_SECRET=<strong-random-secret>
ENCRYPTION_MASTER_KEY=<base64-key>
STORAGE_TYPE=s3
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
AWS_S3_BUCKET=heartland-prod-incidents
ALLOWED_ORIGINS=https://heartland.example.com
```

### Docker Deployment
```bash
# Build image
docker build -t heartland-incidents .

# Run container
docker run -d \
  --name heartland-incidents \
  -p 3000:3000 \
  --env-file .env.production \
  heartland-incidents
```

## Monitoring

### Key Metrics to Monitor
- API response times
- Error rates
- Failed login attempts
- Incident submission rate
- Storage usage
- Database performance

### Logging
All actions are logged with:
- User ID
- Timestamp
- Action type
- IP address
- Changes made

### Alerts
Set up alerts for:
- Failed authentication attempts (>5 in 5 minutes)
- Server errors (>10 in 1 minute)
- Storage approaching limit (>90%)
- Unusual activity patterns

## Compliance

### HIPAA Considerations
- Encryption at rest and in transit
- Audit logging
- Access controls
- Data retention policies
- Breach notification procedures

### State Regulations
Consult with legal counsel to ensure compliance with:
- State child welfare reporting requirements
- Mandatory reporting timelines
- Record retention requirements
- Privacy laws

## Support

### Common Issues

**Issue**: Autosave not working
**Solution**: Check browser console for errors, ensure stable internet connection

**Issue**: Signature not capturing
**Solution**: Ensure browser supports HTML5 Canvas, try different browser

**Issue**: File upload fails
**Solution**: Check file size (<5MB per file, <10MB total), verify file type

**Issue**: Cannot view incident
**Solution**: Verify user has appropriate role and permissions

### Getting Help
- Check documentation: `/docs`
- View API docs: `/api/docs`
- Contact system administrator
- Submit issue on GitHub

## Roadmap

### Planned Features
- [ ] Mobile app for incident reporting
- [ ] Offline mode with sync
- [ ] Advanced analytics dashboard
- [ ] Automated report generation
- [ ] Integration with case management systems
- [ ] Multi-language support
- [ ] Voice-to-text for descriptions
- [ ] Photo annotation tools
- [ ] Incident trends analysis
- [ ] Customizable report templates

## License

Proprietary - Heartland Boys Home
All rights reserved.

## Credits

Developed for Heartland Boys Home
Version 1.0.0
Last Updated: January 2025