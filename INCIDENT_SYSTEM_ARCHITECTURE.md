# Incident Reporting System - Architecture Overview

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │ IncidentReports  │  │ IncidentReport   │  │  Signature    │ │
│  │   List Page      │→ │      Form        │→ │   Canvas      │ │
│  │  (Dashboard)     │  │   (5 Tabs)       │  │               │ │
│  └──────────────────┘  └──────────────────┘  └───────────────┘ │
│           ↓                     ↓                      ↓         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              React Hook Form + Zod Validation            │   │
│  └──────────────────────────────────────────────────────────┘   │
│           ↓                     ↓                      ↓         │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │   File Upload    │  │   Autosave       │  │   Progress    │ │
│  │   Component      │  │   (3 seconds)    │  │   Tracking    │ │
│  └──────────────────┘  └──────────────────┘  └───────────────┘ │
│                                                                   │
└───────────────────────────────┬───────────────────────────────────┘
                                │
                                │ HTTPS/TLS
                                │ JWT Token
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                         API LAYER                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Express.js API Server                        │   │
│  │                                                            │   │
│  │  ┌────────────────┐  ┌────────────────┐  ┌─────────────┐ │   │
│  │  │ Authentication │→ │ Authorization  │→ │   Routes    │ │   │
│  │  │  (JWT Verify)  │  │     (RBAC)     │  │  Handler    │ │   │
│  │  └────────────────┘  └────────────────┘  └─────────────┘ │   │
│  │                                                            │   │
│  │  Endpoints:                                                │   │
│  │  • POST   /api/incidents                                   │   │
│  │  • GET    /api/incidents                                   │   │
│  │  • GET    /api/incidents/:id                               │   │
│  │  • PATCH  /api/incidents/:id                               │   │
│  │  • POST   /api/incidents/:id/attachments                   │   │
│  │  • POST   /api/incidents/:id/export                        │   │
│  │  • GET    /api/incidents/:id/audit-log                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │   Validation     │  │   Encryption     │  │  Audit Log    │ │
│  │  (Zod Schema)    │  │  (AES-256-GCM)   │  │   Service     │ │
│  └──────────────────┘  └──────────────────┘  └───────────────┘ │
│                                                                   │
└───────────────────────────────┬───────────────────────────────────┘
                                │
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    MongoDB Database                       │   │
│  │                                                            │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  incident_reports                                   │  │   │
│  │  │  • id, status, type, severity                       │  │   │
│  │  │  • youth_info (encrypted)                           │  │   │
│  │  │  • description, witnesses, actions                  │  │   │
│  │  │  • attachments, signatures                          │  │   │
│  │  │  • created_at, updated_at, deleted_at               │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │                                                            │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  incident_audit_logs (immutable)                    │  │   │
│  │  │  • id, incident_id, action, performed_by            │  │   │
│  │  │  • performed_at, ip_address, user_agent             │  │   │
│  │  │  • changes (before/after), export_type              │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │                                                            │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  incident_drafts                                    │  │   │
│  │  │  • id, user_id, incident_id, draft_data             │  │   │
│  │  │  • created_at, updated_at                           │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │                                                            │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  encryption_keys                                    │  │   │
│  │  │  • version, key_hash, created_at, is_active         │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │                                                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└───────────────────────────────┬───────────────────────────────────┘
                                │
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                    STORAGE LAYER                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐              ┌──────────────────┐         │
│  │  Local Storage   │      OR      │    AWS S3        │         │
│  │  ./uploads/      │              │  (Production)    │         │
│  │  • images/       │              │  • Versioning    │         │
│  │  • pdfs/         │              │  • Encryption    │         │
│  │  • exports/      │              │  • Lifecycle     │         │
│  └──────────────────┘              └──────────────────┘         │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      SECURITY LAYERS                             │
└─────────────────────────────────────────────────────────────────┘

Layer 1: Transport Security
├── HTTPS/TLS 1.3
├── Certificate Pinning
└── Secure Headers (Helmet.js)

