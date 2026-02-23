# Heartland Care Compass - Troubleshooting Guide

## Overview of Enhancements

This guide documents the comprehensive enhancements made to ensure point totals calculate correctly throughout the application and that the AI functionality works properly for generating reports.

## Point Calculation System

### 1. Point Calculation Utilities (`src/utils/pointCalculations.ts`)

**New Functions:**
- `calculateTotalPoints(youthId)` - Calculates total points from all behavior point entries
- `calculatePointsForPeriod(youthId, startDate, endDate)` - Points for specific time period
- `calculateAverageDailyPoints(youthId)` - Average daily points
- `calculatePointsNeededForNextLevel(youth)` - Points needed for level advancement
- `calculateWeeklyAverages(youthId, weeks)` - Weekly point statistics
- `getPointStatistics(youthId, days)` - Comprehensive point analytics including trends

### 2. Point Synchronization Service (`src/utils/pointSyncService.ts`)

**Features:**
- Automatic point synchronization every 5 minutes
- Manual sync capabilities for immediate updates
- Point validation and discrepancy detection
- Singleton service pattern for consistent state management

**Key Methods:**
- `syncAllYouthPoints()` - Sync all youth point totals
- `syncYouthPoints(youthId)` - Sync specific youth
- `validatePointTotals()` - Check for discrepancies
- `fixAllDiscrepancies()` - Repair point inconsistencies

### 3. Integration Points

**App.tsx:**
- Initializes point sync service on application startup
- Automatic background synchronization

**BehaviorCard.tsx:**
- Uses point sync service after adding new behavior points
- Fallback to manual calculation if sync fails

## AI Functionality Enhancements

### 1. Enhanced AI Client (`src/lib/aiClient.ts`)

**Mock AI System:**
- Comprehensive mock AI responses when API is unavailable
- Context-aware narrative generation based on report type
- Uses actual youth data for realistic mock responses

**Report Types Supported:**
- Court Reports
- DPN (Weekly/Bi-Weekly/Monthly)
- Progress Reports
- Comprehensive Reports

**Additional Functions:**
- `generateBehavioralInsights(behaviorData, youth)` - Behavioral analysis
- `generateTreatmentRecommendations(youth, progressData)` - Treatment suggestions

### 2. Enhanced Report Service (`src/utils/report-service.ts`)

**Improvements:**
- Integrates point calculation utilities
- Enhanced court report format with comprehensive statistics
- Better data aggregation and analysis
- Fallback to mock data when real data is missing

## Mock Data Enhancements

### 1. Comprehensive Mock Data (`src/utils/mockData.ts`)

**Enhanced Features:**
- 30 days of behavior points per youth (vs. previous 7 days)
- Realistic point patterns based on youth level and progress
- Weekend variations in behavior points
- 15-20 progress notes per youth with diverse categories
- Comprehensive daily ratings with realistic patterns

**Mock Data Categories:**
- Behavioral notes with conflict resolution scenarios
- Academic progress with IEP considerations
- Social interaction observations
- Therapeutic session summaries
- Medical appointment records
- Family contact documentation
- Recreational activity participation

### 2. Realistic Data Patterns

**Behavior Points:**
- Level-based baseline points (Level 3+ = 18 avg, Level 2 = 15 avg, Level 1 = 12 avg)
- Random variations (-3 to +3 points)
- Weekend adjustments for realistic patterns
- Comments on significant days

**Progress Notes:**
- Category-specific templates
- Youth-specific information integration
- Staff rotation simulation
- Varied rating scales (3-5 range)

## Troubleshooting Features

### 1. Point Validation

```javascript
// Check for point discrepancies
import { validatePoints } from '@/utils/pointSyncService';

const discrepancies = await validatePoints();
console.log('Point discrepancies found:', discrepancies);
```

### 2. Manual Point Sync

```javascript
// Force sync all points
import { syncAllPoints } from '@/utils/pointSyncService';

await syncAllPoints();
```

### 3. AI Testing

The AI system automatically falls back to mock responses when the API is unavailable, allowing for:
- Report generation testing without backend
- Content validation and formatting verification
- User interface testing with realistic data

### 4. Data Inspection

**Console Logging:**
- Point sync operations are logged to console
- AI fallback usage is logged
- Mock data generation is logged

**Browser DevTools:**
- Check localStorage for data persistence
- Monitor network requests for API calls
- Inspect point calculation results

## Common Issues and Solutions

### 1. Points Not Syncing

**Symptoms:** Youth point totals don't match behavior point entries

**Solutions:**
1. Check browser console for sync errors
2. Manually trigger sync: `syncAllPoints()`
3. Validate points: `validatePoints()`
4. Clear localStorage and refresh to regenerate mock data

### 2. AI Reports Not Generating

**Symptoms:** Empty or error messages in reports

**Solutions:**
1. Check if mock AI is being used (console warnings)
2. Verify youth data exists in localStorage
3. Check report options are properly configured
4. Ensure behavior points and progress notes exist

### 3. Missing Mock Data

**Symptoms:** Empty youth list or missing behavior data

**Solutions:**
1. Clear localStorage completely
2. Refresh the application
3. Check console for mock data seeding messages
4. Verify `heartland_mock_seeded` flag in localStorage

### 4. Report Generation Errors

**Symptoms:** Reports fail to generate or export

**Solutions:**
1. Check browser console for specific errors
2. Verify youth selection in report interface
3. Ensure date ranges are valid
4. Try different report types to isolate issues

## Development Notes

### 1. Point System Architecture

- Points are stored in behavior point entries
- Youth objects maintain a `pointTotal` field for quick access
- Sync service ensures consistency between calculated and stored totals
- All calculations use the same utility functions for consistency

### 2. AI Integration

- Primary AI service attempts real API calls first
- Automatic fallback to mock AI for development/troubleshooting
- Mock AI uses actual youth data for contextual responses
- Report types determine AI response format and content

### 3. Data Flow

1. User enters behavior points → BehaviorCard
2. Points saved to localStorage → local-storage-utils
3. Point sync triggered → pointSyncService
4. Youth total updated → calculateTotalPoints
5. UI reflects updated totals → reactive updates

### 4. Testing Strategy

- Mock data provides 30 days of comprehensive test data
- Point calculations can be verified against known totals
- AI responses can be tested without backend dependencies
- Report generation works offline for development

## Performance Considerations

### 1. Point Sync Service

- Runs every 5 minutes to avoid excessive calculations
- Skips sync if already in progress
- Batches all youth updates for efficiency

### 2. Mock Data Generation

- Generated once per session and cached
- Realistic patterns without excessive computation
- Balanced data volume for testing without performance impact

### 3. AI Mock Responses

- Template-based generation for speed
- Uses actual youth data for context
- Cached responses could be added for repeated requests

## Future Enhancements

### 1. Point System

- Real-time point sync on data changes
- Point history tracking and analytics
- Level advancement notifications
- Point goal setting and tracking

### 2. AI Integration

- Caching of AI responses
- Multiple AI providers support
- Custom prompt templates
- AI response quality scoring

### 3. Reporting

- Scheduled report generation
- Email delivery of reports
- Custom report templates
- Bulk report generation

This troubleshooting guide should help developers and users understand the enhanced point calculation system and AI functionality, providing clear solutions for common issues and comprehensive documentation of the improvements made.