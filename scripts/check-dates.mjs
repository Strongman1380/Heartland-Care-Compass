import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, limit, collectionGroup } from 'firebase/firestore';

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
  const cnSnap = await getDocs(query(collectionGroup(db, 'case_notes'), limit(5)));
  for (const doc of cnSnap.docs) {
    const data = doc.data();
    console.log(`Case note date: ${data.date}, createdAt: ${data.createdAt}`);
  }
  process.exit(0);
}

check().catch(err => { console.error(err); process.exit(1); });
