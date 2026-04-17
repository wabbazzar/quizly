#!/usr/bin/env node

/**
 * Generates a manifest of all transcript files in public/data/transcripts/
 * Transcript files follow the naming pattern: {deckId}_{type}.txt
 * where type is either 'dialogue' or 'phrases'
 * Also links matching audio files from public/data/audio/
 *
 * Enriches each entry with displayTitle (from the deck's abbreviated_title)
 * and sortOrder so the audio player can render and sort without any
 * deck-id-pattern parsing in client code.
 */

import { readdir, readFile, writeFile, access } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TRANSCRIPTS_DIR = join(__dirname, '../public/data/transcripts');
const AUDIO_DIR = join(__dirname, '../public/data/audio');
const DECKS_DIR = join(__dirname, '../public/data/decks');
const MANIFEST_FILE = join(TRANSCRIPTS_DIR, 'manifest.json');

async function getAudioFiles() {
  try {
    await access(AUDIO_DIR);
    const files = await readdir(AUDIO_DIR);
    return files.filter(file => file.endsWith('.mp3'));
  } catch {
    return [];
  }
}

async function loadDeckMetadata(deckId) {
  try {
    const path = join(DECKS_DIR, `${deckId}.json`);
    const raw = await readFile(path, 'utf-8');
    const json = JSON.parse(raw);
    const metadata = json?.metadata ?? {};
    return {
      abbreviated_title: metadata.abbreviated_title,
      deck_name: metadata.deck_name,
    };
  } catch {
    return null;
  }
}

// Natural-order compare so "chpt2_2" sorts before "chpt10_2" and lifestyle
// decks fall alphabetically at the end.
function compareDeckIds(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

async function generateTranscriptManifest() {
  try {
    const files = await readdir(TRANSCRIPTS_DIR);
    const audioFiles = await getAudioFiles();
    const audioFileSet = new Set(audioFiles);

    const txtFiles = files.filter(file => file.endsWith('.txt'));

    const parsed = txtFiles
      .map(filename => {
        const match = filename.match(/^(.+)_(dialogue|phrases)\.txt$/);
        if (!match) {
          console.warn(`   Skipping ${filename} - doesn't match pattern {deckId}_{type}.txt`);
          return null;
        }
        const [, deckId, type] = match;
        const baseId = filename.replace('.txt', '');
        const audioFilename = `${baseId}.mp3`;
        const hasAudio = audioFileSet.has(audioFilename);
        return { filename, baseId, deckId, type, hasAudio, audioFilename };
      })
      .filter(Boolean);

    // Build deck-order map from the natural-sorted unique deckId list so that
    // sortOrder is stable, gap-free, and shared across phrases/dialogue of the
    // same deck. New decks slot in without any code change.
    const uniqueDeckIds = Array.from(new Set(parsed.map(p => p.deckId))).sort(compareDeckIds);
    const deckOrder = new Map(uniqueDeckIds.map((id, i) => [id, i]));

    // Load deck metadata once per unique deckId.
    const deckMetaEntries = await Promise.all(
      uniqueDeckIds.map(async id => [id, await loadDeckMetadata(id)])
    );
    const deckMeta = new Map(deckMetaEntries);

    const transcripts = parsed.map(({ filename, baseId, deckId, type, hasAudio, audioFilename }) => {
      const meta = deckMeta.get(deckId);
      const displayTitle = meta?.abbreviated_title || meta?.deck_name || deckId;

      const transcript = {
        id: baseId,
        deckId,
        type,
        filename,
        displayName: type.charAt(0).toUpperCase() + type.slice(1),
        displayTitle,
        sortOrder: deckOrder.get(deckId) ?? 0,
      };

      if (hasAudio) {
        transcript.audioFile = audioFilename;
      }

      return transcript;
    });

    // Primary: deck sortOrder. Secondary: phrases before dialogue.
    transcripts.sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      if (a.type !== b.type) return a.type === 'phrases' ? -1 : 1;
      return 0;
    });

    const manifest = {
      transcripts,
      generatedAt: new Date().toISOString(),
    };

    await writeFile(MANIFEST_FILE, JSON.stringify(manifest, null, 2));

    const withAudio = transcripts.filter(t => t.audioFile).length;
    console.log(`Generated transcript manifest with ${transcripts.length} files (${withAudio} with audio):`);
    transcripts.forEach(t => {
      const audioIndicator = t.audioFile ? ' [audio]' : '';
      console.log(`   - ${t.filename} (deck: ${t.deckId}, title: ${t.displayTitle}, type: ${t.type})${audioIndicator}`);
    });
  } catch (error) {
    console.error('Error generating transcript manifest:', error);
    process.exit(1);
  }
}

generateTranscriptManifest();
