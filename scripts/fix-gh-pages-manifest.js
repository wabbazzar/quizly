#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixManifest() {
  const manifestPath = path.join(__dirname, '../dist/manifest.webmanifest');

  try {
    const manifestContent = await fs.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);

    // Fix the URLs for GitHub Pages
    manifest.start_url = '/quizly/';
    manifest.scope = '/quizly/';

    // Write back the fixed manifest
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 0));
    console.log('✅ Fixed manifest.webmanifest for GitHub Pages');
  } catch (error) {
    console.error('❌ Error fixing manifest:', error);
    process.exit(1);
  }
}

fixManifest();