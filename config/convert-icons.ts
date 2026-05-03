import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const sizes = [
  { name: 'logo-16', size: 16 },
  { name: 'logo-32', size: 32 },
  { name: 'logo-48', size: 48 },
  { name: 'logo-128', size: 128 },
];

const iconsDir = resolve('public/icons');
const publicDir = resolve('public');

async function convertSvgToPng() {
  console.log('Converting SVG assets to PNG...');

  // Convert extension icons
  for (const { name, size } of sizes) {
    const svgPath = resolve(`${iconsDir}/${name}.svg`);
    const pngPath = resolve(`${iconsDir}/${size}.png`);

    try {
      const svgBuffer = readFileSync(svgPath);

      await sharp(svgBuffer, { density: 300 })
        .resize(size, size)
        .png()
        .toFile(pngPath);

      console.log(`✓ Created ${pngPath} (${size}x${size})`);
    } catch (error) {
      console.error(`✗ Failed to convert ${name}:`, error.message);
    }
  }

  // Convert hero image
  try {
    const heroSvgPath = resolve(`${publicDir}/hero.svg`);
    const heroPngPath = resolve(`${publicDir}/hero.png`);

    const svgBuffer = readFileSync(heroSvgPath);

    await sharp(svgBuffer, { density: 200 })
      .resize(1200, 400, { fit: 'contain', background: { r: 15, g: 23, b: 42 } })
      .png()
      .toFile(heroPngPath);

    console.log(`✓ Created ${heroPngPath} (1200x400)`);
  } catch (error) {
    console.error(`✗ Failed to convert hero image:`, error.message);
  }

  console.log('✅ Icon conversion complete!');
}

convertSvgToPng();
