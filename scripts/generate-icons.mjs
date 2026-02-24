/**
 * Generate PWA icons for Heartland Youth Compass
 * Creates SVG-based icons at various sizes and converts to PNG using canvas
 * Run: node scripts/generate-icons.mjs
 */

import { writeFileSync } from 'fs';

function generateSVG(size) {
  const padding = Math.round(size * 0.12);
  const innerSize = size - padding * 2;
  const cx = size / 2;
  const cy = size / 2;
  const r = innerSize / 2;

  // Compass needle points
  const needleWidth = r * 0.12;
  const needleLen = r * 0.65;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#6b1a1a"/>
      <stop offset="50%" stop-color="#823131"/>
      <stop offset="100%" stop-color="#5c1616"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f5c542"/>
      <stop offset="100%" stop-color="#d4a017"/>
    </linearGradient>
    <linearGradient id="compassN" x1="0.5" y1="1" x2="0.5" y2="0">
      <stop offset="0%" stop-color="#f5c542"/>
      <stop offset="100%" stop-color="#ffffff"/>
    </linearGradient>
    <linearGradient id="compassS" x1="0.5" y1="0" x2="0.5" y2="1">
      <stop offset="0%" stop-color="#d4a017"/>
      <stop offset="100%" stop-color="#8b6914"/>
    </linearGradient>
  </defs>
  <!-- Background -->
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="url(#bg)"/>

  <!-- Outer compass ring -->
  <circle cx="${cx}" cy="${cy}" r="${r * 0.82}" fill="none" stroke="url(#gold)" stroke-width="${Math.max(2, size * 0.02)}" opacity="0.6"/>
  <circle cx="${cx}" cy="${cy}" r="${r * 0.72}" fill="none" stroke="url(#gold)" stroke-width="${Math.max(1, size * 0.008)}" opacity="0.3"/>

  <!-- Cardinal direction ticks -->
  ${['N','E','S','W'].map((d, i) => {
    const angle = -90 + i * 90;
    const rad = angle * Math.PI / 180;
    const x1 = cx + Math.cos(rad) * r * 0.72;
    const y1 = cy + Math.sin(rad) * r * 0.72;
    const x2 = cx + Math.cos(rad) * r * 0.82;
    const y2 = cy + Math.sin(rad) * r * 0.82;
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#f5c542" stroke-width="${Math.max(2, size * 0.015)}" stroke-linecap="round" opacity="0.7"/>`;
  }).join('\n  ')}

  <!-- Compass needle - North (white/gold) -->
  <polygon points="${cx},${cy - needleLen} ${cx - needleWidth},${cy} ${cx + needleWidth},${cy}" fill="url(#compassN)" opacity="0.95"/>

  <!-- Compass needle - South (dark gold) -->
  <polygon points="${cx},${cy + needleLen} ${cx - needleWidth},${cy} ${cx + needleWidth},${cy}" fill="url(#compassS)" opacity="0.85"/>

  <!-- Center dot -->
  <circle cx="${cx}" cy="${cy}" r="${Math.max(3, size * 0.035)}" fill="#f5c542"/>
  <circle cx="${cx}" cy="${cy}" r="${Math.max(1.5, size * 0.018)}" fill="#823131"/>

  <!-- HYC text -->
  <text x="${cx}" y="${cy + r * 0.52}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="${Math.round(size * 0.13)}" fill="#f5c542" letter-spacing="${Math.round(size * 0.015)}">HYC</text>
</svg>`;
}

// Generate SVGs and write them
const sizes = [
  { size: 512, file: 'public/icon-512.svg' },
  { size: 192, file: 'public/icon-192.svg' },
  { size: 180, file: 'public/apple-touch-icon.svg' },
  { size: 32, file: 'public/favicon-32.svg' },
  { size: 16, file: 'public/favicon-16.svg' },
];

for (const { size, file } of sizes) {
  const svg = generateSVG(size);
  writeFileSync(file, svg);
  console.log(`Generated ${file} (${size}x${size})`);
}

console.log('\nSVG icons generated. To convert to PNG, use a tool like:');
console.log('  npx sharp-cli --input public/icon-512.svg --output public/icon-512.png');
console.log('\nOr for quick testing, the SVGs can be used directly.');
