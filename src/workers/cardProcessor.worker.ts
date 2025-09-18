/**
 * Web Worker for processing card data and heavy computations
 * Offloads expensive operations from the main thread
 */

import type { Card } from '@/types';

// Message types for communication with main thread
interface WorkerMessage {
  id: string;
  type: string;
  payload: any;
}

interface WorkerResponse {
  id: string;
  type: string;
  result?: any;
  error?: string;
}

// Processing functions
interface CardStatistics {
  totalCards: number;
  averageCardLength: number;
  longestCard: string;
  shortestCard: string;
  difficultyDistribution: Record<string, number>;
  categoryDistribution: Record<string, number>;
}

interface SearchResult {
  cardIndex: number;
  card: Card;
  score: number;
  matches: Array<{
    field: string;
    start: number;
    end: number;
  }>;
}

// Text processing utilities
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ');
}

function calculateRelevanceScore(card: Card, query: string): number {
  const normalizedQuery = normalizeText(query);
  const queryWords = normalizedQuery.split(' ').filter(word => word.length > 0);

  if (queryWords.length === 0) return 0;

  let score = 0;
  const fields = [
    card.side_a,
    card.side_b,
    card.side_c,
    card.side_d,
    card.side_e,
    card.side_f,
  ].filter(Boolean) as string[];

  fields.forEach((field, fieldIndex) => {
    const normalizedField = normalizeText(field);

    queryWords.forEach(word => {
      if (normalizedField.includes(word)) {
        // Exact word match
        score += 10;

        // Bonus for field priority (side_a and side_b are more important)
        if (fieldIndex < 2) score += 5;

        // Bonus for word position (earlier = more relevant)
        const position = normalizedField.indexOf(word);
        const positionBonus = Math.max(0, 10 - (position / normalizedField.length) * 10);
        score += positionBonus;
      }
    });

    // Partial matching
    if (normalizedField.includes(normalizedQuery)) {
      score += 15;
      if (fieldIndex < 2) score += 10;
    }
  });

  return score;
}

function findMatches(text: string, query: string): Array<{ start: number; end: number }> {
  const matches = [];
  const normalizedText = normalizeText(text);
  const normalizedQuery = normalizeText(query);

  let index = 0;
  while (index < normalizedText.length) {
    const match = normalizedText.indexOf(normalizedQuery, index);
    if (match === -1) break;

    matches.push({
      start: match,
      end: match + normalizedQuery.length,
    });
    index = match + 1;
  }

  return matches;
}

// Main processing functions
function analyzeCards(cards: Card[]): CardStatistics {
  const stats: CardStatistics = {
    totalCards: cards.length,
    averageCardLength: 0,
    longestCard: '',
    shortestCard: '',
    difficultyDistribution: {},
    categoryDistribution: {},
  };

  if (cards.length === 0) return stats;

  let totalLength = 0;
  let longestLength = 0;
  let shortestLength = Infinity;

  cards.forEach(card => {
    // Calculate text length across all sides
    const allText = [card.side_a, card.side_b, card.side_c, card.side_d, card.side_e, card.side_f]
      .filter(Boolean)
      .join(' ');

    const length = allText.length;
    totalLength += length;

    if (length > longestLength) {
      longestLength = length;
      stats.longestCard = card.side_a;
    }

    if (length < shortestLength) {
      shortestLength = length;
      stats.shortestCard = card.side_a;
    }

    // Category tracking removed - not in Card type

    // Track difficulty (if available)
    const difficulty = (card as any).difficulty || 'unknown';
    stats.difficultyDistribution[difficulty] = (stats.difficultyDistribution[difficulty] || 0) + 1;
  });

  stats.averageCardLength = totalLength / cards.length;

  return stats;
}

function searchCards(cards: Card[], query: string, limit = 50): SearchResult[] {
  if (!query.trim()) return [];

  const results: SearchResult[] = [];

  cards.forEach((card, index) => {
    const score = calculateRelevanceScore(card, query);

    if (score > 0) {
      const matches: { field: string; start: number; end: number }[] = [];
      const fields = [
        { name: 'side_a', text: card.side_a },
        { name: 'side_b', text: card.side_b },
        { name: 'side_c', text: card.side_c },
        { name: 'side_d', text: card.side_d },
        { name: 'side_e', text: card.side_e },
        { name: 'side_f', text: card.side_f },
      ];

      fields.forEach(field => {
        if (field.text) {
          const fieldMatches = findMatches(field.text, query);
          fieldMatches.forEach(match => {
            matches.push({
              field: field.name,
              ...match,
            });
          });
        }
      });

      results.push({
        cardIndex: index,
        card,
        score,
        matches,
      });
    }
  });

  // Sort by relevance score
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, limit);
}

