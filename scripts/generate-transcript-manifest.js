#!/usr/bin/env node

/**
 * Generates a manifest of all transcript files in public/data/transcripts/
 * Transcript files follow the naming pattern: {deckId}_{type}.txt
 * where type is either 'dialogue' or 'phrases'
 */

import { readdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TRANSCRIPTS_DIR = join(__dirname, '../public/data/transcripts');
const MANIFEST_FILE = join(TRANSCRIPTS_DIR, 'manifest.json');

async function generateTranscriptManifest() {
  try {
    // Read all files in the transcripts directory
    const files = await readdir(TRANSCRIPTS_DIR);

    // Filter for .txt files only
    const txtFiles = files.filter(file => file.endsWith('.txt'));

    // Parse each file into transcript metadata
    const transcripts = txtFiles
      .map(filename => {
        // Parse filename: {deckId}_{type}.txt
        const match = filename.match(/^(.+)_(dialogue|phrases)\.txt$/);
        if (!match) {
          console.warn(`   Skipping ${filename} - doesn't match pattern {deckId}_{type}.txt`);
          return null;
        }

        const [, deckId, type] = match;
        return {
          id: filename.replace('.txt', ''),
          deckId,
          type,
          filename,
          displayName: type.charAt(0).toUpperCase() + type.slice(1)
        };
      })
      .filter(Boolean);

    // Sort by deckId then by type (dialogue before phrases)
    transcripts.sort((a, b) => {
      if (a.deckId !== b.deckId) {
        return a.deckId.localeCompare(b.deckId);
      }
      return a.type.localeCompare(b.type);
    });

    // Create manifest object
    const manifest = {
      transcripts,
      generatedAt: new Date().toISOString()
    };

    // Write the manifest
    await writeFile(MANIFEST_FILE, JSON.stringify(manifest, null, 2));

    console.log(`Generated transcript manifest with ${transcripts.length} files:`);
    transcripts.forEach(t => console.log(`   - ${t.filename} (deck: ${t.deckId}, type: ${t.type})`));
  } catch (error) {
    console.error('Error generating transcript manifest:', error);
    process.exit(1);
  }
}

generateTranscriptManifest();