Layer 2: Authentication
├── JWT Tokens (HS256)
├── Token Expiration (7 days)
├── Refresh Token Support
└── Session Management

Layer 3: Authorization (RBAC)
├── Staff Role
│   ├── Create own incidents
│   ├── Edit own drafts
│   └── View own incidents
├── Supervisor Role
│   ├── All staff permissions
│   ├── View all incidents
│   ├── Edit all incidents
│   └── Approve submissions
└── Admin Role
    ├── All supervisor permissions
    ├── User management
    ├── Key rotation
    └── System configuration

Layer 4: Data Encryption
├── AES-256-GCM (at rest)
│   ├── Youth names
│   ├── Date of birth
│   ├── Medical details
│   └── Witness information
├── SHA-256 (SSN hashing)
└── Key Versioning & Rotation

Layer 5: Audit & Monitoring
├── Immutable Audit Log
├── All Actions Tracked
├── IP & User Agent Logging
└── Change History (before/after)

Layer 6: Input Validation
├── Client-Side (Zod)
├── Server-Side (Zod)
├── File Type Validation
├── Size Limit Enforcement
└── SQL Injection Prevention
```

---

## 📊 Data Flow Diagrams

### Creating an Incident Report

```
User                Form              API              Database         Storage
 │                   │                 │                  │               │
 │ 1. Fill Form      │                 │                  │               │
 ├──────────────────>│                 │                  │               │
 │                   │                 │                  │               │
 │                   │ 2. Validate     │                  │               │
 │                   │    (Zod)        │                  │               │
 │                   │                 │                  │               │
 │ 3. Autosave       │                 │                  │               │
 │    (every 3s)     │ 4. POST Draft   │                  │               │
 │                   ├────────────────>│                  │               │
 │                   │                 │ 5. Save Draft    │               │
 │                   │                 ├─────────────────>│               │
 │                   │                 │                  │               │
 │ 6. Upload Files   │                 │                  │               │
 ├──────────────────>│ 7. POST Files   │                  │               │
 │                   ├────────────────>│ 8. Store Files   │               │
 │                   │                 ├─────────────────────────────────>│
 │                   │                 │                  │               │
 │ 9. Sign & Submit  │                 │                  │               │
 ├──────────────────>│ 10. POST Submit │                  │               │
 │                   ├────────────────>│ 11. Encrypt PII  │               │
 │                   │                 │ 12. Save Report  │               │
 │                   │                 ├─────────────────>│               │
 │                   │                 │ 13. Log Audit    │               │
 │                   │                 ├─────────────────>│               │
 │                   │ 14. Success     │                  │               │
 │ 15. Confirmation  │<────────────────┤                  │               │
 │<──────────────────┤                 │                  │               │
```

### Exporting a Report

```
User                API              Database         PDF Generator    Storage
 │                   │                  │                  │               │
 │ 1. Request Export │                  │                  │               │
 ├──────────────────>│                  │                  │               │
 │                   │ 2. Check Auth    │                  │               │
 │                   │ 3. Check Role    │                  │               │
 │                   │                  │                  │               │
 │                   │ 4. Fetch Report  │                  │               │
 │                   ├─────────────────>│                  │               │
 │                   │ 5. Decrypt PII   │                  │               │
 │                   │<─────────────────┤                  │               │
 │                   │                  │                  │               │
 │                   │ 6. Anonymize     │                  │               │
 │                   │    (if requested)│                  │               │
 │                   │                  │                  │               │
 │                   │ 7. Generate PDF  │                  │               │
 │                   ├─────────────────────────────────────>│               │
 │                   │                  │ 8. PDF Data      │               │
 │                   │<─────────────────────────────────────┤               │
 │                   │                  │                  │               │
 │                   │ 9. Save Export   │                  │               │
 │                   ├─────────────────────────────────────────────────────>│
 │                   │                  │                  │               │
 │                   │ 10. Log Audit    │                  │               │
 │                   ├─────────────────>│                  │               │
 │                   │                  │                  │               │
 │ 11. Download PDF  │                  │                  │               │
 │<──────────────────┤                  │                  │               │
