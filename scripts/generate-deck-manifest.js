#!/usr/bin/env node

/**
 * Generates a manifest of all deck files in public/data/decks/
 * This runs during build time to create a static manifest
 */

import { readdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DECKS_DIR = join(__dirname, '../public/data/decks');
const MANIFEST_FILE = join(DECKS_DIR, 'manifest.json');

async function generateManifest() {
  try {
    // Read all files in the decks directory
    const files = await readdir(DECKS_DIR);

    // Filter for JSON files only (excluding manifest itself)
    const deckFiles = files.filter(
      file => file.endsWith('.json') && file !== 'manifest.json'
    );

    // Sort alphabetically for consistency
    deckFiles.sort();

    // Write the manifest
    await writeFile(
      MANIFEST_FILE,
      JSON.stringify(deckFiles, null, 2)
    );

    console.log(`✅ Generated manifest with ${deckFiles.length} decks:`);
    deckFiles.forEach(file => console.log(`   - ${file}`));

  } catch (error) {
    console.error('❌ Error generating manifest:', error);
    process.exit(1);
  }
}

generateManifest();