function processStudySession(cards: Card[], sessionData: any) {
  // Process study session data for analytics
  const processed = {
    totalTime: sessionData.totalTime || 0,
    cardsStudied: sessionData.cardsStudied || 0,
    correctAnswers: sessionData.correctAnswers || 0,
    incorrectAnswers: sessionData.incorrectAnswers || 0,
    averageResponseTime: 0,
    difficultyAdjustments: [],
    recommendations: [] as string[],
  };

  if (sessionData.responses && Array.isArray(sessionData.responses)) {
    const responseTimes = sessionData.responses
      .map((r: any) => r.responseTime)
      .filter((t: number) => t > 0);

    if (responseTimes.length > 0) {
      processed.averageResponseTime =
        responseTimes.reduce((sum: number, time: number) => sum + time, 0) / responseTimes.length;
    }

    // Generate recommendations based on performance
    const accuracy =
      processed.correctAnswers / (processed.correctAnswers + processed.incorrectAnswers);

    if (accuracy < 0.6) {
      processed.recommendations.push('Consider reviewing cards more thoroughly before testing');
    }

    if (processed.averageResponseTime > 5000) {
      processed.recommendations.push('Try to improve response time with more practice');
    }

    if (processed.cardsStudied < cards.length * 0.8) {
      processed.recommendations.push('Complete more cards in your study session');
    }
  }

  return processed;
}

function generateQuizQuestions(cards: Card[], count: number, options: any = {}) {
  const questions = [];
  const usedIndices = new Set<number>();

  while (questions.length < count && usedIndices.size < cards.length) {
    const randomIndex = Math.floor(Math.random() * cards.length);

    if (usedIndices.has(randomIndex)) continue;
    usedIndices.add(randomIndex);

    const card = cards[randomIndex];
    const questionType = options.questionType || 'multiple-choice';

    if (questionType === 'multiple-choice') {
      // Generate multiple choice question
      const correctAnswer = card.side_b;
      const distractors: string[] = [];

      // Get random incorrect answers from other cards
      while (distractors.length < 3) {
        const randomCard = cards[Math.floor(Math.random() * cards.length)];
        if (randomCard.side_b !== correctAnswer && !distractors.includes(randomCard.side_b)) {
          distractors.push(randomCard.side_b);
        }
      }

      const allOptions = [correctAnswer, ...distractors];
      // Shuffle options
      for (let i = allOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allOptions[i], allOptions[j]] = [allOptions[j], allOptions[i]];
      }

      questions.push({
        cardIndex: randomIndex,
        question: card.side_a,
        options: allOptions,
        correctAnswer,
        type: 'multiple-choice',
      });
    } else if (questionType === 'fill-blank') {
      // Generate fill in the blank question
      questions.push({
        cardIndex: randomIndex,
        question: `Fill in the blank: ${card.side_a} → ______`,
        correctAnswer: card.side_b,
        type: 'fill-blank',
      });
    }
  }

  return questions;
}

// Message handler
self.onmessage = function (event: MessageEvent<WorkerMessage>) {
  const { id, type, payload } = event.data;

  try {
    let result: any;

    switch (type) {
      case 'ANALYZE_CARDS':
        result = analyzeCards(payload.cards);
        break;

      case 'SEARCH_CARDS':
        result = searchCards(payload.cards, payload.query, payload.limit);
        break;

      case 'PROCESS_STUDY_SESSION':
        result = processStudySession(payload.cards, payload.sessionData);
        break;

      case 'GENERATE_QUIZ':
        result = generateQuizQuestions(payload.cards, payload.count, payload.options);
        break;

      case 'BATCH_PROCESS':
        // Process multiple operations in batch
        result = payload.operations.map((op: any) => {
          switch (op.type) {
            case 'analyze':
              return analyzeCards(op.cards);
            case 'search':
              return searchCards(op.cards, op.query, op.limit);
            default:
              return null;
          }
        });
        break;

      default:
        throw new Error(`Unknown operation type: ${type}`);
    }

    // Send success response
    const response: WorkerResponse = {
      id,
      type: `${type}_SUCCESS`,
      result,
    };

    self.postMessage(response);
  } catch (error) {
    // Send error response
    const response: WorkerResponse = {
      id,
      type: `${type}_ERROR`,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    self.postMessage(response);
  }
};

// Handle worker termination
self.onclose = function () {
  console.log('Card processor worker terminated');
};

// Export types for main thread
export type { WorkerMessage, WorkerResponse, CardStatistics, SearchResult };
