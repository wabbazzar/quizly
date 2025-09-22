import { SentenceTranslationResult, ReadingLine } from '@/types';

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

  for (let i = 0; i <= a.length; i += 1) {
    matrix[0][i] = i;
  }

  for (let j = 0; j <= b.length; j += 1) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= b.length; j += 1) {
    for (let i = 1; i <= a.length; i += 1) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate similarity percentage between two strings
 */
function calculateSimilarity(str1: string, str2: string): number {
  const normalizedStr1 = normalizeText(str1);
  const normalizedStr2 = normalizeText(str2);

  if (normalizedStr1 === normalizedStr2) return 100;
  if (normalizedStr1.length === 0 && normalizedStr2.length === 0) return 100;
  if (normalizedStr1.length === 0 || normalizedStr2.length === 0) return 0;

  const maxLength = Math.max(normalizedStr1.length, normalizedStr2.length);
  const distance = levenshteinDistance(normalizedStr1, normalizedStr2);

  return Math.max(0, (maxLength - distance) / maxLength * 100);
}

/**
 * Normalize text for comparison (lowercase, trim, remove extra spaces)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:()\[\]{}"'`~@#$%^&*+=\-\/\\|<>]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Extract individual words from text for word-level matching
 */
function extractWords(text: string): string[] {
  return normalizeText(text)
    .split(/\s+/)
    .filter(word => word.length > 0);
}

/**
 * Calculate word-level matches between user answer and correct answer
 */
function calculateWordMatches(userAnswer: string, correctAnswer: string): Array<{
  word: string;
  matched: boolean;
  similarity?: number;
}> {
  const userWords = extractWords(userAnswer);
  const correctWords = extractWords(correctAnswer);
  const matchedCorrectWords = new Set<string>();

  return userWords.map(userWord => {
    // Find best match among correct words
    let bestMatch: string | null = null;
    let bestSimilarity = 0;

    correctWords.forEach(correctWord => {
      if (matchedCorrectWords.has(correctWord)) return; // Already matched

      const similarity = calculateSimilarity(userWord, correctWord);
      if (similarity > bestSimilarity && similarity >= 70) { // 70% threshold for word matching
        bestMatch = correctWord;
        bestSimilarity = similarity;
      }
    });

    if (bestMatch) {
      matchedCorrectWords.add(bestMatch);
      return {
        word: userWord,
        matched: true,
        similarity: bestSimilarity
      };
    }

    return {
      word: userWord,
      matched: false
    };
  });
}

/**
 * Generate alternative answers from word alignments
 */
function generateAlternativeAnswers(line: ReadingLine, targetSide: string): string[] {
  const alternatives: string[] = [];

  // Add the main target side text
  const mainText = line[targetSide as keyof ReadingLine] as string;
  if (mainText) {
    alternatives.push(mainText);
  }

  // Generate alternatives from word alignments if available
  if (line.wordAlignments && targetSide === 'c') { // English translations
    const words = line.wordAlignments
      .filter(alignment => alignment.english.trim().length > 0)
      .map(alignment => alignment.english.trim());

    if (words.length > 0) {
      alternatives.push(words.join(' '));
    }
  }

  return [...new Set(alternatives)]; // Remove duplicates
}

/**
 * Check sentence translation and provide detailed feedback
 */
export function checkSentenceTranslation(
  userAnswer: string,
  line: ReadingLine,
  targetSide: string,
  accuracyThreshold: number = 70
): SentenceTranslationResult {
  const alternatives = generateAlternativeAnswers(line, targetSide);
  const correctAnswer = alternatives[0] || '';

  if (!correctAnswer) {
    return {
      userAnswer,
      correctAnswer: '',
      accuracy: 0,
      isCorrect: false,
      suggestions: []
    };
  }

  // Calculate accuracy against all alternatives, use the best score
  let bestAccuracy = 0;
  let bestCorrectAnswer = correctAnswer;

  alternatives.forEach(alternative => {
    const accuracy = calculateSimilarity(userAnswer, alternative);
    if (accuracy > bestAccuracy) {
      bestAccuracy = accuracy;
      bestCorrectAnswer = alternative;
    }
  });

  const wordMatches = calculateWordMatches(userAnswer, bestCorrectAnswer);
  const isCorrect = bestAccuracy >= accuracyThreshold;

  return {
    userAnswer,
    correctAnswer: bestCorrectAnswer,
    accuracy: Math.round(bestAccuracy),
    isCorrect,
    wordMatches,
    suggestions: alternatives.slice(1) // Alternative answers excluding the best match
  };
}

/**
 * Generate multiple choice options for sentence translation
 */
export function generateSentenceMultipleChoice(
  line: ReadingLine,
  targetSide: string,
  allLines: ReadingLine[],
  optionsCount: number = 4,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): string[] {
  const correctAnswer = line[targetSide as keyof ReadingLine] as string;
  if (!correctAnswer) return [];

  const options = [correctAnswer];
  const usedAnswers = new Set([normalizeText(correctAnswer)]);

  // Generate distractors based on difficulty
  const potentialDistractors: string[] = [];

  if (difficulty === 'easy') {
    // Use other sides from the same line
    Object.keys(line).forEach(side => {
      if (side !== targetSide && typeof line[side as keyof ReadingLine] === 'string') {
        const text = line[side as keyof ReadingLine] as string;
        if (text && !usedAnswers.has(normalizeText(text))) {
          potentialDistractors.push(text);
        }
      }
    });
  }

  // Add distractors from other lines regardless of difficulty
  allLines.forEach(otherLine => {
    if (otherLine === line) return;

    const text = otherLine[targetSide as keyof ReadingLine] as string;
    if (text && !usedAnswers.has(normalizeText(text))) {
      potentialDistractors.push(text);
    }
  });

  // Shuffle and select distractors
  const shuffledDistractors = potentialDistractors
    .sort(() => Math.random() - 0.5)
    .slice(0, optionsCount - 1);

  options.push(...shuffledDistractors);

  // Shuffle all options
  return options.sort(() => Math.random() - 0.5);
}

/**
 * Get hint text for a specific Chinese word using word alignments
 */
export function getWordHint(
  line: ReadingLine,
  chineseWord: string,
  targetSide: string
): { pinyin?: string; translation?: string } | null {
  if (!line.wordAlignments) return null;

  const alignment = line.wordAlignments.find(
    alignment => alignment.chinese === chineseWord
  );

  if (!alignment) return null;

  const result: { pinyin?: string; translation?: string } = {};

  if (alignment.pinyin && alignment.pinyin.trim()) {
    result.pinyin = alignment.pinyin;
  }

  if (targetSide === 'c' && alignment.english && alignment.english.trim()) {
    result.translation = alignment.english;
  }

  return Object.keys(result).length > 0 ? result : null;
}