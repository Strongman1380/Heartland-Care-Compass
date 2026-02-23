import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'AIzaSyAsLC5kOkGO7YcwxmAFxG91sFGckCYSxaE',
  authDomain: 'heartland-boys-home-data.firebaseapp.com',
  projectId: 'heartland-boys-home-data',
  storageBucket: 'heartland-boys-home-data.firebasestorage.app',
  messagingSenderId: '30882060333',
  appId: '1:30882060333:web:aa84a93fd3257b689d80a4',
});
const db = getFirestore(app);

// List all youth docs
const youthSnap = await getDocs(collection(db, 'youth'));
console.log(`Youth in Firebase (${youthSnap.size}):`);
for (const d of youthSnap.docs) {
  const data = d.data();
  console.log(`  ${d.id} -> ${data.firstName || '?'} ${data.lastName || '?'}`);
}

// Supabase youth IDs that had notes
const supabaseYouthIds = [
  '0acdb5e7-5a8a-4d4d-b9e6-107c52f119de',
  '15d6e1a2-29d3-4239-80c1-41e774b34b29',
  '275fb4ed-cf29-421b-8383-063f5f5bb6a9',
  '87af94e8-67f4-46a6-bdc7-a10b3ccb767e',
  'ab1c385b-3e52-4606-b1d7-e10e8bdec655',
  'f415861c-5bc9-453a-a771-57ff115db97f',
];

const firebaseYouthIds = new Set(youthSnap.docs.map(d => d.id));

console.log('\nSupabase youth ID match check:');
for (const sid of supabaseYouthIds) {
  const match = firebaseYouthIds.has(sid) ? 'MATCH' : 'MISSING';
  console.log(`  ${sid} -> ${match}`);
}

// Check notes for ALL youth (including ones that might only exist as subcollection parents)
console.log('\nCase notes counts:');
const allIds = [...new Set([...firebaseYouthIds, ...supabaseYouthIds])];
for (const yid of allIds) {
  try {
    const notesSnap = await getDocs(collection(db, 'youth', yid, 'case_notes'));
    if (notesSnap.size > 0) {
      console.log(`  ${yid}: ${notesSnap.size} notes`);
    }
  } catch (e) {
    console.log(`  ${yid}: ERROR - ${e.message}`);
  }
}

process.exit(0);
