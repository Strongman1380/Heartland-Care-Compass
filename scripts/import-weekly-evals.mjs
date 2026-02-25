#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';

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

const inputPath = process.argv[2] || 'Files/Ryan Cruise Weekly Eval. Scores-combined-compressed copy (1) (1).xlsx';

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

  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.trim().split(/\r?\n/);
  return lines.map(line => line.split(','));
};

const main = async () => {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const youthSnap = await getDocs(collection(db, 'youth'));
  const youthByName = new Map();

  youthSnap.forEach((docSnap) => {
    const youth = docSnap.data();
    const first = String(youth.firstName || '').trim();
    const last = String(youth.lastName || '').trim();
    const full = `${first} ${last}`.trim();

    if (full) youthByName.set(normalizeName(full), { id: docSnap.id, first, last });
    if (first) youthByName.set(normalizeName(first), { id: docSnap.id, first, last });
    if (last) youthByName.set(normalizeName(last), { id: docSnap.id, first, last });
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
      peer: peer ?? 0,
      adult: adult ?? 0,
      investment: investment ?? 0,
      authority: authority ?? 0,
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
