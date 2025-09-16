import { Card, Question, QuestionGeneratorOptions } from '@/types';

export class QuestionGenerator {
  /**
   * Generate questions from a set of cards based on provided options
   */
  static generateQuestions(
    cards: Card[],
    options: QuestionGeneratorOptions
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
          cards,
          { front: options.frontSides, back: options.backSides },
          card.idx  // Use card's original index
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
    cardIndex: number
  ): Question {
    const questionText = this.buildQuestionText(card, sides.front);
    const correctAnswer = this.buildAnswerText(card, sides.back);
    const distractors = this.generateDistractors(correctAnswer, allCards, sides.back, cardIndex);

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
   */
  static generateDistractors(
    correctAnswer: string,
    allCards: Card[],
    answerSides: string[],
    excludeIndex: number
  ): string[] {
    const distractors: string[] = [];
    const potentialDistractors: string[] = [];

    // Collect potential distractors from other cards
    allCards.forEach((card, index) => {
      if (index === excludeIndex) return;

      // Build the answer text the same way as the correct answer
      // This ensures all options (correct and distractors) use the same format
      const distractor = this.buildAnswerText(card, answerSides);

      if (distractor && distractor !== correctAnswer && !potentialDistractors.includes(distractor)) {
        potentialDistractors.push(distractor);
      }
    });

    // Select 3 distractors, prioritizing semantic similarity
    const similarityScores = potentialDistractors.map(distractor => ({
      text: distractor,
      similarity: this.calculateSimilarity(correctAnswer, distractor),
    }));

    // Sort by similarity to get a mix of similar and different options
    similarityScores.sort((a, b) => b.similarity - a.similarity);

    // Take 1 similar, 1 medium, 1 different (if available)
    if (similarityScores.length > 0) {
      const indices = [
        0, // Most similar
        Math.floor(similarityScores.length / 2), // Medium similarity
        similarityScores.length - 1, // Least similar
      ];

      indices.forEach(i => {
        if (i < similarityScores.length && distractors.length < 3) {
          distractors.push(similarityScores[i].text);
        }
      });
    }

    // Fill remaining slots with random options if needed
    while (distractors.length < 3 && potentialDistractors.length > distractors.length) {
      const randomDistractor = potentialDistractors[
        Math.floor(Math.random() * potentialDistractors.length)
      ];
      if (!distractors.includes(randomDistractor)) {
        distractors.push(randomDistractor);
      }
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