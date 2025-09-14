import { TextMatchOptions } from '@/types';

const defaultOptions: TextMatchOptions = {
  caseSensitive: false,
  allowTypos: true,
  maxEditDistance: 2,
  synonyms: new Map(),
};

export class TextMatcher {
  /**
   * Check if user input matches any of the accepted answers
   */
  static isMatch(
    userInput: string,
    acceptedAnswers: string[],
    options: TextMatchOptions = defaultOptions
  ): boolean {
    const normalizedInput = this.normalizeText(userInput, options.caseSensitive);

    for (const acceptedAnswer of acceptedAnswers) {
      const normalizedAnswer = this.normalizeText(acceptedAnswer, options.caseSensitive);

      // Exact match
      if (normalizedInput === normalizedAnswer) {
        return true;
      }

      // Typo tolerance using Levenshtein distance
      if (options.allowTypos) {
        const distance = this.levenshteinDistance(normalizedInput, normalizedAnswer);
        if (distance <= options.maxEditDistance) {
          return true;
        }
      }

      // Synonym matching
      if (options.synonyms && options.synonyms.size > 0) {
        if (this.matchesSynonym(normalizedInput, normalizedAnswer, options.synonyms)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Calculate similarity between two strings (0-1)
   */
  static calculateSimilarity(text1: string, text2: string): number {
    const normalized1 = this.normalizeText(text1, false);
    const normalized2 = this.normalizeText(text2, false);

    if (normalized1 === normalized2) {
      return 1;
    }

    const distance = this.levenshteinDistance(normalized1, normalized2);
    const maxLength = Math.max(normalized1.length, normalized2.length);

    if (maxLength === 0) {
      return 0;
    }

    return 1 - (distance / maxLength);
  }

  /**
   * Normalize text for comparison
   */
  static normalizeText(text: string, preserveCase: boolean = false): string {
    let normalized = text.trim();

    // Remove extra whitespace
    normalized = normalized.replace(/\s+/g, ' ');

    // Remove common punctuation (but keep important ones like apostrophes in contractions)
    normalized = normalized.replace(/[.,;:!?()[\]{}"""''`]/g, '');

    // Convert to lowercase unless case sensitive
    if (!preserveCase) {
      normalized = normalized.toLowerCase();
    }

    return normalized;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    // Initialize the matrix
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    // Fill the matrix
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Check if input matches via synonyms
   */
  private static matchesSynonym(
    input: string,
    answer: string,
    synonyms: Map<string, string[]>
  ): boolean {
    // Check if input is a synonym of the answer
    const answerSynonyms = synonyms.get(answer);
    if (answerSynonyms && answerSynonyms.includes(input)) {
      return true;
    }

    // Check if answer is a synonym of the input
    const inputSynonyms = synonyms.get(input);
    if (inputSynonyms && inputSynonyms.includes(answer)) {
      return true;
    }

    // Check if they share a common synonym group
    for (const [, values] of synonyms.entries()) {
      if (values.includes(input) && values.includes(answer)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate common typos for a word (for testing)
   */
  static generateCommonTypos(word: string): string[] {
    const typos: string[] = [];

    // Adjacent key swaps (simplified)
    for (let i = 0; i < word.length - 1; i++) {
      const chars = word.split('');
      [chars[i], chars[i + 1]] = [chars[i + 1], chars[i]];
      typos.push(chars.join(''));
    }

    // Missing letters
    for (let i = 0; i < word.length; i++) {
      typos.push(word.slice(0, i) + word.slice(i + 1));
    }

    // Doubled letters
    for (let i = 0; i < word.length; i++) {
      typos.push(word.slice(0, i + 1) + word[i] + word.slice(i + 1));
    }

    return [...new Set(typos)];
  }

  /**
   * Extract keywords from text
   */
  static extractKeywords(text: string): string[] {
    const normalized = this.normalizeText(text, false);
    const words = normalized.split(/\s+/);

    // Filter out common stop words
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
      'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'should', 'could', 'may', 'might', 'must', 'can', 'shall',
      'this', 'that', 'these', 'those', 'it', 'its', 'he', 'she', 'they',
      'we', 'you', 'i', 'me', 'him', 'her', 'us', 'them', 'my', 'your',
      'his', 'her', 'our', 'their', 'what', 'which', 'who', 'whom', 'whose',
      'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few',
      'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
      'own', 'same', 'so', 'than', 'too', 'very', 'just', 'now', 'also'
    ]);

    return words.filter(word => word.length > 2 && !stopWords.has(word));
  }
}