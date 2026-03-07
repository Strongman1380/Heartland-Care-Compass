/**
 * Fix orphaned notes: move notes from old Supabase UUIDs to the correct Firebase HBH IDs
 * and create the Cristian Llanes youth doc.
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'AIzaSyAsLC5kOkGO7YcwxmAFxG91sFGckCYSxaE',
  authDomain: 'heartland-boys-home-data.firebaseapp.com',
  projectId: 'heartland-boys-home-data',
  storageBucket: 'heartland-boys-home-data.firebasestorage.app',
  messagingSenderId: '30882060333',
  appId: '1:30882060333:web:aa84a93fd3257b689d80a4',
});
const db = getFirestore(app);

// Mapping: old Supabase UUID -> new Firebase HBH ID
const remap = {
  'ab1c385b-3e52-4606-b1d7-e10e8bdec655': 'HBH-2025-002',  // Chance Thaller
  '275fb4ed-cf29-421b-8383-063f5f5bb6a9': 'HBH-2025-004',  // Elijah Christian
};

// Cristian Llanes needs a youth doc created (doesn't exist in Firebase at all)
const cristianId = '15d6e1a2-29d3-4239-80c1-41e774b34b29';

async function moveNotes(oldYouthId, newYouthId) {
  console.log(`\nMoving notes from ${oldYouthId} -> ${newYouthId}`);

  const oldColRef = collection(db, 'youth', oldYouthId, 'case_notes');
  const snapshot = await getDocs(oldColRef);
  console.log(`  Found ${snapshot.size} notes to move`);

  let moved = 0;
  for (const noteDoc of snapshot.docs) {
    const data = noteDoc.data();
    // Update youth_id in the note data
    data.youth_id = newYouthId;

    // Write to new location
    await setDoc(doc(db, 'youth', newYouthId, 'case_notes', noteDoc.id), data);

    // Delete from old location
    await deleteDoc(doc(db, 'youth', oldYouthId, 'case_notes', noteDoc.id));

    moved++;
  }
  console.log(`  Moved ${moved} notes`);
}

async function createCristianDoc() {
  console.log('\nCreating Cristian Llanes youth document...');

  // Fetch full profile from Supabase
  const SB_URL = 'https://bxloqozxgptrfmjfsjsy.supabase.co';
  const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4bG9xb3p4Z3B0cmZtamZzanN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzE0NTMxMCwiZXhwIjoyMDcyNzIxMzEwfQ.xTFFMz0VUgyGnSAkUoW46x41xLU2mTN8W11ZRb3sAr8';

  const resp = await fetch(`${SB_URL}/rest/v1/youth?select=*&id=eq.${cristianId}`, {
    headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` },
  });
  const [cristian] = await resp.json();

  if (!cristian) {
    console.log('  Could not find Cristian in Supabase, creating minimal doc...');
    await setDoc(doc(db, 'youth', cristianId), {
      id: cristianId,
      firstName: 'Cristian',
      lastName: 'Llanes',
      level: 1,
      pointTotal: 0,
      status: 'active',
    });
  } else {
    console.log('  Found Cristian in Supabase, migrating full profile...');
    // Clean up any undefined values (Firestore doesn't accept undefined)
    const cleaned = {};
    for (const [key, value] of Object.entries(cristian)) {
      if (value !== undefined) {
        cleaned[key] = value;
      }
    }
    cleaned.pointTotal = cleaned.pointTotal || 0;
    cleaned.status = cleaned.status || 'active';

    await setDoc(doc(db, 'youth', cristianId), cleaned);
  }
  console.log('  Created youth doc for Cristian Llanes');
}

async function main() {
  // 1. Move Chance Thaller's notes
  await moveNotes('ab1c385b-3e52-4606-b1d7-e10e8bdec655', 'HBH-2025-002');

  // 2. Move Elijah Christian's notes
  await moveNotes('275fb4ed-cf29-421b-8383-063f5f5bb6a9', 'HBH-2025-004');

  // 3. Create Cristian Llanes youth doc
  await createCristianDoc();

  // 4. Verify final state
  console.log('\n=== VERIFICATION ===');
  for (const youthId of ['HBH-2025-002', 'HBH-2025-004', cristianId]) {
    const notesSnap = await getDocs(collection(db, 'youth', youthId, 'case_notes'));
    console.log(`${youthId}: ${notesSnap.size} notes`);
  }

  console.log('\nDone!');
  process.exit(0);
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
