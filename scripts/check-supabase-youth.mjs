const SB_URL = 'https://bxloqozxgptrfmjfsjsy.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4bG9xb3p4Z3B0cmZtamZzanN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzE0NTMxMCwiZXhwIjoyMDcyNzIxMzEwfQ.xTFFMz0VUgyGnSAkUoW46x41xLU2mTN8W11ZRb3sAr8';

const missingIds = [
  '15d6e1a2-29d3-4239-80c1-41e774b34b29',
  '275fb4ed-cf29-421b-8383-063f5f5bb6a9',
  'ab1c385b-3e52-4606-b1d7-e10e8bdec655',
];

const resp = await fetch(`${SB_URL}/rest/v1/youth?select=*&limit=50`, {
  headers: {
    'apikey': SB_KEY,
    'Authorization': `Bearer ${SB_KEY}`,
  },
});

const allYouth = await resp.json();
console.log(`Total youth in Supabase: ${allYouth.length}\n`);

for (const y of allYouth) {
  const isMissing = missingIds.includes(y.id);
  console.log(`${isMissing ? '*** MISSING ***' : '   '} ${y.id} -> ${y.firstName} ${y.lastName} (Level ${y.level})`);
}

process.exit(0);
