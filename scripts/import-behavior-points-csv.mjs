/**
 * Import behavior point history from a CSV into Firestore.
 *
 * Usage:
 *   node scripts/import-behavior-points-csv.mjs "Heartland_Boys_Home_Points_Updated.csv"
 *   node scripts/import-behavior-points-csv.mjs "Heartland_Boys_Home_Points_Updated.csv" --apply
 *
 * Default mode is dry-run. Pass --apply to write data.
 */

import fs from 'fs';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  query,
  orderBy,
  setDoc,
  writeBatch,
} from 'firebase/firestore';

const csvPath = process.argv[2];
const shouldApply = process.argv.includes('--apply');

if (!csvPath) {
  console.error('Usage: node scripts/import-behavior-points-csv.mjs <path-to-csv> [--apply]');
  process.exit(1);
}

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

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }
    current += ch;
  }

  values.push(current);
  return values;
}

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function parseNumericString(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  return null;
}

function extractTotalPoints(rawValue, pointsValue) {
  const pointsNumeric = parseNumericString(pointsValue);
  if (pointsNumeric !== null && pointsNumeric > 0) return pointsNumeric;

  return null;
}

function buildComments(rawValue, notesValue) {
  const raw = String(rawValue || '').trim();
  const notes = String(notesValue || '').trim();
  const parts = [];

  if (raw && parseNumericString(raw) === null) {
    parts.push(raw);
  }
  if (notes) {
    parts.push(notes);
  }

  if (parts.length === 0) return null;
  const unique = [...new Set(parts)];
  return unique.join(' | ');
}

async function loadYouthMap() {
  const snapshot = await getDocs(query(collection(db, 'youth'), orderBy('createdAt', 'desc')));
  const map = new Map();

  for (const docSnap of snapshot.docs) {
    const youth = docSnap.data();
    const fullName = `${youth.firstName || ''} ${youth.lastName || ''}`.trim();
    if (!fullName) continue;
    map.set(normalizeName(fullName), {
      id: docSnap.id,
      fullName,
      status: youth.status || 'active',
    });
  }

  return map;
}

function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

async function main() {
  const fileText = fs.readFileSync(csvPath, 'utf8');
  const lines = fileText.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) {
    throw new Error('CSV file has no data rows.');
  }

  const header = parseCsvLine(lines[0]).map((value) => value.trim());
  const expected = ['Resident', 'Date', 'Raw_Value', 'Points', 'Notes', 'Month', 'Year'];
  const headerMatches = expected.every((name, index) => header[index] === name);
  if (!headerMatches) {
    throw new Error(`Unexpected CSV header: ${header.join(', ')}`);
  }

  const youthMap = await loadYouthMap();
  const rows = [];
  const missingResidents = new Map();
  let numericRows = 0;
  let nullPointRows = 0;
  let mixedRows = 0;

  for (const line of lines.slice(1)) {
    const [resident, date, rawValue, pointsValue, notesValue] = parseCsvLine(line);
    const normalizedResident = normalizeName(resident);
    const youth = youthMap.get(normalizedResident);

    if (!youth) {
      missingResidents.set(resident, (missingResidents.get(resident) || 0) + 1);
      continue;
    }

    const totalPoints = extractTotalPoints(rawValue, pointsValue);
    const rawNumeric = parseNumericString(rawValue);
    const pointsNumeric = parseNumericString(pointsValue);
    if (pointsNumeric !== null && pointsNumeric > 0) {
      numericRows += 1;
    } else if (totalPoints !== null) {
      mixedRows += 1;
    } else {
      nullPointRows += 1;
    }

    const comments = buildComments(rawValue, notesValue);
    const id = `${youth.id}_${date}`;
    rows.push({
      ref: doc(db, 'youth', youth.id, 'behavior_points', id),
      data: {
        id,
        youth_id: youth.id,
        date,
        morningPoints: null,
        afternoonPoints: null,
        eveningPoints: null,
        totalPoints,
        comments,
        createdAt: new Date().toISOString(),
      },
      resident,
      youthId: youth.id,
      totalPoints,
    });
  }

  console.log(`Project: ${firebaseConfig.projectId}`);
  console.log(`Mode: ${shouldApply ? 'apply' : 'dry-run'}`);
  console.log(`CSV rows: ${lines.length - 1}`);
  console.log(`Matched rows: ${rows.length}`);
  console.log(`Unmatched rows: ${[...missingResidents.values()].reduce((a, b) => a + b, 0)}`);
  console.log(`Rows with direct numeric totals: ${numericRows}`);
  console.log(`Rows with extracted mixed totals: ${mixedRows}`);
  console.log(`Rows with status-only/null totals: ${nullPointRows}`);

  if (missingResidents.size > 0) {
    console.log('Unmatched residents:');
    for (const [name, count] of missingResidents.entries()) {
      console.log(`- ${name}: ${count}`);
    }
  }

  console.log('Sample mapped rows:');
  for (const sample of rows.slice(0, 8)) {
    console.log(`- ${sample.resident} -> ${sample.youthId} on ${sample.data.date}: total=${sample.totalPoints ?? 'null'} comments=${sample.data.comments ?? 'none'}`);
  }

  if (!shouldApply) {
    console.log('Dry-run complete. Re-run with --apply to write records.');
    return;
  }

  const groups = chunk(rows, 400);
  let written = 0;
  for (const group of groups) {
    const batch = writeBatch(db);
    for (const row of group) {
      batch.set(row.ref, row.data, { merge: true });
    }
    await batch.commit();
    written += group.length;
    console.log(`Committed ${written}/${rows.length}`);
  }

  console.log(`Import complete. Upserted ${rows.length} behavior point records.`);
}

main().catch((error) => {
  console.error('Import failed:', error);
  process.exit(1);
});
