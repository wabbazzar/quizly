import { Token } from './tokenize';

/**
 * Chinese word segmentation utility
 * Segments Chinese text into meaningful words rather than individual characters
 */

// Common Chinese words/phrases patterns
const COMMON_PATTERNS = [
  // Common 2-character words
  '对不起', '没问题', '怎么样', '一共', '多少', '什么', '哪里', '为什么', '什么时候',
  '商店', '衣服', '颜色', '大小', '合适', '便宜', '样子', '信用卡', '不用', '再见',
  '这双', '那双', '一双', '这件', '那件', '一件', '这条', '那条', '一条',
  '黄色', '红色', '黑色', '白色', '蓝色', '绿色', '咖啡色',

  // Common 3-character words
  '售货员', '长短', '大小', '换一双', '试试看', '刷卡',

  // Measure words with numbers
  '一百', '二十', '三十', '四十', '五十', '六十', '七十', '八十', '九十',

  // Common phrases
  '能不能', '可以', '不能', '不行', '还是', '或者', '虽然', '但是', '不过',
  '看看', '试试', '穿穿', '想想', '等等'
];

// Create a trie for efficient pattern matching
interface TrieNode {
  children: Map<string, TrieNode>;
  isEnd: boolean;
  length: number;
}

class Trie {
  private root: TrieNode;

  constructor() {
    this.root = { children: new Map(), isEnd: false, length: 0 };
    this.buildTrie();
  }

  private buildTrie() {
    for (const pattern of COMMON_PATTERNS) {
      this.insert(pattern);
    }
  }

  private insert(word: string) {
    let node = this.root;
    for (const char of word) {
      if (!node.children.has(char)) {
        node.children.set(char, { children: new Map(), isEnd: false, length: 0 });
      }
      node = node.children.get(char)!;
    }
    node.isEnd = true;
    node.length = word.length;
  }

  // Find the longest matching pattern starting at position i
  findLongestMatch(text: string, startIndex: number): { match: string; length: number } | null {
    let node = this.root;
    let longestMatch: { match: string; length: number } | null = null;

    for (let i = startIndex; i < text.length; i++) {
      const char = text[i];
      if (!node.children.has(char)) {
        break;
      }
      node = node.children.get(char)!;
      if (node.isEnd) {
        longestMatch = {
          match: text.substring(startIndex, i + 1),
          length: i + 1 - startIndex
        };
      }
    }

    return longestMatch;
  }
}

const trie = new Trie();

/**
 * Check if a character is Chinese punctuation
 */
const isChinesePunctuation = (char: string): boolean => {
  const chinesePunctuation = '。，！？；：（）【】《》「」『』、';
  return chinesePunctuation.includes(char);
};

/**
 * Check if a character is CJK (Chinese, Japanese, Korean)
 */
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

/**
 * Segment Chinese text into words using pattern matching and heuristics
 */
export const segmentChineseText = (text: string, preservePunctuation: boolean = true): Token[] => {
  const tokens: Token[] = [];
  let i = 0;

  while (i < text.length) {
    const char = text[i];

    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Handle punctuation
    if (isChinesePunctuation(char) || /[.,!?;:]/.test(char)) {
      if (preservePunctuation) {
        tokens.push({
          text: char,
          start: i,
          end: i + 1
        });
      }
      i++;
      continue;
    }

    // Try to find a pattern match
    const match = trie.findLongestMatch(text, i);
    if (match && match.length > 1) {
      tokens.push({
        text: match.match,
        start: i,
        end: i + match.length
      });
      i += match.length;
      continue;
    }

    // Handle numbers and English mixed with Chinese
    if (/[0-9a-zA-Z]/.test(char)) {
      let numStart = i;
      while (i < text.length && /[0-9a-zA-Z]/.test(text[i])) {
        i++;
      }
      tokens.push({
        text: text.substring(numStart, i),
        start: numStart,
        end: i
      });
      continue;
    }

    // Default: treat as single character
    if (isCJKCharacter(char)) {
      tokens.push({
        text: char,
        start: i,
        end: i + 1
      });
    }

    i++;
  }

  return tokens;
};

/**
 * Create word-aligned tokens for reading mode
 * This function ensures proper alignment between Chinese phrases and English translations
 */
export const createWordAlignedTokens = (
  chineseText: string,
  pinyinText: string,
  englishText: string,
  alignments?: Array<{ chinese: string; pinyin: string; english: string }>
): {
  chinese: Token[];
  pinyin: Token[];
  english: Token[];
  alignmentMap: Map<number, number>; // chinese token index -> english token index
} => {
  // If explicit alignments are provided, use them
  if (alignments && alignments.length > 0) {
    const chineseTokens: Token[] = [];
    const pinyinTokens: Token[] = [];
    const englishTokens: Token[] = [];
    const alignmentMap = new Map<number, number>();

    let chinesePos = 0;
    let pinyinPos = 0;
    let englishPos = 0;

    alignments.forEach((alignment, index) => {
      // Chinese token
      chineseTokens.push({
        text: alignment.chinese,
        start: chinesePos,
        end: chinesePos + alignment.chinese.length
      });
      chinesePos += alignment.chinese.length;

      // Pinyin token
      pinyinTokens.push({
        text: alignment.pinyin,
        start: pinyinPos,
        end: pinyinPos + alignment.pinyin.length
      });
      pinyinPos += alignment.pinyin.length;

      // English token
      englishTokens.push({
        text: alignment.english,
        start: englishPos,
        end: englishPos + alignment.english.length
      });
      englishPos += alignment.english.length;

      // Set alignment
      alignmentMap.set(index, index);
    });

    return { chinese: chineseTokens, pinyin: pinyinTokens, english: englishTokens, alignmentMap };
  }

  // Fallback: segment automatically
  const chineseTokens = segmentChineseText(chineseText);

  // Tokenize pinyin by spaces
  const pinyinTokens: Token[] = [];
  const pinyinWords = pinyinText.split(/\s+/).filter(word => word.length > 0);
  let pinyinPos = 0;
  pinyinWords.forEach(word => {
    pinyinTokens.push({
      text: word,
      start: pinyinPos,
      end: pinyinPos + word.length
    });
    pinyinPos += word.length + 1; // +1 for space
  });

  // Tokenize English by spaces
  const englishTokens: Token[] = [];
  const englishWords = englishText.split(/\s+/).filter(word => word.length > 0);
  let englishPos = 0;
  englishWords.forEach(word => {
    englishTokens.push({
      text: word.replace(/[.,!?;:]$/, ''), // Remove trailing punctuation
      start: englishPos,
      end: englishPos + word.length
    });
    englishPos += word.length + 1; // +1 for space
  });

  // Create simple alignment map
  const alignmentMap = new Map<number, number>();

  for (let i = 0; i < chineseTokens.length; i++) {
    // Map Chinese token to corresponding English token
    const englishIndex = Math.floor((i / chineseTokens.length) * englishTokens.length);
    alignmentMap.set(i, Math.min(englishIndex, englishTokens.length - 1));
  }

  return { chinese: chineseTokens, pinyin: pinyinTokens, english: englishTokens, alignmentMap };
};