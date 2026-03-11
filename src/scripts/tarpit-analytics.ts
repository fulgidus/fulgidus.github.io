/**
 * Tarpit Analytics — Umami custom event tracking for honeypot pages.
 *
 * Tracks three types of events via umami.track():
 *
 * 1. "tarpit-entry"  — Fired on the first tarpit page a visitor sees in a session.
 *    Data: { path, userAgentClass, referrer }
 *
 * 2. "tarpit-pageview" — Fired on every tarpit page view (including the first).
 *    Data: { path, depth, userAgentClass }
 *
 * 3. "tarpit-depth" — Fired when depth milestones are reached (5, 10, 25, 50, 100)
 *    or when the visitor leaves (via beforeunload/visibilitychange).
 *    Data: { maxDepth, userAgentClass, sessionDuration }
 *
 * User-agent classification heuristic:
 *   - "bot"       — matches common bot/crawler/spider UA patterns
 *   - "suspected" — no UA string, or headless browser indicators
 *   - "human"     — everything else
 *
 * All state is stored in sessionStorage so depth resets per browsing session.
 * The script has no visible UI and does not interfere with noindex directives.
 *
 * ─── Viewing tarpit metrics in Umami ───────────────────────────────────────
 *
 * In the Umami dashboard, go to Events to see:
 *   • "tarpit-entry"    — each unique session entering the tarpit
 *   • "tarpit-pageview" — every page view within /well/
 *   • "tarpit-depth"    — depth milestones and exit summaries
 *
 * Click on any event name to drill into event data. Filter by:
 *   • userAgentClass: "bot" | "suspected" | "human"
 *   • depth / maxDepth: navigation depth within the tarpit
 *   • sessionDuration: seconds spent in the tarpit
 *
 * To see only bot traffic, filter events where userAgentClass = "bot".
 * The "tarpit-depth" event with the highest maxDepth per session shows
 * how deep each crawler went before leaving.
 *
 * @see https://umami.is/docs/tracker-functions for umami.track() API
 */

// ─── Umami type helper ────────────────────────────────────────────────────────

interface UmamiTracker {
  track(eventName: string, eventData?: Record<string, unknown>): void;
}

/** Access the globally-loaded umami tracker (loaded via script tag in BaseHead). */
function getUmami(): UmamiTracker | undefined {
  return (window as unknown as Record<string, unknown>).umami as UmamiTracker | undefined;
}

// ─── Bot detection ────────────────────────────────────────────────────────────

type UserAgentClass = 'bot' | 'suspected' | 'human';

/** Common bot/crawler/spider patterns in user-agent strings. */
const BOT_UA_PATTERNS = /bot|crawl|spider|slurp|wget|curl|fetch|scrape|archive|ia_archiver|mediapartners|facebookexternalhit|twitterbot|linkedinbot|whatsapp|baiduspider|yandex|sogou|exabot|semrush|ahrefs|mj12bot|dotbot|petalbot|bytespider|gptbot|claudebot|anthropic|ccbot|chatgpt|google-extended/i;

/** Headless browser indicators in user-agent strings. */
const HEADLESS_PATTERNS = /headless|phantom|puppeteer|playwright|selenium|webdriver/i;

/**
 * Classify the user-agent string.
 * The classification is only sent as analytics data — not exposed in the DOM.
 */
function classifyUserAgent(): UserAgentClass {
  const ua = navigator.userAgent;

  if (!ua || ua.length < 10) {
    return 'suspected';
  }

  if (BOT_UA_PATTERNS.test(ua)) {
    return 'bot';
  }

  if (HEADLESS_PATTERNS.test(ua)) {
    return 'suspected';
  }

  // Check for webdriver property (set by automation tools)
  if (navigator.webdriver) {
    return 'suspected';
  }

  return 'human';
}

// ─── Session depth tracking ───────────────────────────────────────────────────

const STORAGE_KEY = 'tarpit_depth';
const STORAGE_ENTRY_KEY = 'tarpit_entry_time';
const DEPTH_MILESTONES = [5, 10, 25, 50, 100];

