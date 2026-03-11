/**
 * Lighthouse CI Configuration
 *
 * Runs Lighthouse audits against the built static site (dist/) served locally.
 * Tests representative pages: homepage, a blog post, search page, and 404 page.
 *
 * Budget thresholds:
 * - Performance: 70+ (warning only — does NOT block deployment)
 * - Accessibility: 90+ (blocks deployment on regression)
 * - SEO: 90+ (blocks deployment on regression)
 * - Best Practices: 80+ (warning only — does NOT block deployment)
 *
 * Per the feature spec, performance and best-practices scores do not block
 * deployment; only accessibility and SEO regressions gate the deploy.
 */
module.exports = {
  ci: {
    collect: {
      // Serve the built static files from dist/
      staticDistDir: './dist',
      // URLs to audit (relative to the local server root)
      url: [
        'http://localhost/index.html',
        'http://localhost/posts/Testing/index.html',
        'http://localhost/search/index.html',
        'http://localhost/404.html',
      ],
      // Run 3 audits per URL for more stable scores
      numberOfRuns: 3,
      settings: {
        // Use desktop preset for more consistent CI results
        preset: 'desktop',
        // Skip network throttling in CI (already fast local server)
        throttlingMethod: 'simulate',
        // Chrome flags for headless CI environment
        chromeFlags: '--no-sandbox --headless --disable-gpu',
        // Resource budgets defined in budget.json (JS, CSS, image, timing budgets)
        budgets: require('./budget.json'),
      },
    },
    assert: {
      assertions: {
        // ===== Accessibility: BLOCKS deployment (error) =====
        'categories:accessibility': ['error', { minScore: 0.9 }],

        // ===== SEO: BLOCKS deployment (error) =====
        'categories:seo': ['error', { minScore: 0.9 }],

        // ===== Performance: WARNING only (does NOT block deployment) =====
        'categories:performance': ['warn', { minScore: 0.7 }],

        // ===== Best Practices: WARNING only (does NOT block deployment) =====
        'categories:best-practices': ['warn', { minScore: 0.8 }],

        // ===== Resource budgets (warnings — informational) =====
        'resource-summary:script:size': ['warn', { maxNumericValue: 300000 }],   // 300 KB JS budget
        'resource-summary:stylesheet:size': ['warn', { maxNumericValue: 100000 }], // 100 KB CSS budget
        'resource-summary:image:size': ['warn', { maxNumericValue: 500000 }],      // 500 KB image budget
        'resource-summary:total:size': ['warn', { maxNumericValue: 1500000 }],     // 1.5 MB total budget
      },
    },
    upload: {
      // Use temporary public storage (no server needed)
      target: 'temporary-public-storage',
    },
  },
};
