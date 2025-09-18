#!/usr/bin/env node

/**
 * Bundle analyzer script for automated bundle size monitoring
 * Generates reports and detects regressions
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  distDir: 'dist',
  outputFile: 'bundle-analysis.json',
  thresholds: {
    maxBundleSize: 200 * 1024, // 200KB gzipped
    maxChunkSize: 100 * 1024,  // 100KB per chunk
    maxAssets: 50,             // Maximum number of assets
  },
  reportFormat: process.env.REPORT_FORMAT || 'json', // json, html, console
};

class BundleAnalyzer {
  constructor() {
    this.distPath = path.resolve(CONFIG.distDir);
    this.results = {
      timestamp: new Date().toISOString(),
      totalSize: 0,
      gzipSize: 0,
      assetCount: 0,
      chunks: [],
      assets: [],
      recommendations: [],
      thresholds: CONFIG.thresholds,
      passed: true,
    };
  }

  async analyze() {
    console.log('🔍 Analyzing bundle...');

    if (!fs.existsSync(this.distPath)) {
      throw new Error(`Distribution directory not found: ${this.distPath}`);
    }

    await this.analyzeAssets();
    await this.generateRecommendations();
    await this.checkThresholds();

    return this.results;
  }

  async analyzeAssets() {
    const files = this.getAllFiles(this.distPath);

    for (const file of files) {
      const stat = fs.statSync(file);
      const relativePath = path.relative(this.distPath, file);
      const ext = path.extname(file);

      if (this.isAsset(ext)) {
        const asset = {
          name: relativePath,
          path: file,
          size: stat.size,
          gzipSize: await this.estimateGzipSize(file),
          type: this.getAssetType(ext),
          isChunk: this.isJSChunk(relativePath),
        };

        this.results.assets.push(asset);
        this.results.totalSize += asset.size;
        this.results.gzipSize += asset.gzipSize;

        if (asset.isChunk) {
          this.results.chunks.push(asset);
        }
      }
    }

    this.results.assetCount = this.results.assets.length;

    // Sort assets by size
    this.results.assets.sort((a, b) => b.size - a.size);
    this.results.chunks.sort((a, b) => b.size - a.size);
  }

  getAllFiles(dir) {
    let files = [];

    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        files = files.concat(this.getAllFiles(fullPath));
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  isAsset(ext) {
    return ['.js', '.css', '.html', '.png', '.jpg', '.jpeg', '.svg', '.webp'].includes(ext);
  }

  getAssetType(ext) {
    const types = {
      '.js': 'javascript',
      '.css': 'stylesheet',
      '.html': 'html',
      '.png': 'image',
      '.jpg': 'image',
      '.jpeg': 'image',
      '.svg': 'image',
      '.webp': 'image',
    };

    return types[ext] || 'other';
  }

  isJSChunk(filename) {
    return filename.includes('.js') && !filename.includes('workbox');
  }

  async estimateGzipSize(file) {
    try {
      // Use gzip command if available
      if (this.commandExists('gzip')) {
        const gzipped = execSync(`gzip -c "${file}" | wc -c`, { encoding: 'utf8' });
        return parseInt(gzipped.trim());
      }

      // Fallback: estimate as 30% of original size
      const stat = fs.statSync(file);
      return Math.round(stat.size * 0.3);
    } catch (error) {
      console.warn(`Warning: Could not estimate gzip size for ${file}`);
      const stat = fs.statSync(file);
      return Math.round(stat.size * 0.3);
    }
  }

  commandExists(command) {
    try {
      execSync(`which ${command}`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  async generateRecommendations() {
    const recs = this.results.recommendations;

    // Bundle size recommendations
    if (this.results.gzipSize > CONFIG.thresholds.maxBundleSize) {
      recs.push({
        type: 'size',
        severity: 'high',
        message: `Total bundle size (${this.formatSize(this.results.gzipSize)}) exceeds threshold (${this.formatSize(CONFIG.thresholds.maxBundleSize)})`,
        suggestion: 'Implement code splitting and lazy loading',
      });
    }

    // Large chunk analysis
    const largeChunks = this.results.chunks.filter(
      chunk => chunk.gzipSize > CONFIG.thresholds.maxChunkSize
    );

    if (largeChunks.length > 0) {
      recs.push({
        type: 'chunks',
        severity: 'medium',
        message: `${largeChunks.length} chunks exceed size threshold`,
        suggestion: 'Split large chunks into smaller modules',
        chunks: largeChunks.map(c => c.name),
      });
    }

    // Asset count analysis
    if (this.results.assetCount > CONFIG.thresholds.maxAssets) {
      recs.push({
        type: 'assets',
        severity: 'low',
        message: `High number of assets (${this.results.assetCount})`,
        suggestion: 'Consider asset optimization and bundling',
      });
    }

    // Performance recommendations
    const jsAssets = this.results.assets.filter(a => a.type === 'javascript');
    const cssAssets = this.results.assets.filter(a => a.type === 'stylesheet');

    if (jsAssets.length > 10) {
      recs.push({
        type: 'performance',
        severity: 'medium',
        message: 'Multiple JavaScript files may impact loading performance',
        suggestion: 'Consider bundling related modules',
      });
    }

    if (cssAssets.length > 5) {
      recs.push({
        type: 'performance',
        severity: 'low',
        message: 'Multiple CSS files detected',
        suggestion: 'Consider CSS bundling for better performance',
      });
    }
  }

  async checkThresholds() {
    let passed = true;

    // Check total bundle size
    if (this.results.gzipSize > CONFIG.thresholds.maxBundleSize) {
      console.error(`❌ Bundle size threshold exceeded: ${this.formatSize(this.results.gzipSize)} > ${this.formatSize(CONFIG.thresholds.maxBundleSize)}`);
      passed = false;
    }

    // Check individual chunks
    const largeChunks = this.results.chunks.filter(
      chunk => chunk.gzipSize > CONFIG.thresholds.maxChunkSize
    );

    if (largeChunks.length > 0) {
      console.error(`❌ ${largeChunks.length} chunks exceed size threshold`);
      largeChunks.forEach(chunk => {
        console.error(`  - ${chunk.name}: ${this.formatSize(chunk.gzipSize)}`);
      });
      passed = false;
    }

    this.results.passed = passed;

    if (passed) {
      console.log('✅ All bundle size thresholds passed');
    }
  }

  formatSize(bytes) {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  generateReport() {
    switch (CONFIG.reportFormat) {
      case 'html':
        return this.generateHTMLReport();
      case 'console':
        return this.generateConsoleReport();
      case 'json':
      default:
        return this.generateJSONReport();
    }
  }

  generateJSONReport() {
    const output = JSON.stringify(this.results, null, 2);
    fs.writeFileSync(CONFIG.outputFile, output);
    console.log(`📊 Bundle analysis saved to ${CONFIG.outputFile}`);
    return output;
  }

  generateConsoleReport() {
    console.log('\n📊 Bundle Analysis Report');
    console.log('='.repeat(50));
    console.log(`Total Size: ${this.formatSize(this.results.totalSize)} (${this.formatSize(this.results.gzipSize)} gzipped)`);
    console.log(`Assets: ${this.results.assetCount}`);
    console.log(`Chunks: ${this.results.chunks.length}`);

    console.log('\n🏆 Largest Assets:');
    this.results.assets.slice(0, 10).forEach((asset, index) => {
      console.log(`${index + 1}. ${asset.name} - ${this.formatSize(asset.gzipSize)}`);
    });

    if (this.results.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      this.results.recommendations.forEach((rec, index) => {
        const icon = rec.severity === 'high' ? '🔴' : rec.severity === 'medium' ? '🟡' : '🟢';
        console.log(`${icon} ${rec.message}`);
        console.log(`   → ${rec.suggestion}`);
      });
    }

    return 'Console report generated';
  }

  generateHTMLReport() {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Bundle Analysis Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: white; border-radius: 4px; }
        .assets { margin-top: 20px; }
        .asset { padding: 8px; border-bottom: 1px solid #eee; }
        .recommendations { margin-top: 20px; }
        .recommendation { padding: 10px; margin: 8px 0; border-left: 4px solid #007bff; background: #f8f9fa; }
        .severity-high { border-left-color: #dc3545; }
        .severity-medium { border-left-color: #ffc107; }
        .severity-low { border-left-color: #28a745; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Bundle Analysis Report</h1>
        <p>Generated: ${this.results.timestamp}</p>

        <div class="metric">
            <strong>Total Size</strong><br>
            ${this.formatSize(this.results.totalSize)} (${this.formatSize(this.results.gzipSize)} gzipped)
        </div>

        <div class="metric">
            <strong>Assets</strong><br>
            ${this.results.assetCount}
        </div>

        <div class="metric">
            <strong>Chunks</strong><br>
            ${this.results.chunks.length}
        </div>
    </div>

    <div class="assets">
        <h2>Largest Assets</h2>
        ${this.results.assets.slice(0, 15).map(asset => `
            <div class="asset">
                <strong>${asset.name}</strong> - ${this.formatSize(asset.gzipSize)} (${asset.type})
            </div>
        `).join('')}
    </div>

    ${this.results.recommendations.length > 0 ? `
    <div class="recommendations">
        <h2>Recommendations</h2>
        ${this.results.recommendations.map(rec => `
            <div class="recommendation severity-${rec.severity}">
                <strong>${rec.message}</strong><br>
                <em>${rec.suggestion}</em>
            </div>
        `).join('')}
    </div>
    ` : ''}
</body>
</html>`;

    const htmlFile = CONFIG.outputFile.replace('.json', '.html');
    fs.writeFileSync(htmlFile, html);
    console.log(`📊 HTML report saved to ${htmlFile}`);
    return html;
  }
}

// CLI execution
async function main() {
  try {
    const analyzer = new BundleAnalyzer();
    const results = await analyzer.analyze();
    analyzer.generateReport();

    // Exit with error code if thresholds failed
    if (!results.passed && process.env.CI) {
      console.error('❌ Bundle analysis failed - exiting with error code');
      process.exit(1);
    }

    console.log('✅ Bundle analysis completed successfully');
  } catch (error) {
    console.error('❌ Bundle analysis failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { BundleAnalyzer, CONFIG };