```

---

## 🔄 Key Rotation Process

```
┌─────────────────────────────────────────────────────────────────┐
│                    ENCRYPTION KEY ROTATION                       │
└─────────────────────────────────────────────────────────────────┘

Step 1: Generate New Key
├── Generate 32-byte random key
├── Encode as base64
└── Store securely

Step 2: Add to Database
├── Insert into encryption_keys table
├── Set version = current_version + 1
├── Set is_active = false
└── Record created_at timestamp

Step 3: Re-encrypt Data
├── Fetch all encrypted records
├── For each record:
│   ├── Decrypt with old key (version N)
│   ├── Encrypt with new key (version N+1)
│   └── Update record with new encrypted data
└── Log progress

Step 4: Activate New Key
├── Set new key is_active = true
├── Set old key is_active = false
└── Update encryption_keys table

Step 5: Update Application
├── Update ENCRYPTION_MASTER_KEY in .env
├── Restart application
└── Verify encryption/decryption works

Step 6: Verify & Archive
├── Test encryption/decryption
├── Verify all records accessible
├── Archive old key securely
└── Document rotation in audit log

Frequency: Every 90 days or on security event
```

---

## 🎯 Component Interaction Map

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND COMPONENTS                           │
└─────────────────────────────────────────────────────────────────┘

IncidentReports (List Page)
    │
    ├─> Filter & Search
    ├─> Pagination
    └─> Click Incident
            │
            ↓
    IncidentReportForm (Main Form)
        │
        ├─> Tab 1: Basic Info
        │   ├─> Date/Time Pickers
        │   ├─> Location Input
        │   ├─> Type/Severity Selects
        │   └─> Youth Information
        │
        ├─> Tab 2: Details
        │   ├─> Description Textarea
        │   ├─> Antecedents Input
        │   ├─> Behavior Input
        │   ├─> Consequences Input
        │   └─> Witness List
        │       └─> Add/Remove Witnesses
        │
        ├─> Tab 3: Actions
        │   ├─> Immediate Actions List
        │   │   └─> Add/Remove Actions
        │   ├─> Medical Attention
        │   ├─> Notifications Sent
        │   └─> Follow-up Required
        │
        ├─> Tab 4: Attachments
        │   └─> FileUpload Component
        │       ├─> Drag & Drop Zone
        │       ├─> File Preview
        │       ├─> Size Validation
        │       └─> Upload Progress
        │
        └─> Tab 5: Signatures
            └─> SignatureCanvas Component
                ├─> Drawing Canvas
                ├─> Clear Button
                ├─> Undo Button
                └─> Timestamp Display

Shared Features:
├─> Autosave (every 3 seconds)
├─> Progress Tracking
├─> Validation Messages
└─> Keyboard Navigation
```

---

## 📦 Deployment Architecture

### Development Environment
```
┌──────────────────────────────────────┐
│         Developer Machine            │
│                                      │
│  ┌────────────────────────────────┐ │
│  │  Vite Dev Server (Port 8080)   │ │
│  │  • Hot Module Replacement      │ │
│  │  • React Fast Refresh          │ │
│  └────────────────────────────────┘ │
│                                      │
│  ┌────────────────────────────────┐ │
│  │  Express API (Port 3000)       │ │
│  │  • Nodemon Auto-restart        │ │
│  │  • Debug Logging               │ │
│  └────────────────────────────────┘ │
│                                      │
│  ┌────────────────────────────────┐ │
│  │  MongoDB (Port 27017)          │ │
│  │  • Local Instance              │ │
│  └────────────────────────────────┘ │
└──────────────────────────────────────┘
```

