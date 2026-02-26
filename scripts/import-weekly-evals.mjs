#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const REQUIRED_ENV_VARS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

for (const envVar of REQUIRED_ENV_VARS) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    console.error('Set all Firebase environment variables before running this script.');
    process.exit(1);
  }
}

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: node import-weekly-evals.mjs <path-to-excel-or-csv-file>');
  console.error('Please provide the Excel/CSV file path as a command-line argument.');
  process.exit(1);
}

const normalizeName = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

const toStorage = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  const clamped = Math.min(Math.max(num, 0), 4);
  return Math.round(clamped * 10);
};

const isoFromExcelSerial = (serial) => {
  const excelEpoch = new Date(1899, 11, 30);
  const date = new Date(excelEpoch.getTime() + Number(serial) * 86400000);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const normalizeDate = (raw) => {
  if (raw == null || raw === '') return '';

  if (typeof raw === 'number' && raw > 10000 && raw < 100000) {
    return isoFromExcelSerial(raw);
  }

  const str = String(raw).trim();
  if (!str) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    const [m, d, y] = str.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const numeric = Number(str);
  if (Number.isFinite(numeric) && numeric > 10000 && numeric < 100000) {
    return isoFromExcelSerial(numeric);
  }

  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
  }

  return '';
};

const getMondayISO = (isoDate) => {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const parseRows = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.xlsx' || ext === '.xls') {
    const wb = XLSX.readFile(filePath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  }

  // For CSV files, use XLSX to parse properly (handles quoted fields)
  const text = fs.readFileSync(filePath, 'utf8');
  const wb = XLSX.read(text, { type: 'string' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
};

const main = async () => {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  // Authenticate if credentials are provided
  if (process.env.FIREBASE_AUTH_EMAIL && process.env.FIREBASE_AUTH_PASSWORD) {
    const auth = getAuth(app);
    await signInWithEmailAndPassword(auth, process.env.FIREBASE_AUTH_EMAIL, process.env.FIREBASE_AUTH_PASSWORD);
    console.log('Authenticated successfully.');
  } else {
    console.warn('Warning: No FIREBASE_AUTH_EMAIL/FIREBASE_AUTH_PASSWORD set. Writes may fail if Firestore rules require authentication.');
  }

  const youthSnap = await getDocs(collection(db, 'youth'));
  const youthByName = new Map();
  const ambiguousKeys = new Set();

  youthSnap.forEach((docSnap) => {
    const youth = docSnap.data();
    const first = String(youth.firstName || '').trim();
    const last = String(youth.lastName || '').trim();
    const full = `${first} ${last}`.trim();

    // Always allow full-name inserts (overwrites are acceptable for full names)
    if (full) youthByName.set(normalizeName(full), { id: docSnap.id, first, last });

    // For partial names, track collisions to avoid ambiguous matches
    if (first) {
      const firstKey = normalizeName(first);
      if (ambiguousKeys.has(firstKey)) {
        // Already known ambiguous, skip
      } else if (youthByName.has(firstKey)) {
        // Collision detected: mark as ambiguous and remove
        ambiguousKeys.add(firstKey);
        youthByName.delete(firstKey);
      } else {
        youthByName.set(firstKey, { id: docSnap.id, first, last });
      }
    }

    if (last) {
      const lastKey = normalizeName(last);
      if (ambiguousKeys.has(lastKey)) {
        // Already known ambiguous, skip
      } else if (youthByName.has(lastKey)) {
        // Collision detected: mark as ambiguous and remove
        ambiguousKeys.add(lastKey);
        youthByName.delete(lastKey);
      } else {
        youthByName.set(lastKey, { id: docSnap.id, first, last });
      }
    }
  });

  const rows = parseRows(inputPath);
  if (rows.length < 2) {
    throw new Error('No data rows found in the file.');
  }

  const header = rows[0].map((h) => String(h).toLowerCase().trim());
  const nameIdx = header.findIndex((h) => h.includes('name') || h.includes('youth'));
  const dateIdx = header.findIndex((h) => h.includes('date'));
  const peerIdx = header.findIndex((h) => h.includes('peer'));
  const adultIdx = header.findIndex((h) => h.includes('adult'));
  const investIdx = header.findIndex((h) => h.includes('invest'));
  const authIdx = header.findIndex((h) => h.includes('auth') || h.includes('dealing'));

  if (nameIdx === -1 || dateIdx === -1) {
    throw new Error('Missing required columns: youth name and date.');
  }

  let imported = 0;
  let skipped = 0;
  const skippedRows = [];

  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
    const rawName = cols[nameIdx];
    const rawDate = cols[dateIdx];

    const youth = youthByName.get(normalizeName(rawName));
    if (!youth) {
      skipped++;
      skippedRows.push(`Row ${i + 1}: unmatched youth '${rawName}'`);
      continue;
    }

    const normalizedDate = normalizeDate(rawDate);
    const weekDate = getMondayISO(normalizedDate);
    if (!weekDate) {
      skipped++;
      skippedRows.push(`Row ${i + 1}: invalid date '${rawDate}'`);
      continue;
    }

    const peer = toStorage(cols[peerIdx]);
    const adult = toStorage(cols[adultIdx]);
    const investment = toStorage(cols[investIdx]);
    const authority = toStorage(cols[authIdx]);

    if ([peer, adult, investment, authority].every((v) => v == null)) {
      skipped++;
      skippedRows.push(`Row ${i + 1}: no valid domain scores`);
      continue;
    }

    const compositeId = `${youth.id}_${weekDate}`;
    const ref = doc(db, 'weekly_eval_scores', compositeId);
    const now = new Date().toISOString();
    const existing = await getDoc(ref);
    const createdAt = existing.exists() ? (existing.data()?.created_at || now) : now;

    await setDoc(ref, {
      id: compositeId,
      youth_id: youth.id,
      week_date: weekDate,
      peer,
      adult,
      investment,
      authority,
      source: 'uploaded',
      created_at: createdAt,
      updated_at: now,
    }, { merge: true });

    imported++;
  }

  console.log(`File: ${inputPath}`);
  console.log(`Total rows: ${rows.length - 1}`);
  console.log(`Imported: ${imported}`);
  console.log(`Skipped: ${skipped}`);

  if (skippedRows.length) {
    console.log('\nSkipped details:');
    for (const line of skippedRows.slice(0, 25)) {
      console.log(`- ${line}`);
    }
    if (skippedRows.length > 25) {
      console.log(`- ...and ${skippedRows.length - 25} more`);
    }
  }
};

main().catch((error) => {
  console.error('Import failed:', error.message || error);
  process.exit(1);
});
