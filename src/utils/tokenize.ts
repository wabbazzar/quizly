import { SideId, ReadingLine, ReadingTokenizationConfig, WordAlignment } from '@/types';

export interface Token {
  text: string;
  start: number;
  end: number;
}

export type LineTokens = Partial<Record<SideId, Token[]>>;

// Default tokenization configuration
const DEFAULT_TOKENIZATION: ReadingTokenizationConfig = {
  unit: {
    a: 'character',
    b: 'space',
    c: 'space',
    d: undefined,
    e: undefined,
    f: undefined
  },
  preservePunctuation: true
};

// Check if character is CJK (Chinese, Japanese, Korean)
const isCJKCharacter = (char: string): boolean => {
  const code = char.charCodeAt(0);
  return (
    (code >= 0x4e00 && code <= 0x9fff) || // CJK Unified Ideographs
    (code >= 0x3400 && code <= 0x4dbf) || // CJK Extension A
    (code >= 0x20000 && code <= 0x2a6df) || // CJK Extension B
    (code >= 0x2a700 && code <= 0x2b73f) || // CJK Extension C
    (code >= 0x2b740 && code <= 0x2b81f) || // CJK Extension D
    (code >= 0x3040 && code <= 0x309f) || // Hiragana
    (code >= 0x30a0 && code <= 0x30ff) || // Katakana
    (code >= 0xac00 && code <= 0xd7af) // Hangul Syllables
  );
};

// Tokenize by character
const tokenizeByCharacter = (text: string, preservePunctuation: boolean): Token[] => {
  const tokens: Token[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    // Skip or include punctuation based on settings
    if (!preservePunctuation && /\s|[.,!?;:]/.test(char)) {
      continue;
    }

    // Skip whitespace for character tokenization
    if (/\s/.test(char)) {
      continue;
    }

    tokens.push({
      text: char,
      start: i,
      end: i + 1
    });
  }

  return tokens;
};

// Tokenize by word (space-separated)
const tokenizeByWord = (text: string, preservePunctuation: boolean): Token[] => {
  const tokens: Token[] = [];
  let currentWord = '';
  let wordStart = 0;

  for (let i = 0; i <= text.length; i++) {
    const char = text[i];

    if (i === text.length || /\s/.test(char)) {
      if (currentWord) {
        // Remove trailing punctuation if needed
        let wordText = currentWord;
        if (!preservePunctuation) {
          wordText = wordText.replace(/[.,!?;:]+$/, '');
        }

        if (wordText) {
          tokens.push({
            text: wordText,
            start: wordStart,
            end: wordStart + wordText.length
          });
        }

        currentWord = '';
      }
      wordStart = i + 1;
    } else {
      if (currentWord === '') {
        wordStart = i;
      }
      currentWord += char;
    }
  }

  return tokens;
};

// Tokenize by space (keep spaces as separators)
const tokenizeBySpace = (text: string, preservePunctuation: boolean): Token[] => {
  return tokenizeByWord(text, preservePunctuation);
};

// Smart tokenization - detect CJK for character-based, otherwise word-based
const tokenizeSmart = (text: string, preservePunctuation: boolean): Token[] => {
  // Check if text contains significant CJK characters
  const totalChars = text.replace(/\s/g, '').length;
  const cjkChars = Array.from(text).filter(isCJKCharacter).length;

  // If more than 30% CJK, use character tokenization
  if (cjkChars > 0 && cjkChars / totalChars > 0.3) {
    return tokenizeByCharacter(text, preservePunctuation);
  }

  // Otherwise use word tokenization
  return tokenizeByWord(text, preservePunctuation);
};

// Main tokenization function
export const tokenizeLine = (
  line: ReadingLine,
  config?: ReadingTokenizationConfig
): LineTokens => {
  const tokenConfig = config || DEFAULT_TOKENIZATION;

  // If wordAlignments exist, use them for precise alignment
  if (line.wordAlignments && line.wordAlignments.length > 0) {
    return tokenizeWithWordAlignments(line.wordAlignments);
  }

  // Fallback to original tokenization method
  const result: LineTokens = {};
  const sideIds: SideId[] = ['a', 'b', 'c', 'd', 'e', 'f'];

  for (const side of sideIds) {
    const text = line[side];
    if (!text) continue;

    const unit = tokenConfig.unit[side];
    if (!unit) continue;

    switch (unit) {
      case 'character':
        result[side] = tokenizeByCharacter(text, tokenConfig.preservePunctuation);
        break;
      case 'word':
        result[side] = tokenizeByWord(text, tokenConfig.preservePunctuation);
        break;
      case 'space':
        result[side] = tokenizeBySpace(text, tokenConfig.preservePunctuation);
        break;
      default:
        // Fallback to smart tokenization
        result[side] = tokenizeSmart(text, tokenConfig.preservePunctuation);
    }
  }

  return result;
};