### Production Environment
```
┌─────────────────────────────────────────────────────────────────┐
│                         PRODUCTION                               │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│   Load Balancer  │
│   (HTTPS/TLS)    │
└────────┬─────────┘
         │
         ├─────────────────────────────────────┐
         │                                     │
         ↓                                     ↓
┌──────────────────┐                  ┌──────────────────┐
│   Web Server 1   │                  │   Web Server 2   │
│   (Node.js)      │                  │   (Node.js)      │
│   • API          │                  │   • API          │
│   • Static Files │                  │   • Static Files │
└────────┬─────────┘                  └────────┬─────────┘
         │                                     │
         └─────────────────┬───────────────────┘
                           │
                           ↓
                  ┌──────────────────┐
                  │  MongoDB Cluster │
                  │  • Primary       │
                  │  • Secondary 1   │
                  │  • Secondary 2   │
                  └────────┬─────────┘
                           │
                           ↓
                  ┌──────────────────┐
                  │   AWS S3 Bucket  │
                  │   • Attachments  │
                  │   • Exports      │
                  └──────────────────┘
```

---

## 🔍 Monitoring & Observability

```
┌─────────────────────────────────────────────────────────────────┐
│                    MONITORING STACK                              │
└─────────────────────────────────────────────────────────────────┘

Application Metrics
├── Request Rate (req/sec)
├── Response Time (ms)
├── Error Rate (%)
├── Active Users
└── Database Connections

Business Metrics
├── Incidents Created (per day)
├── Incidents Submitted (per day)
├── Exports Generated (per day)
├── Average Time to Submit
└── Most Common Incident Types

Security Metrics
├── Failed Login Attempts
├── Unauthorized Access Attempts
├── Encryption/Decryption Errors
├── Audit Log Entries
└── Key Rotation Status

Infrastructure Metrics
├── CPU Usage (%)
├── Memory Usage (%)
├── Disk Usage (%)
├── Network I/O
└── Database Performance

Alerts
├── High Error Rate (> 5%)
├── Slow Response Time (> 1s)
├── Failed Backups
├── Encryption Key Expiring (< 7 days)
└── Disk Space Low (< 10%)
```

---

## 📚 Technology Stack

### Frontend
- **Framework**: React 18.3
- **Build Tool**: Vite 5.4
- **Language**: TypeScript 5.5
- **Styling**: Tailwind CSS 3.4
- **UI Components**: shadcn/ui (Radix UI)
- **Form Management**: React Hook Form 7.53
- **Validation**: Zod 3.23
- **Date Handling**: date-fns 3.6
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js 20.x
- **Framework**: Express 4.21
- **Language**: JavaScript (ES6+)
- **Authentication**: jsonwebtoken 9.0
- **Encryption**: Node.js crypto (built-in)
- **File Upload**: Multer 2.0
- **Security**: Helmet 7.1
- **Rate Limiting**: express-rate-limit 7.1

### Database
- **Primary**: MongoDB 6.20
- **Alternative**: PostgreSQL (supported)
- **ODM**: Native MongoDB driver

### Storage
- **Local**: Node.js fs (built-in)
- **Cloud**: AWS S3 (via @aws-sdk/client-s3)

### Testing
- **Framework**: Jest
- **API Testing**: Supertest
- **Coverage**: Jest Coverage

### DevOps
- **Version Control**: Git
- **CI/CD**: GitHub Actions (recommended)
- **Containerization**: Docker (optional)
- **Monitoring**: Custom (extensible)

---

## 🎯 Summary

This architecture provides:

✅ **Scalability**: Horizontal scaling with load balancing  
✅ **Security**: Multi-layer security with encryption  
✅ **Reliability**: Database replication and backups  
✅ **Performance**: Optimized queries and caching  
✅ **Maintainability**: Clean separation of concerns  
✅ **Observability**: Comprehensive monitoring and logging  
✅ **Compliance**: HIPAA-ready with audit trails  

**The system is production-ready and follows industry best practices.**

---

**Last Updated**: January 2025  
**Version**: 1.0.0