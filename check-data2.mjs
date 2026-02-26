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
  const youthSnap = await getDocs(collection(db, 'youth'));
  console.log(`Found ${youthSnap.size} youth`);
  
  let totalBp = 0;
  let totalCn = 0;
  let totalDr = 0;
  
  for (const doc of youthSnap.docs) {
    const youthId = doc.id;
    const bpSnap = await getDocs(collection(db, 'youth', youthId, 'behavior_points'));
    totalBp += bpSnap.size;
    
    const cnSnap = await getDocs(collection(db, 'youth', youthId, 'case_notes'));
    totalCn += cnSnap.size;
    
    const drSnap = await getDocs(collection(db, 'youth', youthId, 'daily_ratings'));
    totalDr += drSnap.size;
  }
  
  console.log(`Total behavior_points: ${totalBp}`);
  console.log(`Total case_notes: ${totalCn}`);
  console.log(`Total daily_ratings: ${totalDr}`);
  
  process.exit(0);
}

check().catch(console.error);
