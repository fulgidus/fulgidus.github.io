export type DeckEngine = 'html' | 'marp' | 'slidev'
export interface Deck { slug: string; dir: string; engine: DeckEngine }
export const ROOT: string
export const TALKS_DIR: string
export const OUT_DIR: string
export function detectEngine(dir: string): DeckEngine | null
export function findDecks(): Deck[]
export function engineForUrl(url: string): DeckEngine | null
export function slidevUsesHashRouter(dir: string): boolean
