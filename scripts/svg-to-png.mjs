import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'fs';

const conversions = [
  { input: 'public/icon-512.svg', output: 'public/icon-512.png', width: 512 },
  { input: 'public/icon-192.svg', output: 'public/icon-192.png', width: 192 },
  { input: 'public/apple-touch-icon.svg', output: 'public/apple-touch-icon.png', width: 180 },
  { input: 'public/favicon-32.svg', output: 'public/favicon-32.png', width: 32 },
  { input: 'public/favicon-16.svg', output: 'public/favicon-16.png', width: 16 },
];

for (const { input, output, width } of conversions) {
  const svg = readFileSync(input, 'utf8');
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: width } });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  writeFileSync(output, pngBuffer);
  console.log(`${output} (${width}x${width}) - ${pngBuffer.length} bytes`);
}
