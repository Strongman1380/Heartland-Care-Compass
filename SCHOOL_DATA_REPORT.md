# School Data Report
**Generated:** ${new Date().toLocaleString()}

---

## 📊 Database Query Results

### Summary
- **Database Status:** ✅ Connected Successfully
- **Youth in System:** 10 active youth

### Data Status by Table

| Table | Records | Status |
|-------|---------|--------|
| `school_daily_scores` | 0 | ⚠️ Empty |
| `academic_credits` | 0 | ⚠️ Empty |
| `academic_grades` | 0 | ⚠️ Empty |
| `academic_steps_completed` | 0 | ⚠️ Empty |
| `school_incident_reports` | 0 | ⚠️ Empty |

---

## 🔍 Key Findings

### 1. **No School Data in Database**
All school-related tables are currently empty. This means:
- No daily school scores have been entered
- No academic credits have been recorded
- No grades have been logged
- No academic steps have been tracked
- No school incident reports have been filed

### 2. **Youth Records Exist**
The system has **10 youth** registered, which means the application is set up and ready to receive school data.

### 3. **LocalStorage Check Required**
Data may exist in the browser's localStorage cache. To check:
1. Open `check-localstorage-data.html` in your browser
2. Make sure you're using the same browser where you access the application
3. The page will show any cached school scores

---

## 📋 Complete Schema Reference

### School Daily Scores Table
```sql
CREATE TABLE school_daily_scores (
    id UUID PRIMARY KEY,
    youth_id UUID REFERENCES youth(id),
    date DATE NOT NULL,
    weekday INTEGER CHECK (weekday BETWEEN 1 AND 5),
    score INTEGER CHECK (score BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(youth_id, date)
);
```

**Purpose:** Track daily school performance scores (Monday-Friday)
**Score Range:** 0-100 (displayed as 0-4 scale in UI)
**Constraints:** One score per youth per day

---

