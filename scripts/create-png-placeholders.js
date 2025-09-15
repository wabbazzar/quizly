#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a simple 1x1 transparent PNG as placeholder
const createPNG = () => {
  // Minimal PNG header for a 1x1 transparent image
  const png = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
    0x00, 0x00, 0x00, 0x0d, // IHDR chunk size
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x01, // width: 1
    0x00, 0x00, 0x00, 0x01, // height: 1
    0x08, 0x06, // bit depth: 8, color type: 6 (RGBA)
    0x00, 0x00, 0x00, // compression, filter, interlace
    0x1f, 0x15, 0xc4, 0x89, // IHDR CRC
    0x00, 0x00, 0x00, 0x0a, // IDAT chunk size
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x78, 0x9c, 0x62, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // compressed data
    0xe5, 0x27, 0xde, 0xfc, // IDAT CRC
    0x00, 0x00, 0x00, 0x00, // IEND chunk size
    0x49, 0x45, 0x4e, 0x44, // IEND
    0xae, 0x42, 0x60, 0x82  // IEND CRC
  ]);
  return png;
};

const publicDir = path.join(__dirname, '..', 'public');

// Create PNG placeholders
const sizes = [
  'pwa-64x64.png',
  'pwa-192x192.png',
  'pwa-512x512.png',
  'maskable-icon-512x512.png'
];

sizes.forEach(fileName => {
  const filePath = path.join(publicDir, fileName);
  fs.writeFileSync(filePath, createPNG());
  console.log(`✅ Created ${fileName}`);
});

console.log('\n📱 PWA PNG placeholders created!');
console.log('Note: Replace these with actual icons for production.');