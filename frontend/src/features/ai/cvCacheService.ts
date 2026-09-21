/**
 * CV Extraction Cache Service
 *
 * Caches AI extraction results in localStorage to avoid redundant
 * LLM calls. Cache is keyed per applicationId and invalidated when
 * the resumeUrl changes (i.e. a new CV was uploaded) or after TTL.
 *
 * Future: Replace localStorage with Redis for cross-user caching.
 */

import type { CVExtractionResult, ExtractionProvenance } from "./types";

// ── Types ──────────────────────────────────────────────────────

export interface CvCacheEntry {
  /** The resumeUrl at the time of extraction — used for invalidation */
  resumeUrl: string;
  /** Full extraction result */
  result: CVExtractionResult;
  /** Extraction metadata / provenance */
  provenance: ExtractionProvenance;
  /** Timestamp when cached (Date.now()) */
  cachedAt: number;
}

// ── Constants ──────────────────────────────────────────────────

const CACHE_PREFIX = "cv_extraction_";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── Public API ─────────────────────────────────────────────────

/**
 * Retrieve cached extraction for an application.
 *
 * Returns null if:
 * - No cache entry exists
 * - The resumeUrl has changed (CV was re-uploaded)
 * - The cache has expired (> 24h)
 */
export function getCachedExtraction(
  applicationId: number,
  currentResumeUrl: string,
): CvCacheEntry | null {
  try {
    const key = CACHE_PREFIX + applicationId;
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const entry: CvCacheEntry = JSON.parse(raw);

    // Invalidate if CV was re-uploaded
    if (entry.resumeUrl !== currentResumeUrl) {
      localStorage.removeItem(key);
      return null;
    }

    // Invalidate if expired
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }

    return entry;
  } catch {
    // Corrupted cache — silently remove
    localStorage.removeItem(CACHE_PREFIX + applicationId);
    return null;
  }
}

/**
 * Store extraction result in cache.
 */
export function setCachedExtraction(
  applicationId: number,
  entry: CvCacheEntry,
): void {
  try {
    const key = CACHE_PREFIX + applicationId;
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

/**
 * Remove cached extraction for an application.
 * Call this before a manual "re-analyze" to force a fresh extraction.
 */
export function clearCachedExtraction(applicationId: number): void {
  localStorage.removeItem(CACHE_PREFIX + applicationId);
}
