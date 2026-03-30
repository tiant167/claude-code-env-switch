import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgBuffer = Buffer.from(`
<svg width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
  <rect x="8" y="8" width="28" height="28" rx="6" ry="6" fill="none" stroke="black" stroke-width="3"/>
  <text x="22" y="29" font-family="-apple-system, sans-serif" font-size="18" font-weight="800" fill="black" text-anchor="middle">C</text>
</svg>
`);

const outPath = path.join(process.cwd(), 'public', 'iconTemplate@2x.png');

async function generate() {
  try {
    await sharp(svgBuffer)
      .png()
      .toFile(outPath);
    console.log('Successfully generated custom template icon at', outPath);
  } catch(err) {
    console.error('Failed to generate icon:', err);
  }
}

generate();
