import { Card, MissedCard, SchedulerConfig, SchedulingAlgorithm } from '@/types';

/**
 * Smart Spaced Reinforcement Algorithm
 * Adaptive spacing based on performance with anti-clustering
 */
export class SmartSpacedScheduler implements SchedulingAlgorithm {
  name = 'Smart Spaced Reinforcement';
  description = 'Adaptive spacing based on performance with anti-clustering';

  schedule(
    missedCards: MissedCard[],
    upcomingCards: Card[],
    config: SchedulerConfig
  ): Card[] {
    // Calculate dynamic position for each missed card
    const positions = missedCards.map(card => ({
      card,
      position: this.calculatePosition(card, upcomingCards.length, config)
    }));

    // Sort by priority (higher difficulty first)
    positions.sort((a, b) => b.card.difficulty - a.card.difficulty);

    // Apply anti-clustering rules
    return this.mergeWithAntiClustering(positions, upcomingCards, config);
  }

  private calculatePosition(
    card: MissedCard,
    queueSize: number,
    config: SchedulerConfig
  ): number {
    const base = config.minSpacing;
    const range = config.maxSpacing - base;

    // Factors affecting position
    const difficultyFactor = 1 - (card.difficulty * config.difficultyWeight);
    const attemptFactor = Math.min(1, card.missCount / 3);
    const timeFactor = Math.min(1, (Date.now() - card.lastSeen) / 60000); // cap at 1 minute

    const spacing = base + Math.floor(
      range * difficultyFactor * (1 - attemptFactor) * Math.max(0.5, timeFactor)
    );
    const jitter = Math.floor(Math.random() * 3) - 1; // ±1 randomness

    return Math.max(base, Math.min(queueSize - 1, spacing + jitter));
  }

  private mergeWithAntiClustering(
    positions: Array<{ card: MissedCard; position: number }>,
    upcomingCards: Card[],
    config: SchedulerConfig
  ): Card[] {
    const result = [...upcomingCards];
    const insertedPositions = new Set<number>();

    // Track clustering
    let consecutiveMissed = 0;

    for (const { card, position } of positions) {
      let finalPosition = position;

      // Adjust for clustering limit
      if (consecutiveMissed >= config.clusterLimit) {
        finalPosition += config.clusterLimit;
        consecutiveMissed = 0;
      }

      // Ensure minimum spacing between missed cards
      while (insertedPositions.has(finalPosition)) {
        finalPosition += config.minSpacing;
      }

      // Convert MissedCard to Card for insertion
      const cardToInsert = this.convertMissedToCard(card, upcomingCards);
      if (cardToInsert) {
        result.splice(finalPosition, 0, cardToInsert);
        insertedPositions.add(finalPosition);
        consecutiveMissed++;
      }
    }

    // Ensure progress ratio is maintained
    const newCardsRatio = upcomingCards.length / result.length;
    if (newCardsRatio < config.progressRatio) {
      // Redistribute to maintain progress
      return this.redistributeForProgress(result, upcomingCards, config.progressRatio);
    }

    return result;
  }

  private convertMissedToCard(missedCard: MissedCard, originalCards: Card[]): Card | null {
    // Find the original card by index
    const originalCard = originalCards.find(c => c.idx === missedCard.cardIndex);
    if (originalCard) {
      return { ...originalCard };
    }

    // If not found in upcoming cards, create a placeholder
    // This should be replaced with actual card lookup from deck
    return {
      idx: missedCard.cardIndex,
      name: `Card ${missedCard.cardIndex}`,
      side_a: '',
      side_b: '',
      level: 1,
    } as Card;
  }

