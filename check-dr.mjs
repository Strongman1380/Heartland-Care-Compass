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
    const youthSnap = await getDocs(query(collection(db, 'youth'), orderBy('createdAt', 'desc')));
    for (const doc of youthSnap.docs) {
      const youthId = doc.id;
      try {
        const drSnap = await getDocs(query(collection(db, 'youth', youthId, 'daily_ratings'), orderBy('date', 'desc')));
        console.log(`Youth ${youthId} DR count: ${drSnap.size}`);
      } catch (e) {
        console.error(`Error fetching DR for youth ${youthId}:`, e.message);
      }
    }
  } catch (e) {
    console.error('Error:', e);
  }
  process.exit(0);
}

check().catch(console.error);
