import { Card, Question, QuestionGeneratorOptions } from '@/types';

export class QuestionGenerator {
  /**
   * Generate questions from a set of cards based on provided options
   */
  static generateQuestions(
    cards: Card[],
    options: QuestionGeneratorOptions,
    masteredCardIndices?: number[],
    allDeckCards?: Card[]
  ): Question[] {
    const questions: Question[] = [];
    const usedCardIndices = new Set<number>();

    cards.forEach((card) => {
      if (options.excludeCards?.has(card.idx)) {
        return;
      }

      // Generate initial questions as multiple choice primarily
      // Free text will be added dynamically after correct MC answers
      const questionType = options.forceMultipleChoice ? 'multiple_choice' :
                          this.selectQuestionType(options.questionTypes, options.questionTypeMix);

      if (questionType === 'multiple_choice') {
        questions.push(this.generateMultipleChoice(
          card,
          allDeckCards || cards,  // Use all deck cards if available, otherwise use round cards
          { front: options.frontSides, back: options.backSides },
          card.idx,  // Use card's original index
          masteredCardIndices
        ));
      } else {
        questions.push(this.generateFreeText(
          card,
          { front: options.frontSides, back: options.backSides },
          card.idx  // Use card's original index
        ));
      }

      usedCardIndices.add(card.idx);
    });

    return this.shuffleQuestions(questions, options.difficulty);
  }

  /**
   * Generate a multiple choice question from a card
   */
  static generateMultipleChoice(
    card: Card,
    allCards: Card[],
    sides: { front: string[]; back: string[] },
    cardIndex: number,
    masteredCardIndices?: number[]
  ): Question {
    const questionText = this.buildQuestionText(card, sides.front);
    const correctAnswer = this.buildAnswerText(card, sides.back);
    const distractors = this.generateDistractors(correctAnswer, allCards, sides.back, cardIndex, masteredCardIndices);

    return {
      id: `mc_${card.idx}_${Date.now()}`,
      type: 'multiple_choice',
      cardIndex,
      questionText,
      questionSides: sides.front,
      correctAnswer,
      options: this.shuffleOptions([correctAnswer, ...distractors]),
      difficulty: card.level || 1,
    };
  }

  /**
   * Generate a free text question from a card
   */
  public static generateFreeText(
    card: Card,
    sides: { front: string[]; back: string[] },
    cardIndex: number
  ): Question {
    const questionText = this.buildQuestionText(card, sides.front);
    const correctAnswer = this.buildAnswerText(card, sides.back);
    const acceptedAnswers = this.generateAcceptedAnswers(correctAnswer);

    return {
      id: `ft_${card.idx}_${Date.now()}`,
      type: 'free_text',
      cardIndex,
      questionText,
      questionSides: sides.front,
      correctAnswer,
      acceptedAnswers,
      difficulty: card.level || 1,
    };
  }

  /**
   * Generate distractor options for multiple choice questions
   * Prioritizes non-mastered cards as distractors, falls back to mastered cards if needed
   */
  static generateDistractors(
    correctAnswer: string,
    allCards: Card[],
    answerSides: string[],
    excludeIndex: number,
    masteredCardIndices?: number[]
  ): string[] {
    const distractors: string[] = [];
    const nonMasteredDistractors: string[] = [];
    const masteredDistractors: string[] = [];
    const masteredSet = new Set(masteredCardIndices || []);

    // Collect potential distractors from other cards, separating by mastery status
    allCards.forEach((card) => {
      if (card.idx === excludeIndex) return;

      // Build the answer text the same way as the correct answer
      // This ensures all options (correct and distractors) use the same format
      const distractor = this.buildAnswerText(card, answerSides);

      if (distractor && distractor !== correctAnswer) {
        if (masteredSet.has(card.idx)) {
          if (!masteredDistractors.includes(distractor)) {
            masteredDistractors.push(distractor);
          }
        } else {
          if (!nonMasteredDistractors.includes(distractor)) {
            nonMasteredDistractors.push(distractor);
          }
        }
      }
    });

    // Debug logging
    console.log('Distractor generation debug:', {
      correctAnswer,
      excludeIndex,
      totalCardsProvided: allCards.length,
      allCardIndices: allCards.map(c => c.idx),
      masteredCardIndices: masteredCardIndices?.slice(0, 10),
      nonMasteredCount: nonMasteredDistractors.length,
      masteredCount: masteredDistractors.length,
      nonMasteredDistractors: nonMasteredDistractors.slice(0, 5),
      masteredDistractors: masteredDistractors.slice(0, 5),
      // Check which cards are in both sets
      cardsInBothSets: allCards.filter(c => masteredCardIndices?.includes(c.idx)).map(c => c.idx)
    });

    // First, try to use only non-mastered distractors
    const primaryPool = nonMasteredDistractors.length > 0 ? nonMasteredDistractors : [];
    const fallbackPool = masteredDistractors;

    // Helper function to select distractors from a pool
    const selectFromPool = (pool: string[], needed: number): string[] => {
      const selected: string[] = [];

      if (pool.length === 0) return selected;

      // Calculate similarity scores for the pool
      const scores = pool.map(distractor => ({
        text: distractor,
        similarity: this.calculateSimilarity(correctAnswer, distractor),
      }));

      // Sort by similarity
      scores.sort((a, b) => b.similarity - a.similarity);

      // Try to get a mix of similar and different options
      if (scores.length >= needed) {
        const indices = [
          0, // Most similar
          Math.floor(scores.length / 2), // Medium similarity
          scores.length - 1, // Least similar
        ];

        indices.forEach(i => {
          if (i < scores.length && selected.length < needed) {
            const text = scores[i].text;
            if (!selected.includes(text)) {
              selected.push(text);
            }
          }
        });
      }

      // Fill remaining slots randomly from the pool
      while (selected.length < needed && selected.length < pool.length) {
        const randomDistractor = pool[Math.floor(Math.random() * pool.length)];
        if (!selected.includes(randomDistractor)) {
          selected.push(randomDistractor);
        }
      }

      return selected;
    };

    // Try to get 3 distractors from non-mastered cards first
    distractors.push(...selectFromPool(primaryPool, 3));

    // If we don't have enough, supplement with mastered cards
    if (distractors.length < 3) {
      const remaining = 3 - distractors.length;
      distractors.push(...selectFromPool(fallbackPool, remaining));
    }

    // If still not enough distractors, generate generic ones
    while (distractors.length < 3) {
      distractors.push(`Option ${distractors.length + 2}`);
    }

    return distractors.slice(0, 3);
  }