// Tokenize using word alignments
const tokenizeWithWordAlignments = (wordAlignments: WordAlignment[]): LineTokens => {
  const result: LineTokens = {
    a: [], // Chinese
    b: [], // Pinyin
    c: []  // English
  };

  let chinesePos = 0;
  let pinyinPos = 0;
  let englishPos = 0;

  wordAlignments.forEach(alignment => {
    // Chinese token (side a)
    result.a!.push({
      text: alignment.chinese,
      start: chinesePos,
      end: chinesePos + alignment.chinese.length
    });
    chinesePos += alignment.chinese.length;

    // Pinyin token (side b)
    result.b!.push({
      text: alignment.pinyin,
      start: pinyinPos,
      end: pinyinPos + alignment.pinyin.length
    });
    pinyinPos += alignment.pinyin.length + 1; // +1 for space

    // English token (side c)
    result.c!.push({
      text: alignment.english,
      start: englishPos,
      end: englishPos + alignment.english.length
    });
    englishPos += alignment.english.length + 1; // +1 for space
  });

  return result;
};

// Get aligned tokens based on index or heuristic
export const getAlignedTokens = (
  lineTokens: LineTokens,
  line: ReadingLine,
  fromSide: SideId,
  toSide: SideId
): Map<number, number> => {
  const alignment = new Map<number, number>();

  const fromTokens = lineTokens[fromSide];
  const toTokens = lineTokens[toSide];

  if (!fromTokens || !toTokens) return alignment;

  // If explicit alignments exist, use them
  if (line.alignments && line.alignments.length > 0) {
    line.alignments.forEach((mapping) => {
      const fromIndex = mapping[fromSide];
      const toIndex = mapping[toSide];
      if (fromIndex !== undefined && toIndex !== undefined) {
        alignment.set(fromIndex, toIndex);
      }
    });
    return alignment;
  }

  // Otherwise use heuristic alignment
  // Simple case: if token counts are close, use index alignment
  const ratio = fromTokens.length / toTokens.length;

  if (ratio > 0.8 && ratio < 1.2) {
    // Close enough, use index alignment
    const minLength = Math.min(fromTokens.length, toTokens.length);
    for (let i = 0; i < minLength; i++) {
      alignment.set(i, i);
    }
  } else {
    // More complex alignment - distribute evenly
    for (let i = 0; i < fromTokens.length; i++) {
      const targetIndex = Math.floor((i / fromTokens.length) * toTokens.length);
      alignment.set(i, Math.min(targetIndex, toTokens.length - 1));
    }
  }

  return alignment;
};

// Normalize text for matching (used in answer checking)
export const normalizeText = (text: string, options?: {
  caseSensitive?: boolean;
  removeSpaces?: boolean;
  removePunctuation?: boolean;
}): string => {
  let normalized = text;

  const opts = {
    caseSensitive: false,
    removeSpaces: false,
    removePunctuation: true,
    ...options
  };

  if (!opts.caseSensitive) {
    normalized = normalized.toLowerCase();
  }

  if (opts.removePunctuation) {
    normalized = normalized.replace(/[.,!?;:'"]/g, '');
  }

  if (opts.removeSpaces) {
    normalized = normalized.replace(/\s+/g, '');
  } else {
    // Collapse multiple spaces to single space
    normalized = normalized.replace(/\s+/g, ' ').trim();
  }

  return normalized;
};

// Calculate edit distance for fuzzy matching
export const calculateEditDistance = (str1: string, str2: string): number => {
  const m = str1.length;
  const n = str2.length;

  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // deletion
          dp[i][j - 1] + 1, // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return dp[m][n];
};

// Normalize pinyin by removing tone marks and converting to lowercase
export const normalizePinyin = (pinyin: string): string => {
  return pinyin
    .toLowerCase()
    .replace(/[āáǎà]/g, 'a')
    .replace(/[ēéěè]/g, 'e')
    .replace(/[īíǐì]/g, 'i')
    .replace(/[ōóǒò]/g, 'o')
    .replace(/[ūúǔù]/g, 'u')
    .replace(/[ǖǘǚǜü]/g, 'v') // ü becomes v (common pinyin input method)
    .replace(/[ńňǹ]/g, 'n')
    .replace(/[ḿ]/g, 'm')
    .trim();
};

// Check if pinyin answer is close enough (handles tone mark variations)
export const isPinyinAnswerClose = (
  userAnswer: string,
  correctAnswer: string,
  maxEditDistance: number = 1
): boolean => {
  // Normalize both answers to remove tone marks
  const normalizedUser = normalizePinyin(userAnswer);
  const normalizedCorrect = normalizePinyin(correctAnswer);

  // Exact match after normalization
  if (normalizedUser === normalizedCorrect) return true;

  // Allow slight variations (typos, missing spaces, etc.)
  const distance = calculateEditDistance(normalizedUser, normalizedCorrect);
  const maxDistance = Math.min(maxEditDistance, Math.floor(normalizedCorrect.length * 0.15));

  return distance <= maxDistance;
};

// Check if answer is close enough (for fuzzy matching)
export const isAnswerClose = (
  userAnswer: string,
  correctAnswer: string,
  maxEditDistance: number = 2,
  answerType: 'text' | 'pinyin' = 'text'
): boolean => {
  // Use specialized pinyin matching for pinyin answers
  if (answerType === 'pinyin') {
    return isPinyinAnswerClose(userAnswer, correctAnswer, maxEditDistance);
  }

  // Standard text matching
  const normalizedUser = normalizeText(userAnswer);
  const normalizedCorrect = normalizeText(correctAnswer);

  if (normalizedUser === normalizedCorrect) return true;

  const distance = calculateEditDistance(normalizedUser, normalizedCorrect);
  const maxDistance = Math.min(maxEditDistance, Math.floor(normalizedCorrect.length * 0.2));

  return distance <= maxDistance;
};