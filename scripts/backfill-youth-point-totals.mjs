/**
 * Recalculate each youth profile's pointTotal from Firestore behavior_points.
 *
 * Usage:
 *   node scripts/backfill-youth-point-totals.mjs
 *   node scripts/backfill-youth-point-totals.mjs --apply
 *
 * Default mode is dry-run. Pass --apply to write updates.
 */

import { initializeApp } from 'firebase/app';
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';

const shouldApply = process.argv.includes('--apply');

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || 'AIzaSyAsLC5kOkGO7YcwxmAFxG91sFGckCYSxaE',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'heartland-boys-home-data.firebaseapp.com',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'heartland-boys-home-data',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || 'heartland-boys-home-data.firebasestorage.app',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '30882060333',
  appId: process.env.VITE_FIREBASE_APP_ID || '1:30882060333:web:aa84a93fd3257b689d80a4',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

async function main() {
  const youthSnapshot = await getDocs(query(collection(db, 'youth'), orderBy('createdAt', 'desc')));
  const updates = [];

  for (const youthDoc of youthSnapshot.docs) {
    const youth = youthDoc.data();
    const pointsSnapshot = await getDocs(collection(db, 'youth', youthDoc.id, 'behavior_points'));
    const total = pointsSnapshot.docs.reduce((sum, pointDoc) => {
      const point = pointDoc.data();
      return sum + (typeof point.totalPoints === 'number' ? point.totalPoints : 0);
    }, 0);

    updates.push({
      id: youthDoc.id,
      name: `${youth.firstName || ''} ${youth.lastName || ''}`.trim(),
      previous: typeof youth.pointTotal === 'number' ? youth.pointTotal : 0,
      next: total,
    });
  }

  console.log(`Project: ${firebaseConfig.projectId}`);
  console.log(`Mode: ${shouldApply ? 'apply' : 'dry-run'}`);
  console.log(`Youth records scanned: ${updates.length}`);

  for (const row of updates) {
    console.log(`- ${row.name || row.id}: ${row.previous} -> ${row.next}`);
  }

  if (!shouldApply) {
    console.log('Dry-run complete. Re-run with --apply to write pointTotal updates.');
    return;
  }

  for (const group of chunk(updates, 400)) {
    const batch = writeBatch(db);
    for (const row of group) {
      batch.update(doc(db, 'youth', row.id), {
        pointTotal: row.next,
        updatedAt: new Date().toISOString(),
      });
    }
    await batch.commit();
  }

  console.log(`Backfill complete. Updated ${updates.length} youth profiles.`);
}

main().catch((error) => {
  console.error('Backfill failed:', error);
  process.exit(1);
});
