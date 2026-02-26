import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, limit, collectionGroup, orderBy } from 'firebase/firestore';

const defaultFirebaseConfig = {
  apiKey: 'AIzaSyAsLC5kOkGO7YcwxmAFxG91sFGckCYSxaE',
  authDomain: 'heartland-boys-home-data.firebaseapp.com',
  projectId: 'heartland-boys-home-data',
  storageBucket: 'heartland-boys-home-data.firebasestorage.app',
  messagingSenderId: '30882060333',
  appId: '1:30882060333:web:aa84a93fd3257b689d80a4',
  measurementId: 'G-ZMQXFX80T0',
};

const app = initializeApp(defaultFirebaseConfig);
const db = getFirestore(app);

async function check() {
  try {
    console.log('Fetching youth...');
    const youthSnap = await getDocs(query(collection(db, 'youth'), orderBy('createdAt', 'desc')));
    console.log('Youth count:', youthSnap.size);

    console.log('Fetching behavior_points...');
    const bpSnap = await getDocs(query(collectionGroup(db, 'behavior_points'), limit(500)));
    console.log('BP count:', bpSnap.size);

    console.log('Fetching case_notes...');
    const cnSnap = await getDocs(query(collectionGroup(db, 'case_notes')));
    console.log('CN count:', cnSnap.size);

    console.log('Fetching kpi_reports...');
    const kpiSnap = await getDocs(query(collection(db, 'kpi_reports'), orderBy('generated_at', 'desc')));
    console.log('KPI count:', kpiSnap.size);
  } catch (e) {
    console.error('Error:', e);
  }
  process.exit(0);
}

check().catch(console.error);
