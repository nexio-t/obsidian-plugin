import { App, TFile, CachedMetadata } from 'obsidian';
import {
  ScanResult,
  ScanFilters,
  NoteMetadata,
  VaultInsightsSettings,
  HeadingInfo,
  TaskInfo,
} from '../types';
import { InsightsCache } from './cache';
import { DAILY_LOOKBACK_MS } from '../constants';

/**
 * VaultScanner provides methods to scan and filter vault files.
 * Uses Obsidian's MetadataCache for efficient metadata extraction.
 */
export class VaultScanner {
  private app: App;
  private settings: VaultInsightsSettings;
  private cache: InsightsCache;

  constructor(app: App, settings: VaultInsightsSettings, cache: InsightsCache) {
    this.app = app;
    this.settings = settings;
    this.cache = cache;
  }

  /**
   * Scan files modified within the last N days.
   */
  scanRecent(days: number): ScanResult {
    const cutoff = Date.now() - days * DAILY_LOOKBACK_MS;
    return this.scan({
      modifiedAfter: cutoff,
    });
  }

  /**
   * Scan files within specific folders.
   */
  scanFolders(folders: string[], exclude?: string[]): ScanResult {
    return this.scan({
      folders,
      excludeFolders: exclude,
    });
  }

  /**
   * Scan all markdown files in the vault.
   */
  scanAll(): ScanResult {
    return this.scan({});
  }

  /**
   * Scan with custom filters.
   */
  scan(filters: ScanFilters): ScanResult {
    let files = this.app.vault.getMarkdownFiles();

    // Apply folder filters
    if (filters.folders && filters.folders.length > 0) {
      files = this.filterByFolders(files, filters.folders, filters.excludeFolders);
    } else if (filters.excludeFolders && filters.excludeFolders.length > 0) {
      files = this.filterByFolders(files, undefined, filters.excludeFolders);
    }

    // Apply time filters
    if (filters.modifiedAfter || filters.modifiedBefore) {
      files = this.filterByTime(files, filters.modifiedAfter, filters.modifiedBefore);
    }

    return {
      files,
      totalCount: files.length,
      scannedAt: Date.now(),
      filters,
    };
  }

  /**
   * Get metadata for a single file.
   * Uses MetadataCache for efficient extraction.
   */
  getMetadata(file: TFile): NoteMetadata | null {
    // Check cache first
    const cached = this.cache.get<NoteMetadata>('metadata', file);
    if (cached) {
      return cached;
    }

    const cache = this.app.metadataCache.getFileCache(file);
    if (!cache) {
      return null;
    }

    const metadata = this.extractMetadataFromCache(file, cache);
    this.cache.set('metadata', metadata, file);
    return metadata;
  }

  /**
   * Get metadata for multiple files.
   * Returns a map of file path to metadata.
   */
  getMetadataBatch(files: TFile[]): Map<string, NoteMetadata> {
    const results = new Map<string, NoteMetadata>();

    for (const file of files) {
      const metadata = this.getMetadata(file);
      if (metadata) {
        results.set(file.path, metadata);
      }
    }

    return results;
  }

  /**
   * Update settings reference.
   * Called when settings change.
   */
  updateSettings(settings: VaultInsightsSettings): void {
    this.settings = settings;
  }

  /**
   * Filter files by modification time.
   */
  private filterByTime(
    files: TFile[],
    after?: number,
    before?: number
  ): TFile[] {
    return files.filter((file) => {
      const mtime = file.stat.mtime;
      const afterOk = !after || mtime >= after;
      const beforeOk = !before || mtime <= before;
      return afterOk && beforeOk;
    });
  }

  /**
   * Filter files by folder inclusion/exclusion.
   */
  private filterByFolders(
    files: TFile[],
    include?: string[],
    exclude?: string[]
  ): TFile[] {
    const normalizedFolder = (folder: string): string => folder.replace(/\/+$/, '');
    const isInFolder = (path: string, folder: string): boolean => {
      const normalized = normalizedFolder(folder);
      if (!normalized) return false;
      return path === normalized || path.startsWith(normalized + '/');
    };

    return files.filter((file) => {
      // Check exclusions first
      if (exclude?.some(folder => isInFolder(file.path, folder))) {
        return false;
      }

      // Check inclusions (if specified, must match at least one)
      if (include?.length) {
        return include.some(folder => isInFolder(file.path, folder));
      }

      return true;
    });
  }

  /**
   * Extract NoteMetadata from Obsidian's CachedMetadata.
   */
  private extractMetadataFromCache(file: TFile, cache: CachedMetadata): NoteMetadata {
    // Extract tags (remove # prefix)
    const tags: string[] = cache.tags?.map((t) => t.tag.replace(/^#/, '')) ?? [];

    // Also include frontmatter tags if present
    const frontmatterTags = cache.frontmatter?.tags;
    if (frontmatterTags) {
      if (Array.isArray(frontmatterTags)) {
        tags.push(...frontmatterTags.map((t: string) => t.replace(/^#/, '')));
      } else if (typeof frontmatterTags === 'string') {
        tags.push(frontmatterTags.replace(/^#/, ''));
      }
    }

    // Extract links (just the link targets)
    const links: string[] = cache.links?.map((l) => l.link) ?? [];

    // Extract headings
    const headings: HeadingInfo[] =
      cache.headings?.map((h) => ({
        text: h.heading,
        level: h.level,
        line: h.position.start.line,
      })) ?? [];

    // Extract tasks from list items
    const tasks: TaskInfo[] = [];
    if (cache.listItems) {
      for (const item of cache.listItems) {
        // task is undefined for non-task list items
        // task is ' ' for unchecked tasks
        // task is 'x' or 'X' for checked tasks
        if (item.task !== undefined) {
          tasks.push({
            text: '', // Will need content read to get full text
            completed: item.task !== ' ',
            line: item.position.start.line,
          });
        }
      }
    }

    // Extract frontmatter (safely copy)
    const frontmatter: Record<string, unknown> = {};
    if (cache.frontmatter) {
      for (const key in cache.frontmatter) {
        if (key !== 'position') {
          frontmatter[key] = cache.frontmatter[key];
        }
      }
    }

    return {
      filePath: file.path,
      fileName: file.basename,
      frontmatter,
      tags: [...new Set(tags)], // Deduplicate tags
      links: [...new Set(links)], // Deduplicate links
      headings,
      tasks,
      createdAt: file.stat.ctime,
      modifiedAt: file.stat.mtime,
    };
  }
}
