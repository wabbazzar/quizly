#!/usr/bin/env node

/**
 * Build Verification Script
 * Validates build output for different deployment targets
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const distPath = path.resolve(projectRoot, 'dist');

class BuildVerifier {
  constructor(buildType = 'production') {
    this.buildType = buildType;
    this.errors = [];
    this.warnings = [];
    this.checks = [];
  }

  /**
   * Log a check result
   * @param {string} check - Check description
   * @param {boolean} passed - Whether check passed
   * @param {string} message - Additional message
   */
  logCheck(check, passed, message = '') {
    const status = passed ? '✅' : '❌';
    const logMessage = `${status} ${check}${message ? ` - ${message}` : ''}`;

    console.log(logMessage);

    this.checks.push({
      check,
      passed,
      message
    });

    if (!passed) {
      this.errors.push(`${check}: ${message}`);
    }
  }

  /**
   * Log a warning
   * @param {string} warning - Warning message
   */
  logWarning(warning) {
    console.log(`⚠️  ${warning}`);
    this.warnings.push(warning);
  }

  /**
   * Check if dist directory exists
   */
  checkDistExists() {
    const exists = fs.existsSync(distPath);
    this.logCheck(
      'Build output directory exists',
      exists,
      exists ? `Found at ${distPath}` : `Missing: ${distPath}`
    );
    return exists;
  }

  /**
   * Check for essential files
   */
  checkEssentialFiles() {
    const essentialFiles = [
      'index.html',
      'assets',
      'data'
    ];

    let allFound = true;

    for (const file of essentialFiles) {
      const filePath = path.join(distPath, file);
      const exists = fs.existsSync(filePath);

      this.logCheck(
        `Essential file/directory: ${file}`,
        exists,
        exists ? 'Found' : 'Missing'
      );

      if (!exists) {
        allFound = false;
      }
    }

    return allFound;
  }

  /**
   * Check HTML files
   */
  checkHtmlFiles() {
    const htmlFiles = fs.readdirSync(distPath)
      .filter(file => file.endsWith('.html'));

    if (htmlFiles.length === 0) {
      this.logCheck('HTML files present', false, 'No HTML files found');
      return false;
    }

    let allValid = true;

    for (const htmlFile of htmlFiles) {
      const htmlPath = path.join(distPath, htmlFile);
      const content = fs.readFileSync(htmlPath, 'utf8');

      // Check for basic HTML structure
      const hasDoctype = content.includes('<!DOCTYPE');
      const hasHtml = content.includes('<html');
      const hasHead = content.includes('<head');
      const hasBody = content.includes('<body');
      const hasTitle = content.includes('<title');

      const isValid = hasDoctype && hasHtml && hasHead && hasBody && hasTitle;

      this.logCheck(
        `HTML structure valid: ${htmlFile}`,
        isValid,
        isValid ? 'Valid HTML structure' : 'Invalid HTML structure'
      );

      if (!isValid) {
        allValid = false;
      }

      // Check for SPA routing (404.html for GitHub Pages)
      if (this.buildType === 'gh-pages' && htmlFile === 'index.html') {
        const has404 = fs.existsSync(path.join(distPath, '404.html'));
        this.logCheck(
          'GitHub Pages 404.html exists',
          has404,
          has404 ? 'SPA routing supported' : 'Missing 404.html for SPA routing'
        );
      }
    }

    return allValid;
  }

  /**
   * Check assets directory
   */
  checkAssets() {
    const assetsPath = path.join(distPath, 'assets');

    if (!fs.existsSync(assetsPath)) {
      this.logCheck('Assets directory exists', false, 'Assets directory missing');
      return false;
    }

    const assets = fs.readdirSync(assetsPath);
    const jsFiles = assets.filter(file => file.endsWith('.js'));
    const cssFiles = assets.filter(file => file.endsWith('.css'));

    this.logCheck(
      'JavaScript assets present',
      jsFiles.length > 0,
      `Found ${jsFiles.length} JS files`
    );

    this.logCheck(
      'CSS assets present',
      cssFiles.length > 0,
      `Found ${cssFiles.length} CSS files`
    );

    // Check for source maps in development
    if (this.buildType === 'development') {
      const sourceMaps = assets.filter(file => file.endsWith('.map'));
      this.logCheck(
        'Source maps present (development)',
        sourceMaps.length > 0,
        `Found ${sourceMaps.length} source maps`
      );
    }

    // Check bundle sizes
    this.checkBundleSizes(jsFiles, cssFiles);

    return jsFiles.length > 0;
  }

  /**
   * Check bundle sizes
   * @param {string[]} jsFiles - JavaScript files
   * @param {string[]} cssFiles - CSS files
   */
  checkBundleSizes(jsFiles, cssFiles) {
    const assetsPath = path.join(distPath, 'assets');
    let totalJsSize = 0;
    let totalCssSize = 0;

    // Calculate JS bundle sizes
    for (const jsFile of jsFiles) {
      const filePath = path.join(assetsPath, jsFile);
      const stats = fs.statSync(filePath);
      totalJsSize += stats.size;
    }

    // Calculate CSS bundle sizes
    for (const cssFile of cssFiles) {
      const filePath = path.join(assetsPath, cssFile);
      const stats = fs.statSync(filePath);
      totalCssSize += stats.size;
    }

    const totalJsKB = Math.round(totalJsSize / 1024);
    const totalCssKB = Math.round(totalCssSize / 1024);

    // Bundle size thresholds (in KB)
    const thresholds = {
      js: 200, // 200KB
      css: 50,  // 50KB
      total: 300 // 300KB
    };

    this.logCheck(
      'JavaScript bundle size acceptable',
      totalJsKB <= thresholds.js,
      `${totalJsKB}KB (limit: ${thresholds.js}KB)`
    );

    this.logCheck(
      'CSS bundle size acceptable',
      totalCssKB <= thresholds.css,
      `${totalCssKB}KB (limit: ${thresholds.css}KB)`
    );

    const totalKB = totalJsKB + totalCssKB;
    this.logCheck(
      'Total bundle size acceptable',
      totalKB <= thresholds.total,
      `${totalKB}KB (limit: ${thresholds.total}KB)`
    );

    if (totalJsKB > thresholds.js) {
      this.logWarning(`JavaScript bundle is large (${totalJsKB}KB). Consider code splitting.`);
    }

    if (totalCssKB > thresholds.css) {
      this.logWarning(`CSS bundle is large (${totalCssKB}KB). Consider CSS optimization.`);
    }
  }

  /**
   * Check data directory and manifest
   */
  checkDataStructure() {
    const dataPath = path.join(distPath, 'data');

    if (!fs.existsSync(dataPath)) {
      this.logCheck('Data directory exists', false, 'Data directory missing');
      return false;
    }

    // Check for deck manifest
    const manifestPath = path.join(dataPath, 'deck-manifest.json');
    const hasManifest = fs.existsSync(manifestPath);

    this.logCheck(
      'Deck manifest exists',
      hasManifest,
      hasManifest ? 'Found deck-manifest.json' : 'Missing deck-manifest.json'
    );

    if (hasManifest) {
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const isValidManifest = Array.isArray(manifest) && manifest.length > 0;

        this.logCheck(
          'Deck manifest valid',
          isValidManifest,
          isValidManifest ? `${manifest.length} decks found` : 'Invalid manifest structure'
        );
      } catch (error) {
        this.logCheck('Deck manifest valid', false, `Parse error: ${error.message}`);
      }
    }

    return hasManifest;
  }

  /**
   * Check environment-specific requirements
   */
  checkEnvironmentSpecific() {
    switch (this.buildType) {
      case 'gh-pages':
        this.checkGitHubPages();
        break;
      case 'production':
        this.checkProduction();
        break;
      case 'staging':
        this.checkStaging();
        break;
      default:
        console.log(`ℹ️  No environment-specific checks for: ${this.buildType}`);
    }
  }

  /**
   * Check GitHub Pages specific requirements
   */
  checkGitHubPages() {
    console.log('\n📄 GitHub Pages specific checks:');

    // Check for 404.html
    const has404 = fs.existsSync(path.join(distPath, '404.html'));
    this.logCheck(
      'GitHub Pages 404.html present',
      has404,
      has404 ? 'SPA routing supported' : 'Missing 404.html'
    );

    // Check base path configuration in index.html
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      const content = fs.readFileSync(indexPath, 'utf8');
      const hasBasePath = content.includes('/quizly/');

      this.logCheck(
        'GitHub Pages base path configured',
        hasBasePath,
        hasBasePath ? 'Base path /quizly/ found' : 'Base path not configured'
      );
    }
  }

  /**
   * Check production specific requirements
   */
  checkProduction() {
    console.log('\n🚀 Production specific checks:');

    // Check for minification
    const assetsPath = path.join(distPath, 'assets');
    if (fs.existsSync(assetsPath)) {
      const jsFiles = fs.readdirSync(assetsPath).filter(file => file.endsWith('.js'));
      const hasMinifiedJs = jsFiles.some(file => file.includes('.min.') || !file.includes('.js.map'));

      this.logCheck(
        'JavaScript files minified',
        hasMinifiedJs,
        hasMinifiedJs ? 'Minified assets found' : 'Assets may not be minified'
      );
    }

    // Check for source maps (should be absent in production)
    const assetsPath2 = path.join(distPath, 'assets');
    if (fs.existsSync(assetsPath2)) {
      const sourceMaps = fs.readdirSync(assetsPath2).filter(file => file.endsWith('.map'));

      if (sourceMaps.length > 0) {
        this.logWarning(`Found ${sourceMaps.length} source maps in production build`);
      } else {
        this.logCheck('No source maps in production', true, 'Source maps properly excluded');
      }
    }
  }

  /**
   * Check staging specific requirements
   */
  checkStaging() {
    console.log('\n🔧 Staging specific checks:');

    // Staging might include source maps for debugging
    const assetsPath = path.join(distPath, 'assets');
    if (fs.existsSync(assetsPath)) {
      const sourceMaps = fs.readdirSync(assetsPath).filter(file => file.endsWith('.map'));

      this.logCheck(
        'Source maps available for staging',
        sourceMaps.length > 0,
        `Found ${sourceMaps.length} source maps for debugging`
      );
    }
  }

  /**
   * Run all verification checks
   */
  async verify() {
    console.log(`🔍 Verifying ${this.buildType} build...\n`);

    // Core checks
    if (!this.checkDistExists()) {
      console.log('\n❌ Build verification failed - no dist directory');
      return false;
    }

    this.checkEssentialFiles();
    this.checkHtmlFiles();
    this.checkAssets();
    this.checkDataStructure();
    this.checkEnvironmentSpecific();

    // Summary
    const totalChecks = this.checks.length;
    const passedChecks = this.checks.filter(c => c.passed).length;
    const failedChecks = totalChecks - passedChecks;

    console.log('\n📊 Verification Summary:');
    console.log(`   Total checks: ${totalChecks}`);
    console.log(`   Passed: ${passedChecks} ✅`);
    console.log(`   Failed: ${failedChecks} ❌`);
    console.log(`   Warnings: ${this.warnings.length} ⚠️`);

    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.warnings.forEach(warning => console.log(`   - ${warning}`));
    }

    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach(error => console.log(`   - ${error}`));
      return false;
    }

    console.log('\n✅ Build verification completed successfully!');
    return true;
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const buildType = process.argv[2] || 'production';
  const verifier = new BuildVerifier(buildType);

  verifier.verify().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Build verification failed:', error);
    process.exit(1);
  });
}

export default BuildVerifier;