### Academic Credits Table
```sql
CREATE TABLE academic_credits (
    id UUID PRIMARY KEY,
    student_id UUID REFERENCES youth(id),
    date_earned DATE NOT NULL,
    credit_value DECIMAL(5,2) CHECK (credit_value >= 0),
    subject VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose:** Track academic credits earned by students
**Credit Value:** Decimal value (e.g., 0.25, 0.5, 1.0)

---

### Academic Grades Table
```sql
CREATE TABLE academic_grades (
    id UUID PRIMARY KEY,
    student_id UUID REFERENCES youth(id),
    date_entered DATE NOT NULL,
    grade_value INTEGER CHECK (grade_value BETWEEN 0 AND 100),
    subject VARCHAR(100),
    assignment_name VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose:** Track individual assignment grades
**Grade Range:** 0-100 (percentage)

---

### Academic Steps Completed Table
```sql
CREATE TABLE academic_steps_completed (
    id UUID PRIMARY KEY,
    student_id UUID REFERENCES youth(id),
    date_completed DATE NOT NULL,
    steps_count INTEGER CHECK (steps_count >= 0),
    subject VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose:** Track completion of academic steps/milestones
**Steps Count:** Integer value representing number of steps completed

---

### School Incident Reports Table
```sql
CREATE TABLE school_incident_reports (
    id UUID PRIMARY KEY,
    incident_id VARCHAR(50) UNIQUE NOT NULL, -- Format: HHH-YYYY-####
    date_time TIMESTAMPTZ NOT NULL,
    reported_by JSONB NOT NULL,
    location VARCHAR(255) NOT NULL,
    incident_type VARCHAR(50) CHECK (incident_type IN (
        'Aggression', 'Disruption', 'Property Damage', 
        'Verbal Altercation', 'Physical Altercation',
        'Refusal to Follow Directions', 'Inappropriate Language',
        'Tardy/Absence', 'Academic Dishonesty', 'Other'
    )),
    severity VARCHAR(20) CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
    involved_residents JSONB DEFAULT '[]',
    witnesses JSONB DEFAULT '[]',
    summary TEXT NOT NULL,
    timeline JSONB DEFAULT '[]',
    actions_taken TEXT NOT NULL,
    medical_needed BOOLEAN DEFAULT FALSE,
    medical_details TEXT,
    attachments JSONB DEFAULT '[]',
    staff_signatures JSONB DEFAULT '[]',
    follow_up JSONB,
    confidential_notes TEXT,
    deleted_at TIMESTAMPTZ,
    deleted_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose:** Comprehensive incident reporting for school-related events
**Incident ID Format:** HHH-YYYY-#### (e.g., HHH-2025-0001)

---

## 🎯 Rating Scale (UI Display)

The School Scores page uses a **0-4 rating scale** for daily scores:

| Score | Label | Color |
|-------|-------|-------|
| 3.5 - 4.0 | Exceeding Expectations | 🟢 Green |
| 3.0 - 3.4 | Meeting Expectations | 🔵 Blue |
| 2.0 - 2.9 | Needs Improvement | 🟡 Yellow |
| 0.0 - 1.9 | Unsatisfactory | 🔴 Red |

**Note:** Scores are stored as 0-100 in the database but displayed as 0-4 in the UI.

---

## 💾 Data Storage Architecture

### Hybrid Storage System
The application uses a dual-storage approach:

1. **Primary Storage: Supabase Database**
   - Source of truth for all data
   - Persistent across devices
   - Supports multi-user access

2. **Local Cache: Browser localStorage**
   - Key: `heartland_school_scores`
   - Fast read access
   - Offline capability
   - Syncs with database

### Sync Strategy
- **Writes:** Optimistic updates to both localStorage and Supabase
- **Reads:** Prefer localStorage for speed
- **Background Sync:** Every 10 seconds (with cooldown)
- **Conflict Resolution:** Remote (Supabase) data is source of truth

---

## 🛠️ How to Add Data

### Option 1: Via Application UI
1. Navigate to `/school` in the application
2. Click on "School Scores" tab
3. Enter scores for each youth (0-4 scale)
4. Data auto-saves after 200ms

### Option 2: Via Database Import
Use the provided sample data generator (see next section)

### Option 3: Via API
```javascript
import { schoolScoresService } from '@/integrations/supabase/schoolScoresService'

await schoolScoresService.upsert(
  'youth-id-uuid',
  '2025-01-20', // ISO date
  1, // weekday (1=Mon, 5=Fri)
  85 // score (0-100)
)
```

---

## 📝 Sample Data Generator

Would you like me to create sample data for testing? I can generate:
- ✅ Daily school scores for the past 30 days
- ✅ Academic credits and grades
- ✅ Sample incident reports
- ✅ Realistic score distributions and trends

---

## 🔗 Related Files

### Application Files
- `/src/pages/SchoolScores.tsx` - Main school scores UI
- `/src/pages/SchoolLayout.tsx` - School section layout
- `/src/utils/schoolScores.ts` - Data management utilities
- `/src/integrations/supabase/schoolScoresService.ts` - Database service

### Database Files
- `/migrations/003_school_tables.sql` - School tables schema
- `/migrations/004_app_data.sql` - Additional data tables
- `/COMPLETE_DATABASE_SCHEMA.sql` - Full database schema

### Utility Files
- `/check-school-data.js` - Database data checker (Node.js)
- `/check-localstorage-data.html` - LocalStorage data checker (Browser)

---

## 📊 Database Views

### v_recent_school_scores
Shows recent school scores with youth names:
```sql
SELECT * FROM v_recent_school_scores LIMIT 10;
```

### v_youth_academic_summary
Comprehensive academic summary per youth:
```sql
SELECT * FROM v_youth_academic_summary;
```

---

## ⚡ Quick Actions

### Check Database Data
```bash
node check-school-data.js
```

### Check LocalStorage Data
Open `check-localstorage-data.html` in your browser

### Generate Sample Data
```bash
node generate-sample-school-data.js
```
*(File needs to be created - let me know if you want this)*

---

## 🎓 Next Steps

1. **Check LocalStorage:** Open `check-localstorage-data.html` to see if data exists locally
2. **Generate Sample Data:** Create test data to populate the system
3. **Start Entering Data:** Use the School Scores page to begin tracking
4. **Review Reports:** Check the KPI Dashboard for analytics once data is entered

---

## 📞 Support

If you need help with:
- Creating sample data
- Importing existing data
- Understanding the schema
- Troubleshooting data issues

Just let me know! 🚀