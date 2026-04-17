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

    // Pin root paths so the PWA installs correctly at the custom domain root.
    manifest.start_url = '/';
    manifest.scope = '/';

    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 0));
    console.log('✅ Fixed manifest.webmanifest for GitHub Pages');
  } catch (error) {
    console.error('❌ Error fixing manifest:', error);
    process.exit(1);
  }
}

async function fixIndexHtml() {
  const indexPath = path.join(__dirname, '../dist/index.html');

  try {
    let htmlContent = await fs.readFile(indexPath, 'utf-8');

    // Normalize any leftover relative icon paths to absolute root paths.
    htmlContent = htmlContent
      .replace(/href="\.\/favicon\.ico"/g, 'href="/favicon.ico"')
      .replace(/href="\.\/icons\//g, 'href="/icons/')
      .replace(/content="\.\/icons\//g, 'content="/icons/');

    await fs.writeFile(indexPath, htmlContent);
    console.log('✅ Fixed index.html icon paths for GitHub Pages');
  } catch (error) {
    console.error('❌ Error fixing index.html:', error);
    process.exit(1);
  }
}

async function main() {
  await fixManifest();
  await fixIndexHtml();
}

main();
