import { TFile } from 'obsidian';
import { CacheEntry } from '../types';
import { CACHE_TTL_MS } from '../constants';

/**
 * Generic caching layer for Vault Insights plugin.
 * Supports file-based invalidation using mtime and TTL-based expiration.
 */
export class InsightsCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();

  /**
   * Get a valid cache entry, removing stale entries automatically.
   * Returns null if cache miss or stale.
   */
  private getValidEntry(key: string, file?: TFile): CacheEntry<unknown> | null {
    const cacheKey = this.generateKey(key, file?.path);
    const entry = this.cache.get(cacheKey);

    if (!entry || this.isStale(entry, file)) {
      if (entry) this.cache.delete(cacheKey);
      return null;
    }

    return entry;
  }

  /**
   * Get a cached value by key.
   * If a file is provided, validates against file mtime.
   * Returns null if cache miss or stale.
   */
  get<T>(key: string, file?: TFile): T | null {
    const entry = this.getValidEntry(key, file);
    return entry ? (entry.data as T) : null;
  }

  /**
   * Set a cached value.
   * If a file is provided, stores the file mtime for later validation.
   */
  set<T>(key: string, data: T, file?: TFile): void {
    const cacheKey = this.generateKey(key, file?.path);
    this.cache.set(cacheKey, {
      data,
      mtime: file?.stat.mtime ?? 0,
      cachedAt: Date.now(),
    });
  }

  /**
   * Check if a key exists and is valid.
   */
  has(key: string, file?: TFile): boolean {
    return this.getValidEntry(key, file) !== null;
  }

  /**
   * Invalidate a specific cache key.
   */
  invalidate(key: string): void {
    // Remove exact key
    this.cache.delete(key);

    // Also remove any keys that start with this key (for file-based keys)
    for (const cacheKey of this.cache.keys()) {
      if (cacheKey.startsWith(key + ':') || cacheKey === key) {
        this.cache.delete(cacheKey);
      }
    }
  }

  /**
   * Invalidate all cache entries for a specific file path.
   */
  invalidateFile(filePath: string): void {
    for (const cacheKey of this.cache.keys()) {
      if (cacheKey.includes(filePath)) {
        this.cache.delete(cacheKey);
      }
    }
  }

  /**
   * Clear all cached data.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the current cache size.
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Check if a cache entry is stale.
   * Entry is stale if:
   * - File mtime has changed (for file-based entries)
   * - TTL has expired (for non-file entries)
   */
  private isStale(entry: CacheEntry<unknown>, file?: TFile): boolean {
    // If file is provided, check mtime
    if (file) {
      return file.stat.mtime !== entry.mtime;
    }

    // For non-file entries, check TTL
    const age = Date.now() - entry.cachedAt;
    return age > CACHE_TTL_MS;
  }

  /**
   * Generate a cache key from a base key and optional file path.
   */
  private generateKey(key: string, filePath?: string): string {
    if (filePath) {
      return `${key}:${filePath}`;
    }
    return key;
  }
}
