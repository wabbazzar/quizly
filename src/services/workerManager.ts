/**
 * Web Worker manager for handling heavy computations
 * Provides a clean API for worker communication
 */

import React from 'react';
import type { Card } from '@/types';
import type { WorkerMessage, WorkerResponse, CardStatistics, SearchResult } from '@/workers/cardProcessor.worker';

interface WorkerTask {
  id: string;
  resolve: (result: any) => void;
  reject: (error: Error) => void;
  timeout?: NodeJS.Timeout;
}

class WorkerManager {
  private worker: Worker | null = null;
  private pendingTasks = new Map<string, WorkerTask>();
  private isInitialized = false;
  private taskCounter = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initWorker();
    }
  }

  private initWorker(): void {
    try {
      // Create worker from bundled file
      this.worker = new Worker(
        new URL('@/workers/cardProcessor.worker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      this.worker.onerror = this.handleWorkerError.bind(this);

      this.isInitialized = true;
      console.log('Worker manager initialized');
    } catch (error) {
      console.warn('Failed to initialize worker:', error);
      this.isInitialized = false;
    }
  }

  private handleWorkerMessage(event: MessageEvent<WorkerResponse>): void {
    const { id, type, result, error } = event.data;
    const task = this.pendingTasks.get(id);

    if (!task) {
      console.warn('Received response for unknown task:', id);
      return;
    }

    // Clear timeout
    if (task.timeout) {
      clearTimeout(task.timeout);
    }

    // Remove from pending tasks
    this.pendingTasks.delete(id);

    if (type.endsWith('_ERROR') || error) {
      task.reject(new Error(error || 'Worker operation failed'));
    } else {
      task.resolve(result);
    }
  }

  private handleWorkerError(error: ErrorEvent): void {
    console.error('Worker error:', error);

    // Reject all pending tasks
    this.pendingTasks.forEach(task => {
      if (task.timeout) {
        clearTimeout(task.timeout);
      }
      task.reject(new Error('Worker error occurred'));
    });

    this.pendingTasks.clear();

    // Attempt to reinitialize worker
    setTimeout(() => {
      this.initWorker();
    }, 1000);
  }

  private generateTaskId(): string {
    return `task_${++this.taskCounter}_${Date.now()}`;
  }

  private sendMessage<T>(type: string, payload: any, timeoutMs = 30000): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.isInitialized || !this.worker) {
        reject(new Error('Worker not available'));
        return;
      }

      const id = this.generateTaskId();

      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingTasks.delete(id);
        reject(new Error(`Worker task timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      // Store task
      this.pendingTasks.set(id, {
        id,
        resolve,
        reject,
        timeout,
      });

      // Send message to worker
      const message: WorkerMessage = {
        id,
        type,
        payload,
      };

      this.worker.postMessage(message);
    });
  }

  // Public API methods

  /**
   * Analyze card statistics
   */
  public async analyzeCards(cards: Card[]): Promise<CardStatistics> {
    if (cards.length === 0) {
      return {
        totalCards: 0,
        averageCardLength: 0,
        longestCard: '',
        shortestCard: '',
        difficultyDistribution: {},
        categoryDistribution: {},
      };
    }

    return this.sendMessage<CardStatistics>('ANALYZE_CARDS', { cards });
  }

  /**
   * Search cards with relevance scoring
   */
  public async searchCards(
    cards: Card[],
    query: string,
    limit = 50
  ): Promise<SearchResult[]> {
    if (!query.trim() || cards.length === 0) {
      return [];
    }

    return this.sendMessage<SearchResult[]>('SEARCH_CARDS', {
      cards,
      query,
      limit,
    });
  }

  /**
   * Process study session data
   */
  public async processStudySession(cards: Card[], sessionData: any): Promise<any> {
    return this.sendMessage('PROCESS_STUDY_SESSION', {
      cards,
      sessionData,
    });
  }

  /**
   * Generate quiz questions
   */
  public async generateQuiz(
    cards: Card[],
    count: number,
    options: any = {}
  ): Promise<any[]> {
    return this.sendMessage('GENERATE_QUIZ', {
      cards,
      count,
      options,
    });
  }

  /**
   * Process multiple operations in batch
   */
  public async batchProcess(operations: Array<{
    type: string;
    cards: Card[];
    query?: string;
    limit?: number;
  }>): Promise<any[]> {
    return this.sendMessage('BATCH_PROCESS', { operations });
  }

  /**
   * Check if worker is available
   */
  public isAvailable(): boolean {
    return this.isInitialized && this.worker !== null;
  }

  /**
   * Get number of pending tasks
   */
  public getPendingTaskCount(): number {
    return this.pendingTasks.size;
  }

  /**
   * Cancel all pending tasks
   */
  public cancelAllTasks(): void {
    this.pendingTasks.forEach(task => {
      if (task.timeout) {
        clearTimeout(task.timeout);
      }
      task.reject(new Error('Task cancelled'));
    });

    this.pendingTasks.clear();
  }

  /**
   * Terminate worker and cleanup
   */
  public destroy(): void {
    this.cancelAllTasks();

    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    this.isInitialized = false;
  }
}

// Singleton instance
export const workerManager = new WorkerManager();

// React hook for worker operations
export function useWorkerManager() {
  const [isAvailable, setIsAvailable] = React.useState(workerManager.isAvailable());
  const [pendingTasks, setPendingTasks] = React.useState(0);

  React.useEffect(() => {
    // Periodically check worker status
    const interval = setInterval(() => {
      setIsAvailable(workerManager.isAvailable());
      setPendingTasks(workerManager.getPendingTaskCount());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    isAvailable,
    pendingTasks,
    analyzeCards: workerManager.analyzeCards.bind(workerManager),
    searchCards: workerManager.searchCards.bind(workerManager),
    processStudySession: workerManager.processStudySession.bind(workerManager),
    generateQuiz: workerManager.generateQuiz.bind(workerManager),
    batchProcess: workerManager.batchProcess.bind(workerManager),
    cancelAllTasks: workerManager.cancelAllTasks.bind(workerManager),
  };
}

// Fallback implementations for when worker is not available
class FallbackProcessor {
  static analyzeCards(cards: Card[]): CardStatistics {
    // Simple implementation without worker
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
    cards.forEach(card => {
      const allText = [card.side_a, card.side_b].filter(Boolean).join(' ');
      totalLength += allText.length;

      // Category tracking removed - not in Card type
    });

    stats.averageCardLength = totalLength / cards.length;
    stats.longestCard = cards[0]?.side_a || '';
    stats.shortestCard = cards[0]?.side_a || '';

    return stats;
  }

  static searchCards(cards: Card[], query: string, limit = 50): SearchResult[] {
    if (!query.trim()) return [];

    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    cards.forEach((card, index) => {
      const searchText = [card.side_a, card.side_b].filter(Boolean).join(' ').toLowerCase();

      if (searchText.includes(lowerQuery)) {
        results.push({
          cardIndex: index,
          card,
          score: 1,
          matches: [{
            field: 'side_a',
            start: 0,
            end: query.length,
          }],
        });
      }
    });

    return results.slice(0, limit);
  }
}

// Safe worker operations with fallback
export const safeWorkerManager = {
  async analyzeCards(cards: Card[]): Promise<CardStatistics> {
    try {
      if (workerManager.isAvailable()) {
        return await workerManager.analyzeCards(cards);
      }
    } catch (error) {
      console.warn('Worker analysis failed, using fallback:', error);
    }

    return FallbackProcessor.analyzeCards(cards);
  },

  async searchCards(cards: Card[], query: string, limit = 50): Promise<SearchResult[]> {
    try {
      if (workerManager.isAvailable()) {
        return await workerManager.searchCards(cards, query, limit);
      }
    } catch (error) {
      console.warn('Worker search failed, using fallback:', error);
    }

    return FallbackProcessor.searchCards(cards, query, limit);
  },
};

export default workerManager;