  private redistributeForProgress(
    cards: Card[],
    originalCards: Card[],
    targetRatio: number
  ): Card[] {
    // Calculate how many new cards we need
    const totalNeeded = cards.length;
    const newCardsNeeded = Math.floor(totalNeeded * targetRatio);
    const currentNewCards = originalCards.filter(c => cards.includes(c)).length;

    if (currentNewCards >= newCardsNeeded) {
      return cards;
    }

    // Move some missed cards further back
    const result: Card[] = [];
    const missedCards: Card[] = [];

    cards.forEach(card => {
      if (originalCards.includes(card)) {
        result.push(card);
      } else {
        missedCards.push(card);
      }
    });

    // Redistribute missed cards to maintain ratio
    const spacing = Math.floor((result.length + missedCards.length) / missedCards.length);
    let insertPosition = spacing;

    missedCards.forEach(card => {
      result.splice(Math.min(insertPosition, result.length), 0, card);
      insertPosition += spacing;
    });

    return result;
  }
}

/**
 * Leitner Box Algorithm
 * Classic spaced repetition with exponential intervals
 */
export class LeitnerBoxScheduler implements SchedulingAlgorithm {
  name = 'Leitner Box System';
  description = 'Classic spaced repetition with exponential intervals';

  private readonly boxes = [2, 4, 8, 16, 32]; // Review intervals per box

  schedule(
    missedCards: MissedCard[],
    upcomingCards: Card[],
    config: SchedulerConfig
  ): Card[] {
    const result = [...upcomingCards];

    // Group cards by their box level (based on miss count)
    const boxGroups = this.groupByBox(missedCards);

    // Insert cards based on their box interval
    boxGroups.forEach((cards, boxLevel) => {
      const interval = this.getBoxInterval(boxLevel, config);

      cards.forEach((missedCard, index) => {
        const position = Math.min(
          interval + (index * config.minSpacing),
          result.length
        );

        const cardToInsert = this.convertMissedToCard(missedCard, upcomingCards);
        if (cardToInsert) {
          result.splice(position, 0, cardToInsert);
        }
      });
    });

    return result;
  }

  private groupByBox(missedCards: MissedCard[]): Map<number, MissedCard[]> {
    const groups = new Map<number, MissedCard[]>();

    missedCards.forEach(card => {
      // Move down boxes based on miss count
      const boxLevel = Math.max(0, 5 - card.missCount);

      if (!groups.has(boxLevel)) {
        groups.set(boxLevel, []);
      }
      groups.get(boxLevel)!.push(card);
    });

    return groups;
  }

  private getBoxInterval(boxLevel: number, config: SchedulerConfig): number {
    const baseInterval = this.boxes[Math.min(boxLevel, this.boxes.length - 1)];

    // Adjust based on aggressiveness setting
    const aggressivenessMultiplier = {
      gentle: 1.5,
      balanced: 1.0,
      intensive: 0.5
    }[config.aggressiveness];

    return Math.round(baseInterval * aggressivenessMultiplier);
  }

  private convertMissedToCard(missedCard: MissedCard, originalCards: Card[]): Card | null {
    // Find the original card by index
    const originalCard = originalCards.find(c => c.idx === missedCard.cardIndex);
    if (originalCard) {
      return { ...originalCard };
    }

    // Fallback
    return {
      idx: missedCard.cardIndex,
      name: `Card ${missedCard.cardIndex}`,
      side_a: '',
      side_b: '',
      level: 1,
    } as Card;
  }
}

/**
 * Factory for creating schedulers
 */
export class CardSchedulerFactory {
  private static schedulers = new Map<string, SchedulingAlgorithm>([
    ['smart_spaced', new SmartSpacedScheduler()],
    ['leitner_box', new LeitnerBoxScheduler()],
  ]);

  static getScheduler(algorithm: string): SchedulingAlgorithm {
    const scheduler = this.schedulers.get(algorithm);
    if (!scheduler) {
      throw new Error(`Unknown scheduling algorithm: ${algorithm}`);
    }
    return scheduler;
  }

  static registerScheduler(key: string, scheduler: SchedulingAlgorithm): void {
    this.schedulers.set(key, scheduler);
  }

  static getAvailableAlgorithms(): Array<{ key: string; name: string; description: string }> {
    return Array.from(this.schedulers.entries()).map(([key, scheduler]) => ({
      key,
      name: scheduler.name,
      description: scheduler.description,
    }));
  }
}