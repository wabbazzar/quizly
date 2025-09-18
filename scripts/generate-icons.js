import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [
  // Favicon sizes
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 48, name: 'favicon-48x48.png' },

  // PWA icons
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' },

  // Apple touch icons
  { size: 180, name: 'apple-touch-icon.png' },

  // MS Tile
  { size: 144, name: 'mstile-144x144.png' },
];

async function generateIcons() {
  const svgPath = path.join(__dirname, '..', 'quizly_icon.svg');
  const publicPath = path.join(__dirname, '..', 'public');
  const iconsPath = path.join(publicPath, 'icons');

  // Ensure directories exist
  await fs.mkdir(iconsPath, { recursive: true });

  console.log('🎨 Generating icons from SVG...');

  // Read SVG file
  const svgBuffer = await fs.readFile(svgPath);

  // Generate each size
  for (const { size, name } of sizes) {
    const outputPath = path.join(iconsPath, name);

    await sharp(svgBuffer).resize(size, size).png().toFile(outputPath);

    console.log(`✅ Generated ${name} (${size}x${size})`);
  }

  // Copy specific icons to root public for compatibility
  await sharp(svgBuffer).resize(32, 32).png().toFile(path.join(publicPath, 'favicon.ico'));

  console.log('✅ Generated favicon.ico');

  // Generate maskable icon (with padding for PWA)
  await sharp(svgBuffer)
    .resize(512, 512, {
      fit: 'contain',
      background: { r: 74, g: 144, b: 226, alpha: 1 }, // Primary color
    })
    .png()
    .toFile(path.join(iconsPath, 'icon-512x512-maskable.png'));

  console.log('✅ Generated maskable icon');
  console.log('🎉 All icons generated successfully!');
}

generateIcons().catch(console.error);
