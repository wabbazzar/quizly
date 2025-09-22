import { ReadingLine } from '@/types';

export interface AlignedToken {
  chinese: string;
  pinyin: string;
  english: string;
  index: number;
}

/**
 * Extracts aligned tokens from wordAlignments data
 * This provides a 1:1 mapping between Chinese, pinyin, and English tokens
 */
export function extractAlignedTokens(line: ReadingLine): AlignedToken[] {
  if (!line.wordAlignments || line.wordAlignments.length === 0) {
    return [];
  }

  return line.wordAlignments.map((alignment, index) => ({
    chinese: alignment.chinese,
    pinyin: alignment.pinyin,
    english: alignment.english,
    index
  }));
}

/**
 * Checks if a line has word alignment data available
 */
export function hasWordAlignments(line: ReadingLine): boolean {
  return Boolean(line.wordAlignments && line.wordAlignments.length > 0);
}

/**
 * Gets the aligned translation for a specific Chinese token
 */
export function getAlignedTranslation(
  line: ReadingLine,
  tokenIndex: number
): { pinyin: string; english: string } | null {
  if (!hasWordAlignments(line) || !line.wordAlignments) {
    return null;
  }

  const alignment = line.wordAlignments[tokenIndex];
  if (!alignment) {
    return null;
  }

  return {
    pinyin: alignment.pinyin,
    english: alignment.english
  };
}

/**
 * Finds the token index for a given Chinese text
 */
export function findTokenIndex(line: ReadingLine, chineseText: string): number {
  if (!hasWordAlignments(line) || !line.wordAlignments) {
    return -1;
  }

  return line.wordAlignments.findIndex(
    alignment => alignment.chinese === chineseText
  );
}

/**
 * Creates a combined display text for word-by-word reading
 * This shows Chinese with hover/tap for translations
 */
export function createInteractiveTokens(line: ReadingLine): AlignedToken[] {
  const tokens = extractAlignedTokens(line);

  // Filter out empty English translations (punctuation, particles, etc.)
  return tokens.map(token => ({
    ...token,
    // Mark tokens with empty English as non-interactive
    english: token.english.trim() || ''
  }));
}