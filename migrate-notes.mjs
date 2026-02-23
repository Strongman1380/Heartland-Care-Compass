/**
 * Migration script: Supabase case_notes → Firebase Firestore
 *
 * Pulls all case notes from Supabase and writes them into Firebase
 * under youth/{youthId}/case_notes/{noteId}
 *
 * Usage: node migrate-notes.mjs
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, getDocs } from 'firebase/firestore';

// === CONFIG ===
const SUPABASE_URL = 'https://bxloqozxgptrfmjfsjsy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4bG9xb3p4Z3B0cmZtamZzanN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzE0NTMxMCwiZXhwIjoyMDcyNzIxMzEwfQ.xTFFMz0VUgyGnSAkUoW46x41xLU2mTN8W11ZRb3sAr8';

// Use the PRODUCTION Firebase project (same as vercel.json and firebase.ts default)
const firebaseConfig = {
  apiKey: 'AIzaSyAsLC5kOkGO7YcwxmAFxG91sFGckCYSxaE',
  authDomain: 'heartland-boys-home-data.firebaseapp.com',
  projectId: 'heartland-boys-home-data',
  storageBucket: 'heartland-boys-home-data.firebasestorage.app',
  messagingSenderId: '30882060333',
  appId: '1:30882060333:web:aa84a93fd3257b689d80a4',
  measurementId: 'G-ZMQXFX80T0',
};

// === INIT ===
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// === FETCH ALL FROM SUPABASE ===
async function fetchAllSupabaseCaseNotes() {
  const allNotes = [];
  let offset = 0;
  const pageSize = 100;

  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/case_notes?select=*&order=date.desc&offset=${offset}&limit=${pageSize}`;
    const resp = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    });

    if (!resp.ok) {
      throw new Error(`Supabase fetch failed: ${resp.status} ${await resp.text()}`);
    }

    const batch = await resp.json();
    if (batch.length === 0) break;

    allNotes.push(...batch);
    offset += pageSize;

    if (batch.length < pageSize) break;
  }

  return allNotes;
}

// === CHECK EXISTING IN FIREBASE ===
async function getExistingNoteIds(youthId) {
  try {
    const colRef = collection(db, 'youth', youthId, 'case_notes');
    const snapshot = await getDocs(colRef);
    return new Set(snapshot.docs.map(d => d.id));
  } catch {
    return new Set();
  }
}

// === MIGRATE ===
async function migrate() {
  console.log('Fetching case notes from Supabase...');
  const notes = await fetchAllSupabaseCaseNotes();
  console.log(`Found ${notes.length} case notes in Supabase across ${new Set(notes.map(n => n.youth_id)).size} youth`);

  // Group by youth_id
  const grouped = {};
  for (const note of notes) {
    if (!grouped[note.youth_id]) grouped[note.youth_id] = [];
    grouped[note.youth_id].push(note);
  }

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const [youthId, youthNotes] of Object.entries(grouped)) {
    console.log(`\nProcessing youth ${youthId} (${youthNotes.length} notes)...`);

    // Check what already exists in Firebase
    const existing = await getExistingNoteIds(youthId);
    console.log(`  Already in Firebase: ${existing.size} notes`);

    for (const note of youthNotes) {
      if (existing.has(note.id)) {
        skipped++;
        continue;
      }

      try {
        const docData = {
          id: note.id,
          youth_id: note.youth_id,
          date: note.date || null,
          summary: note.summary || null,
          note: note.note || null,
          staff: note.staff || null,
          createdAt: note.createdAt || new Date().toISOString(),
        };

        await setDoc(doc(db, 'youth', youthId, 'case_notes', note.id), docData);
        migrated++;

        if (migrated % 10 === 0) {
          console.log(`  Migrated ${migrated} so far...`);
        }
      } catch (err) {
        console.error(`  ERROR migrating note ${note.id}:`, err.message);
        errors++;
      }
    }
  }

  console.log('\n=== MIGRATION COMPLETE ===');
  console.log(`Migrated: ${migrated}`);
  console.log(`Skipped (already existed): ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total in Supabase: ${notes.length}`);
}

migrate().then(() => {
  console.log('\nDone. Exiting...');
  process.exit(0);
}).catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
