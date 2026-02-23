/**
 * Migration script: Supabase → Firestore
 * Reads all data from Supabase PostgreSQL and writes to Firebase Firestore.
 *
 * Usage: node scripts/migrate-to-firestore.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// ─── Supabase connection ────────────────────────────────────────────
const SUPABASE_URL = 'https://bxloqozxgptrfmjfsjsy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4bG9xb3p4Z3B0cmZtamZzanN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNDUzMTAsImV4cCI6MjA3MjcyMTMxMH0.wYitLj_Y5ymMpC8gZko1eCnafvEd56guijajhG-BR3Q';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Firebase connection (uses Application Default Credentials or service account) ──
// Initialize with project ID — if running locally, make sure you've run:
//   firebase login
//   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
// OR use: gcloud auth application-default login
initializeApp({ projectId: 'heartland-boys-home-data' });
const db = getFirestore();

// ─── Helper: batch write in chunks of 500 (Firestore limit) ─────────
async function batchWrite(operations) {
  const BATCH_SIZE = 450; // stay under 500 limit
  for (let i = 0; i < operations.length; i += BATCH_SIZE) {
    const chunk = operations.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const op of chunk) {
      batch.set(op.ref, op.data);
    }
    await batch.commit();
    console.log(`  ✓ Wrote batch ${Math.floor(i / BATCH_SIZE) + 1} (${chunk.length} docs)`);
  }
}

// ─── Fetch all rows from a Supabase table ────────────────────────────
async function fetchAll(table, orderBy = null) {
  let query = supabase.from(table).select('*');
  if (orderBy) query = query.order(orderBy, { ascending: false });

  const { data, error } = await query;
  if (error) {
    console.error(`  ✗ Error fetching ${table}:`, error.message);
    return [];
  }
  return data || [];
}

// ─── 1. Migrate Youth profiles ───────────────────────────────────────
async function migrateYouth() {
  console.log('\n📋 Migrating youth profiles...');
  const youths = await fetchAll('youth', 'createdAt');
  console.log(`  Found ${youths.length} youth records`);

  const ops = youths.map((y) => ({
    ref: db.collection('youth').doc(y.id),
    data: y,
  }));

  await batchWrite(ops);
  console.log(`  ✅ Youth profiles migrated: ${youths.length}`);
  return youths;
}

// ─── 2. Migrate behavior_points (subcollection) ─────────────────────
async function migrateBehaviorPoints() {
  console.log('\n📊 Migrating behavior points...');
  const rows = await fetchAll('behavior_points', 'date');
  console.log(`  Found ${rows.length} behavior point records`);

  const ops = rows.map((row) => {
    const compositeId = `${row.youth_id}_${row.date}`;
    return {
      ref: db.collection('youth').doc(row.youth_id).collection('behavior_points').doc(compositeId),
      data: { ...row, id: compositeId },
    };
  });

  await batchWrite(ops);
  console.log(`  ✅ Behavior points migrated: ${rows.length}`);
}

// ─── 3. Migrate case_notes (subcollection) ───────────────────────────
async function migrateCaseNotes() {
  console.log('\n📝 Migrating case notes...');
  const rows = await fetchAll('case_notes', 'date');
  console.log(`  Found ${rows.length} case note records`);

  const ops = rows.map((row) => ({
    ref: db.collection('youth').doc(row.youth_id).collection('case_notes').doc(row.id),
    data: row,
  }));

  await batchWrite(ops);
  console.log(`  ✅ Case notes migrated: ${rows.length}`);
}

// ─── 4. Migrate daily_ratings (subcollection) ────────────────────────
async function migrateDailyRatings() {
  console.log('\n⭐ Migrating daily ratings...');
  const rows = await fetchAll('daily_ratings', 'date');
  console.log(`  Found ${rows.length} daily rating records`);

  const ops = rows.map((row) => ({
    ref: db.collection('youth').doc(row.youth_id).collection('daily_ratings').doc(row.id),
    data: row,
  }));

  await batchWrite(ops);
  console.log(`  ✅ Daily ratings migrated: ${rows.length}`);
}

// ─── 5. Migrate progress_notes (subcollection) ──────────────────────
async function migrateProgressNotes() {
  console.log('\n📒 Migrating progress notes...');
  const rows = await fetchAll('progress_notes', 'date');
  console.log(`  Found ${rows.length} progress note records`);

  const ops = rows.map((row) => ({
    ref: db.collection('youth').doc(row.youth_id).collection('progress_notes').doc(row.id),
    data: row,
  }));

  await batchWrite(ops);
  console.log(`  ✅ Progress notes migrated: ${rows.length}`);
}

// ─── 6. Migrate court_reports (subcollection) ────────────────────────
async function migrateCourtReports() {
  console.log('\n⚖️  Migrating court reports...');
  const rows = await fetchAll('court_reports', 'report_date');
  console.log(`  Found ${rows.length} court report records`);

  const ops = rows.map((row) => ({
    ref: db.collection('youth').doc(row.youth_id).collection('court_reports').doc(row.id),
    data: row,
  }));

  await batchWrite(ops);
  console.log(`  ✅ Court reports migrated: ${rows.length}`);
}

// ─── 7. Migrate report_drafts (top-level, keyed by composite) ───────
async function migrateReportDrafts() {
  console.log('\n📄 Migrating report drafts...');
  const rows = await fetchAll('report_drafts', 'updated_at');
  console.log(`  Found ${rows.length} report draft records`);

  const ops = rows.map((row) => ({
    ref: db.collection('report_drafts').doc(row.id),
    data: {
      id: row.id,
      youth_id: row.youth_id,
      draft_type: row.report_type,
      author_id: row.author_user_id,
      data: row.data,
      updated_at: row.updated_at,
    },
  }));

  await batchWrite(ops);
  console.log(`  ✅ Report drafts migrated: ${rows.length}`);
}

// ─── 8. Migrate school_daily_scores (top-level) ─────────────────────
async function migrateSchoolScores() {
  console.log('\n🏫 Migrating school daily scores...');
  const rows = await fetchAll('school_daily_scores', 'date');
  console.log(`  Found ${rows.length} school score records`);

  const ops = rows.map((row) => {
    const compositeId = `${row.youth_id}_${row.date}_${row.weekday}`;
    return {
      ref: db.collection('school_daily_scores').doc(compositeId),
      data: { ...row, id: compositeId },
    };
  });

  await batchWrite(ops);
  console.log(`  ✅ School scores migrated: ${rows.length}`);
}

// ─── 9. Migrate school_incidents (top-level) ─────────────────────────
async function migrateSchoolIncidents() {
  console.log('\n🚨 Migrating school incidents...');

  // Try school_incidents first (newer table name), fall back to school_incident_reports
  let rows = await fetchAll('school_incidents', 'date_time');
  if (rows.length === 0) {
    rows = await fetchAll('school_incident_reports', 'date_time');
  }
  console.log(`  Found ${rows.length} school incident records`);

  const ops = rows.map((row) => {
    const docId = row.incident_id || row.id;
    return {
      ref: db.collection('school_incidents').doc(docId),
      data: { ...row, incident_id: docId },
    };
  });

  await batchWrite(ops);
  console.log(`  ✅ School incidents migrated: ${rows.length}`);
}

// ─── 10. Migrate school_incident_involved (top-level) ────────────────
async function migrateSchoolIncidentInvolved() {
  console.log('\n👥 Migrating school incident involved...');
  const rows = await fetchAll('school_incident_involved');
  console.log(`  Found ${rows.length} involved records`);

  const ops = rows.map((row) => ({
    ref: db.collection('school_incident_involved').doc(row.id),
    data: row,
  }));

  await batchWrite(ops);
  console.log(`  ✅ Involved records migrated: ${rows.length}`);
}

// ─── 11. Migrate academic_credits (top-level) ────────────────────────
async function migrateAcademicCredits() {
  console.log('\n🎓 Migrating academic credits...');
  const rows = await fetchAll('academic_credits', 'date_earned');
  console.log(`  Found ${rows.length} credit records`);

  const ops = rows.map((row) => ({
    ref: db.collection('academic_credits').doc(row.id),
    data: row,
  }));

  await batchWrite(ops);
  console.log(`  ✅ Academic credits migrated: ${rows.length}`);
}

// ─── 12. Migrate academic_grades (top-level) ─────────────────────────
async function migrateAcademicGrades() {
  console.log('\n📐 Migrating academic grades...');
  const rows = await fetchAll('academic_grades', 'date_entered');
  console.log(`  Found ${rows.length} grade records`);

  const ops = rows.map((row) => ({
    ref: db.collection('academic_grades').doc(row.id),
    data: row,
  }));

  await batchWrite(ops);
  console.log(`  ✅ Academic grades migrated: ${rows.length}`);
}

// ─── 13. Migrate academic_steps_completed (top-level) ────────────────
async function migrateAcademicSteps() {
  console.log('\n📈 Migrating academic steps completed...');
  const rows = await fetchAll('academic_steps_completed', 'date_completed');
  console.log(`  Found ${rows.length} step records`);

  const ops = rows.map((row) => ({
    ref: db.collection('academic_steps_completed').doc(row.id),
    data: row,
  }));

  await batchWrite(ops);
  console.log(`  ✅ Academic steps migrated: ${rows.length}`);
}

// ─── 14. Migrate alerts (top-level) ──────────────────────────────────
async function migrateAlerts() {
  console.log('\n🔔 Migrating alerts...');
  const rows = await fetchAll('alerts', 'created_at');
  console.log(`  Found ${rows.length} alert records`);

  const ops = rows.map((row) => ({
    ref: db.collection('alerts').doc(row.id),
    data: row,
  }));

  await batchWrite(ops);
  console.log(`  ✅ Alerts migrated: ${rows.length}`);
}

// ─── 15. Migrate notes (top-level) ──────────────────────────────────
async function migrateNotes() {
  console.log('\n📓 Migrating notes...');
  const rows = await fetchAll('notes', 'created_at');
  console.log(`  Found ${rows.length} note records`);

  const ops = rows.map((row) => ({
    ref: db.collection('notes').doc(row.id),
    data: row,
  }));

  await batchWrite(ops);
  console.log(`  ✅ Notes migrated: ${rows.length}`);
}

// ─── Run the full migration ─────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Supabase → Firestore Data Migration');
  console.log('  Project: heartland-boys-home-data');
  console.log('═══════════════════════════════════════════════════════');

  const start = Date.now();
  const results = {};

  try {
    // Core youth data (must go first — subcollections depend on parent docs)
    await migrateYouth();

    // Youth subcollections
    await migrateBehaviorPoints();
    await migrateCaseNotes();
    await migrateDailyRatings();
    await migrateProgressNotes();
    await migrateCourtReports();
    await migrateReportDrafts();

    // Top-level collections
    await migrateSchoolScores();
    await migrateSchoolIncidents();
    await migrateSchoolIncidentInvolved();
    await migrateAcademicCredits();
    await migrateAcademicGrades();
    await migrateAcademicSteps();
    await migrateAlerts();
    await migrateNotes();

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log('\n═══════════════════════════════════════════════════════');
    console.log(`  ✅ Migration complete in ${elapsed}s`);
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