function getDepth(): number {
  try {
    return parseInt(sessionStorage.getItem(STORAGE_KEY) || '0', 10);
  } catch {
    return 0;
  }
}

function setDepth(depth: number): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, String(depth));
  } catch {
    // sessionStorage may be unavailable (private browsing, etc.)
  }
}

function getEntryTime(): number {
  try {
    const stored = sessionStorage.getItem(STORAGE_ENTRY_KEY);
    return stored ? parseInt(stored, 10) : Date.now();
  } catch {
    return Date.now();
  }
}

function setEntryTime(time: number): void {
  try {
    sessionStorage.setItem(STORAGE_ENTRY_KEY, String(time));
  } catch {
    // sessionStorage may be unavailable
  }
}

// ─── Tracking logic ───────────────────────────────────────────────────────────

/**
 * Wait for umami to be available (it loads asynchronously via defer).
 * Retries up to ~3 seconds before giving up silently.
 */
function whenUmamiReady(callback: () => void): void {
  if (getUmami()) {
    callback();
    return;
  }

  let attempts = 0;
  const maxAttempts = 30;
  const interval = setInterval(() => {
    attempts++;
    if (getUmami()) {
      clearInterval(interval);
      callback();
    } else if (attempts >= maxAttempts) {
      clearInterval(interval);
      // Umami never loaded — silently give up
    }
  }, 100);
}

function trackTarpitEvents(): void {
  const umami = getUmami();
  if (!umami) return;

  const path = window.location.pathname;
  const uaClass = classifyUserAgent();
  const previousDepth = getDepth();
  const newDepth = previousDepth + 1;

  // Update depth
  setDepth(newDepth);

  // Track entry event on first tarpit page in this session
  if (previousDepth === 0) {
    setEntryTime(Date.now());

    umami.track('tarpit-entry', {
      path,
      userAgentClass: uaClass,
      referrer: document.referrer || '(direct)',
    });
  }

  // Track every tarpit page view
  umami.track('tarpit-pageview', {
    path,
    depth: newDepth,
    userAgentClass: uaClass,
  });

  // Track depth milestones
  if (DEPTH_MILESTONES.includes(newDepth)) {
    const sessionDuration = Math.round((Date.now() - getEntryTime()) / 1000);
    umami.track('tarpit-depth', {
      maxDepth: newDepth,
      userAgentClass: uaClass,
      sessionDuration,
    });
  }
}

// ─── Exit tracking ────────────────────────────────────────────────────────────

function trackTarpitExit(): void {
  const depth = getDepth();
  if (depth === 0) return;

  const umami = getUmami();
  if (!umami) return;

  const uaClass = classifyUserAgent();
  const sessionDuration = Math.round((Date.now() - getEntryTime()) / 1000);

  umami.track('tarpit-depth', {
    maxDepth: depth,
    userAgentClass: uaClass,
    sessionDuration,
  });
}

// ─── Initialization ───────────────────────────────────────────────────────────

/** Track whether init has already run for the current page to avoid duplicates. */
let currentTrackedPath = '';
/** Ensure the exit handler is registered only once across all page navigations. */
let exitHandlerRegistered = false;

function init(): void {
  // Prevent double-tracking the same page (astro:page-load + DOMContentLoaded)
  if (currentTrackedPath === window.location.pathname) return;
  currentTrackedPath = window.location.pathname;

  whenUmamiReady(() => {
    trackTarpitEvents();

    // Register exit handler once — repeated listeners would fire N times on exit
    if (!exitHandlerRegistered) {
      exitHandlerRegistered = true;
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          trackTarpitExit();
        }
      });
    }
  });
}

// Support Astro View Transitions (page doesn't fully reload)
document.addEventListener('astro:page-load', () => {
  if (window.location.pathname.startsWith('/well/')) {
    init();
  }
});

// Fallback for initial page load (if astro:page-load doesn't fire)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.startsWith('/well/')) {
      init();
    }
  });
} else if (window.location.pathname.startsWith('/well/')) {
  init();
}
