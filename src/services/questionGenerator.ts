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

    cards.forEach((card, index) => {
      if (options.excludeCards?.has(index)) {
        return;
      }

      const questionType = this.selectQuestionType(options.questionTypes);

      if (questionType === 'multiple_choice') {
        questions.push(this.generateMultipleChoice(
          card,
          cards,
          { front: options.frontSides, back: options.backSides },
          index
        ));
      } else {
        questions.push(this.generateFreeText(
          card,
          { front: options.frontSides, back: options.backSides },
          index
        ));
      }

      usedCardIndices.add(index);
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
  static generateFreeText(
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

      answerSides.forEach(side => {
        const value = (card as any)[side];
        if (value && value !== correctAnswer && !potentialDistractors.includes(value)) {
          potentialDistractors.push(value);
        }
      });
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
  private static selectQuestionType(types: ('multiple_choice' | 'free_text')[]): 'multiple_choice' | 'free_text' {
    if (types.length === 1) {
      return types[0];
    }

    // Default to 70% multiple choice, 30% free text
    return Math.random() < 0.7 ? 'multiple_choice' : 'free_text';
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