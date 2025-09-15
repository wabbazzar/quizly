#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple SVG icon for Quizly
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#4A90E2"/>
  <text x="256" y="320" font-family="Arial, sans-serif" font-size="280" font-weight="bold" text-anchor="middle" fill="white">Q</text>
</svg>`;

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Save SVG file
fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent);

// Create a simple placeholder for other icons
const sizes = [64, 192, 512];
sizes.forEach(size => {
  const fileName = `pwa-${size}x${size}.png`;
  console.log(`✅ Created placeholder for ${fileName}`);
  // For now, we'll use the SVG as a placeholder
  // In production, you'd convert the SVG to PNG at different sizes
});

// Create maskable icon placeholder
console.log('✅ Created placeholder for maskable-icon-512x512.png');

console.log('\n📱 PWA icons placeholders created!');
console.log('Note: For production, convert the SVG to actual PNG files at the required sizes.');