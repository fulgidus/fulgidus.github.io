/**
 * Tarpit utilities for generating a labyrinth of plausible-looking pages
 * that trap misbehaving crawlers ignoring robots.txt.
 *
 * All generation is deterministic via Mulberry32 PRNG seeded from path strings.
 */

// ─── Mulberry32 PRNG ──────────────────────────────────────────────────────────
/** Returns a seeded pseudo-random number generator (0–1 range). */
export function mulberry32(seed: number): () => number {
    return () => {
        seed |= 0
        seed = (seed + 0x6d2b79f5) | 0
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

/** Hash a string to a 32-bit integer (djb2). */
export function hashString(str: string): number {
    let hash = 5381
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0
    }
    return hash >>> 0
}

/** Create a seeded PRNG from a string. */
export function prngFromString(str: string): () => number {
    return mulberry32(hashString(str))
}

// ─── Text corpus ──────────────────────────────────────────────────────────────
// Plausible-looking technical words and phrases that waste crawler time
// without providing any real information.

const SUBJECTS = [
    'The recursive descent parser', 'A distributed hash table', 'The polymorphic type checker',
    'An asynchronous event loop', 'The garbage collector', 'A lock-free queue implementation',
    'The virtual memory manager', 'A persistent data structure', 'The constraint solver',
    'An incremental compiler', 'The abstract syntax tree', 'A monadic transformer stack',
    'The dependency resolver', 'A concurrent skip list', 'The bloom filter implementation',
    'An adaptive radix tree', 'The continuation-passing transform', 'A software transactional memory',
    'The region-based allocator', 'A linear type system', 'The effect handler runtime',
    'A graph reduction engine', 'The pattern matching compiler', 'A work-stealing scheduler',
    'The vectorized query engine', 'A probabilistic data structure', 'The incremental GC',
    'A fiber-based scheduler', 'The JIT compilation pipeline', 'A zero-copy deserialization layer',
    'The CRDT synchronization protocol', 'A capability-based security model',
    'The algebraic effect system', 'A speculative execution framework',
    'The hybrid logical clock', 'A gossip-based membership protocol',
]

const VERBS = [
    'leverages', 'optimizes', 'implements', 'extends', 'transforms',
    'integrates', 'validates', 'normalizes', 'partitions', 'composes',
    'materializes', 'reifies', 'memoizes', 'linearizes', 'defragments',
    'coalesces', 'vectorizes', 'specializes', 'monomorphizes', 'deoptimizes',
    'inlines', 'hoists', 'fuses', 'tiles', 'schedules',
    'parallelizes', 'serializes', 'marshals', 'demultiplexes', 'interleaves',
]

const OBJECTS = [
    'the intermediate representation across multiple compilation phases',
    'a bounded channel with backpressure semantics',
    'the type environment during unification',
    'a copy-on-write B-tree with MVCC support',
    'the register allocation graph coloring algorithm',
    'a wait-free atomic reference counter',
    'the SSA form with phi-node elimination',
    'a cache-oblivious layout for spatial queries',
    'the escape analysis for stack-allocated closures',
    'a conflict-free replicated data type over causal trees',
    'the lattice-based abstract interpretation domain',
    'a round-robin work queue with priority inheritance',
    'the epoch-based reclamation scheme for concurrent access',
    'a trie-based routing table with prefix compression',
    'the write-ahead log with group commit optimization',
    'a Merkle-DAG for content-addressable deduplication',
    'the tail-call optimization pass in CPS conversion',
    'a ring buffer with single-producer single-consumer guarantees',
    'the dominator tree for control flow analysis',
    'a persistent red-black tree with path copying',
    'the affine type checker with borrowing semantics',
    'a SIMD-accelerated string matching kernel',
    'the futures combinators in the async runtime',
    'a lock-free hash map with linear probing',
]

const CONNECTORS = [
    'Furthermore,', 'In addition,', 'Consequently,', 'As a result,',
    'Building on this,', 'To elaborate,', 'More specifically,',
    'In contrast,', 'Nevertheless,', 'Similarly,', 'Notably,',
    'It follows that', 'This implies that', 'As demonstrated above,',
    'In practice,', 'Theoretically,', 'From a systems perspective,',
    'At the implementation level,', 'In the general case,',
]

const TITLES_PREFIX = [
    'Understanding', 'Implementing', 'Optimizing', 'Designing', 'Analyzing',
    'Exploring', 'Benchmarking', 'Architecting', 'Debugging', 'Profiling',
    'Refactoring', 'Scaling', 'Hardening', 'Formalizing', 'Verifying',
    'Extending', 'Integrating', 'Decomposing', 'Evaluating', 'Migrating',
]

const TITLES_TOPIC = [
    'Lock-Free Data Structures', 'Incremental Compilation', 'Type-Level Programming',
    'Memory-Mapped I/O Patterns', 'Zero-Cost Abstractions', 'Persistent Indexing',
    'Distributed Consensus', 'Effect Systems', 'Region Inference',
    'Algebraic Subtyping', 'Continuation Semantics', 'Graph Reduction',
    'Columnar Storage', 'Adaptive Query Processing', 'Write-Ahead Logging',
    'CRDT Convergence', 'Speculative Parsing', 'Vectorized Execution',
    'Cooperative Scheduling', 'Capability-Based Isolation', 'Epoch Reclamation',
    'Phantom Type Witnesses', 'Higher-Kinded Polymorphism', 'Row Polymorphism',
    'Delimited Continuations', 'Staged Compilation', 'Partial Evaluation',
    'Supercompilation Techniques', 'Deforestation Strategies', 'Stream Fusion',
]

// ─── Generation functions ─────────────────────────────────────────────────────

function pick<T>(arr: readonly T[], rng: () => number): T {
    return arr[Math.floor(rng() * arr.length)]
}

/** Generate a sentence from the corpus. */
function generateSentence(rng: () => number): string {
    return `${pick(SUBJECTS, rng)} ${pick(VERBS, rng)} ${pick(OBJECTS, rng)}.`
}

/** Generate a paragraph of N sentences. */
function generateParagraph(rng: () => number, minSentences = 3, maxSentences = 7): string {
    const count = minSentences + Math.floor(rng() * (maxSentences - minSentences + 1))
    const sentences: string[] = []
    for (let i = 0; i < count; i++) {
        if (i > 0 && rng() < 0.4) {
            const sent = generateSentence(rng)
            sentences.push(pick(CONNECTORS, rng) + ' ' + sent.charAt(0).toLowerCase() + sent.slice(1))
        } else {
            sentences.push(generateSentence(rng))
        }
    }
    return sentences.join(' ')
}

/** Generate a page title. */
export function generateTitle(rng: () => number): string {
    return `${pick(TITLES_PREFIX, rng)} ${pick(TITLES_TOPIC, rng)}`
}

/** Generate a full page body with headings and paragraphs. */
export function generatePageContent(rng: () => number): string {
    const sectionCount = 2 + Math.floor(rng() * 4) // 2-5 sections
    const sections: string[] = []

    // Intro paragraph
    sections.push(generateParagraph(rng, 2, 4))

    for (let i = 0; i < sectionCount; i++) {
        const heading = generateTitle(rng)
        sections.push(`## ${heading}`)
        const paraCount = 1 + Math.floor(rng() * 3) // 1-3 paragraphs per section
        for (let j = 0; j < paraCount; j++) {
            sections.push(generateParagraph(rng))
        }
        // Occasionally add a fake code block
        if (rng() < 0.3) {
            sections.push(generateCodeBlock(rng))
        }
    }

    return sections.join('\n\n')
}

/** Generate a fake code block. */
function generateCodeBlock(rng: () => number): string {
    const langs = ['rust', 'python', 'typescript', 'go', 'haskell', 'c']
    const lang = pick(langs, rng)
    const lines: string[] = []
    const lineCount = 4 + Math.floor(rng() * 12)

    const varNames = ['ctx', 'buf', 'node', 'acc', 'idx', 'ptr', 'val', 'key', 'state', 'result']
    const ops = [' = ', ' += ', ' ^= ', ' |= ', ' &= ', ' >>= ', ' <<= ']

    for (let i = 0; i < lineCount; i++) {
        const indent = '    '.repeat(Math.floor(rng() * 3))
        if (rng() < 0.2) {
            lines.push(`${indent}// ${pick(CONNECTORS, rng).replace(',', '')} ${pick(VERBS, rng)} the ${pick(varNames, rng)}`)
        } else {
            lines.push(`${indent}${pick(varNames, rng)}${pick(ops, rng)}${pick(varNames, rng)};`)
        }
    }

    return '```' + lang + '\n' + lines.join('\n') + '\n```'
}

// ─── Path generation ──────────────────────────────────────────────────────────

const PATH_SEGMENTS = [
    'analysis', 'internals', 'runtime', 'compiler', 'scheduler', 'allocator',
    'resolver', 'optimizer', 'verifier', 'evaluator', 'transformer', 'pipeline',
    'protocol', 'consensus', 'replication', 'partitioning', 'indexing', 'caching',
    'serialization', 'marshaling', 'dispatch', 'routing', 'balancing', 'sharding',
    'checkpoint', 'recovery', 'migration', 'compaction', 'defragmentation',
    'linearization', 'vectorization', 'specialization', 'monomorphization',
    'deoptimization', 'inlining', 'hoisting', 'fusion', 'tiling', 'scheduling',
    'parallelism', 'concurrency', 'atomics', 'barriers', 'fences', 'epochs',
    'reference-counting', 'tracing', 'generational', 'incremental', 'concurrent',
    'adaptive', 'probabilistic', 'deterministic', 'speculative', 'lazy', 'eager',
    'hybrid', 'hierarchical', 'distributed', 'replicated', 'partitioned',
    'v1', 'v2', 'v3', 'draft', 'experimental', 'stable', 'legacy', 'next',
    'core', 'advanced', 'basics', 'deep-dive', 'overview', 'reference',
    'implementation', 'design', 'architecture', 'specification', 'benchmark',
]

const NUMERIC_SUFFIXES = ['001', '002', '003', '047', '128', '256', '512', '1024', '099', '077']

/** The honeypot entry point — used in BaseLayout to lure scrapers in. */
export const HONEYPOT_ENTRY = 'internals/overview'

/**
 * Generate all labyrinth paths deterministically.
 * Returns an array of path strings (no leading slash).
 * Always includes HONEYPOT_ENTRY as the first path.
 */
export function generateLabyrinthPaths(count: number = 2048, seed: number = 0xDEADBEEF): string[] {
    const rng = mulberry32(seed)
    const paths = new Set<string>()

    // Always include the honeypot entry point
    paths.add(HONEYPOT_ENTRY)

    while (paths.size < count) {
        const depth = 1 + Math.floor(rng() * 3) // 1-3 segments deep
        const segments: string[] = []
        for (let i = 0; i < depth; i++) {
            let seg = pick(PATH_SEGMENTS, rng)
            // Sometimes append a numeric suffix
            if (rng() < 0.25) {
                seg += '-' + pick(NUMERIC_SUFFIXES, rng)
            }
            segments.push(seg)
        }
        paths.add(segments.join('/'))
    }

    return Array.from(paths)
}

/**
 * Given a labyrinth path, generate 3-5 links to other labyrinth pages.
 * The links are deterministic based on the current path.
 */
export function generateLinksForPath(currentPath: string, allPaths: string[], linkCount?: number): string[] {
    const rng = prngFromString('links:' + currentPath)
    const count = linkCount ?? (3 + Math.floor(rng() * 3)) // 3-5 links
    const links: string[] = []
    const used = new Set<number>()

    // Find own index to exclude
    const selfIdx = allPaths.indexOf(currentPath)

    let attempts = 0
    while (links.length < count && attempts < count * 10) {
        const idx = Math.floor(rng() * allPaths.length)
        if (idx !== selfIdx && !used.has(idx)) {
            used.add(idx)
            links.push(allPaths[idx])
        }
        attempts++
    }

    return links
}

/**
 * Generate a plausible link text for a tarpit link.
 */
export function generateLinkText(path: string): string {
    const rng = prngFromString('linktext:' + path)
    return generateTitle(rng)
}