  /**
   * Calculate semantic similarity between two strings
   */
  private static calculateSimilarity(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);

    const set1 = new Set(words1);
    const set2 = new Set(words2);

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    // Jaccard similarity
    return intersection.size / union.size;
  }

  /**
   * Build question text from card sides
   */
  private static buildQuestionText(card: Card, frontSides: string[]): string {
    const parts: string[] = [];

    frontSides.forEach(side => {
      const value = (card as any)[side];
      if (value) {
        parts.push(value);
      }
    });

    return parts.join(' - ') || 'Question';
  }

  /**
   * Build answer text from card sides
   */
  private static buildAnswerText(card: Card, backSides: string[]): string {
    const parts: string[] = [];

    backSides.forEach(side => {
      const value = (card as any)[side];
      if (value) {
        parts.push(value);
      }
    });

    return parts.join(' - ') || 'Answer';
  }

  /**
   * Generate accepted answer variations for free text questions
   */
  private static generateAcceptedAnswers(correctAnswer: string): string[] {
    const variations: string[] = [correctAnswer];

    // Add lowercase version
    variations.push(correctAnswer.toLowerCase());

    // Add uppercase version
    variations.push(correctAnswer.toUpperCase());

    // Add version without punctuation
    const noPunctuation = correctAnswer.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
    if (noPunctuation !== correctAnswer) {
      variations.push(noPunctuation);
      variations.push(noPunctuation.toLowerCase());
    }

    // Add version with trimmed whitespace
    const trimmed = correctAnswer.trim();
    if (trimmed !== correctAnswer) {
      variations.push(trimmed);
    }

    // Remove duplicates
    return [...new Set(variations)];
  }

  /**
   * Select a question type based on configured probabilities
   */
  private static selectQuestionType(
    types: ('multiple_choice' | 'free_text')[],
    mix?: 'auto' | 'multiple_choice' | 'free_text' | 'mixed'
  ): 'multiple_choice' | 'free_text' {
    // Handle explicit type selection
    if (mix === 'multiple_choice') return 'multiple_choice';
    if (mix === 'free_text') return 'free_text';

    // If only one type is available, use it
    if (types.length === 1) {
      return types[0];
    }

    // Handle probability-based selection
    let mcProbability = 0.8; // Default 80% MC, 20% text for 'auto'

    if (mix === 'mixed') {
      mcProbability = 0.5; // 50/50 split for 'mixed'
    }

    return Math.random() < mcProbability ? 'multiple_choice' : 'free_text';
  }

  /**
   * Shuffle questions based on difficulty
   */
  private static shuffleQuestions(questions: Question[], difficulty: number): Question[] {
    // Sort by difficulty first
    const sorted = [...questions].sort((a, b) => a.difficulty - b.difficulty);

    // Apply some randomization based on difficulty setting
    const shuffled = [...sorted];
    const shuffleIntensity = 1 - (difficulty * 0.2); // Higher difficulty = less shuffle

    for (let i = shuffled.length - 1; i > 0; i--) {
      if (Math.random() < shuffleIntensity) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
    }

    return shuffled;
  }

  /**
   * Shuffle options array
   */
  private static shuffleOptions(options: string[]): string[] {
    const shuffled = [...options];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}