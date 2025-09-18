import React, { useState, useEffect } from 'react';
import { usePerformanceMonitor } from '@/services/performanceMonitor';
import { useBundleAnalyzer } from '@/services/bundleAnalyzer';
import { useWorkerManager } from '@/services/workerManager';
import styles from './PerformanceDashboard.module.css';

interface PerformanceDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  isOpen,
  onClose,
}) => {
  const { metrics, custom, generateReport } = usePerformanceMonitor();
  const { analysis, getReport } = useBundleAnalyzer();
  const { isAvailable: workerAvailable, pendingTasks } = useWorkerManager();

  const [activeTab, setActiveTab] = useState<'overview' | 'vitals' | 'bundles' | 'workers'>('overview');
  const [performanceReport, setPerformanceReport] = useState<any>(null);
  const [bundleReport, setBundleReport] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      setPerformanceReport(generateReport());
      setBundleReport(getReport());
    }
  }, [isOpen, generateReport, getReport]);

  if (!isOpen) return null;

  const renderOverview = () => (
    <div className={styles.overviewGrid}>
      <div className={styles.scoreCard}>
        <h3>Performance Score</h3>
        <div className={`${styles.score} ${getScoreClass(performanceReport?.score || 0)}`}>
          {performanceReport?.score || 0}
        </div>
        <p>{performanceReport?.summary || 'No data'}</p>
      </div>

      <div className={styles.scoreCard}>
        <h3>Bundle Score</h3>
        <div className={`${styles.score} ${getScoreClass(bundleReport?.score || 0)}`}>
          {bundleReport?.score || 0}
        </div>
        <p>{bundleReport?.summary || 'No data'}</p>
      </div>

      <div className={styles.metricCard}>
        <h3>Core Web Vitals</h3>
        <div className={styles.metrics}>
          {metrics.fcp && (
            <div className={styles.metric}>
              <span>FCP</span>
              <span className={getMetricClass(metrics.fcp.rating)}>
                {metrics.fcp.value.toFixed(0)}ms
              </span>
            </div>
          )}
          {metrics.lcp && (
            <div className={styles.metric}>
              <span>LCP</span>
              <span className={getMetricClass(metrics.lcp.rating)}>
                {metrics.lcp.value.toFixed(0)}ms
              </span>
            </div>
          )}
          {metrics.cls && (
            <div className={styles.metric}>
              <span>CLS</span>
              <span className={getMetricClass(metrics.cls.rating)}>
                {metrics.cls.value.toFixed(3)}
              </span>
            </div>
          )}
          {metrics.fid && (
            <div className={styles.metric}>
              <span>FID</span>
              <span className={getMetricClass(metrics.fid.rating)}>
                {metrics.fid.value.toFixed(0)}ms
              </span>
            </div>
          )}
        </div>
      </div>

      <div className={styles.metricCard}>
        <h3>System Status</h3>
        <div className={styles.systemStatus}>
          <div className={styles.statusItem}>
            <span>Web Workers</span>
            <span className={workerAvailable ? styles.good : styles.poor}>
              {workerAvailable ? 'Available' : 'Unavailable'}
            </span>
          </div>
          <div className={styles.statusItem}>
            <span>Pending Tasks</span>
            <span>{pendingTasks}</span>
          </div>
          {custom.memoryUsage && (
            <div className={styles.statusItem}>
              <span>Memory</span>
              <span className={getMetricClass(custom.memoryUsage.rating)}>
                {custom.memoryUsage.value.toFixed(1)}MB
              </span>
            </div>
          )}
          {custom.bundleSize && (
            <div className={styles.statusItem}>
              <span>Bundle Size</span>
              <span>{(custom.bundleSize / 1024).toFixed(0)}KB</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderVitals = () => (
    <div className={styles.vitalsGrid}>
      <div className={styles.vitalsChart}>
        <h3>Performance Metrics Timeline</h3>
        <div className={styles.timeline}>
          {Object.entries(metrics).map(([key, metric]) => (
            metric && (
              <div key={key} className={styles.timelineItem}>
                <div className={styles.metricName}>{key.toUpperCase()}</div>
                <div className={styles.metricBar}>
                  <div
                    className={`${styles.metricFill} ${getMetricClass(metric.rating)}`}
                    style={{ width: `${Math.min(100, (metric.value / getMetricThreshold(key)) * 100)}%` }}
                  />
                </div>
                <div className={styles.metricValue}>
                  {metric.value.toFixed(key === 'cls' ? 3 : 0)}
                  {key === 'cls' ? '' : 'ms'}
                </div>
              </div>
            )
          ))}
        </div>
      </div>

      <div className={styles.recommendations}>
        <h3>Recommendations</h3>
        <ul>
          {performanceReport?.recommendations?.map((rec: string, index: number) => (
            <li key={index}>{rec}</li>
          ))}
        </ul>
      </div>
    </div>
  );

  const renderBundles = () => (
    <div className={styles.bundlesGrid}>
      <div className={styles.bundleOverview}>
        <h3>Bundle Analysis</h3>
        {analysis && (
          <div className={styles.bundleStats}>
            <div className={styles.stat}>
              <span>Total Size</span>
              <span>{(analysis.gzipSize / 1024).toFixed(0)}KB gzipped</span>
            </div>
            <div className={styles.stat}>
              <span>Chunks</span>
              <span>{analysis.chunkCount}</span>
            </div>
            <div className={styles.stat}>
              <span>Cache Hit Rate</span>
              <span>{analysis.cacheHitRate.toFixed(1)}%</span>
            </div>
            <div className={styles.stat}>
              <span>Avg Load Time</span>
              <span>{analysis.loadTimes.average.toFixed(0)}ms</span>
            </div>
          </div>
        )}
      </div>

      <div className={styles.chunksList}>
        <h3>Largest Chunks</h3>
        {analysis?.initialChunks.concat(analysis.asyncChunks).slice(0, 10).map((chunk, index) => (
          <div key={chunk.name} className={styles.chunkItem}>
            <span className={styles.chunkName}>{chunk.name}</span>
            <span className={styles.chunkSize}>{(chunk.size / 1024).toFixed(0)}KB</span>
            <span className={`${styles.chunkType} ${styles[chunk.type]}`}>{chunk.type}</span>
            {chunk.cached && <span className={styles.cached}>cached</span>}
          </div>
        ))}
      </div>

      <div className={styles.bundleRecommendations}>
        <h3>Bundle Recommendations</h3>
        <ul>
          {bundleReport?.suggestions?.map((suggestion: string, index: number) => (
            <li key={index}>{suggestion}</li>
          ))}
        </ul>
      </div>
    </div>
  );

  const renderWorkers = () => (
    <div className={styles.workersGrid}>
      <div className={styles.workerStatus}>
        <h3>Web Worker Status</h3>
        <div className={styles.workerInfo}>
          <div className={styles.statusBadge}>
            <span className={workerAvailable ? styles.online : styles.offline}>
              {workerAvailable ? 'Online' : 'Offline'}
            </span>
          </div>
          <div>Pending Tasks: {pendingTasks}</div>
        </div>
      </div>
    </div>
  );

  const getScoreClass = (score: number) => {
    if (score >= 90) return styles.excellent;
    if (score >= 75) return styles.good;
    if (score >= 60) return styles.fair;
    return styles.poor;
  };

  const getMetricClass = (rating: string) => {
    switch (rating) {
      case 'good': return styles.good;
      case 'needs-improvement': return styles.fair;
      case 'poor': return styles.poor;
      default: return styles.unknown;
    }
  };

  const getMetricThreshold = (metric: string) => {
    const thresholds: Record<string, number> = {
      fcp: 3000,
      lcp: 4000,
      fid: 300,
      cls: 0.25,
      ttfb: 1800,
    };
    return thresholds[metric] || 1000;
  };

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h2>Performance Dashboard</h2>
        <button className={styles.closeButton} onClick={onClose}>×</button>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'vitals' ? styles.active : ''}`}
          onClick={() => setActiveTab('vitals')}
        >
          Web Vitals
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'bundles' ? styles.active : ''}`}
          onClick={() => setActiveTab('bundles')}
        >
          Bundles
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'workers' ? styles.active : ''}`}
          onClick={() => setActiveTab('workers')}
        >
          Workers
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'vitals' && renderVitals()}
        {activeTab === 'bundles' && renderBundles()}
        {activeTab === 'workers' && renderWorkers()}
      </div>
    </div>
  );
};

export default PerformanceDashboard;