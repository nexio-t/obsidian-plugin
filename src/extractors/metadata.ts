import type { CachedMetadata } from 'obsidian';
import type { ExtractedMetadata } from '../types';

/**
 * Extracts metadata from Obsidian's MetadataCache.
 * Uses frontmatter for all metadata extraction.
 */
export class MetadataExtractor {
  /**
   * Extract all available metadata from a file's cache.
   */
  extract(cache: CachedMetadata | null): ExtractedMetadata {
    const frontmatter = cache?.frontmatter;

    const result: ExtractedMetadata = {
      tags: this.extractTags(cache),
      aliases: this.extractAliases(frontmatter),
      customFields: {},
    };

    // Extract title
    const title = this.getField<string>(cache, 'title');
    if (title) {
      result.title = title;
    }

    // Extract date fields
    const date = this.parseDate(this.getField(cache, 'date'));
    if (date) {
      result.date = date;
    }

    const created = this.parseDate(this.getField(cache, 'created'));
    if (created) {
      result.created = created;
    }

    const modified = this.parseDate(this.getField(cache, 'modified'));
    if (modified) {
      result.modified = modified;
    }

    // Extract custom fields (everything not in standard fields)
    if (frontmatter) {
      const standardFields = new Set([
        'title', 'date', 'created', 'modified', 'tags', 'aliases', 'position'
      ]);

      for (const [key, value] of Object.entries(frontmatter)) {
        if (!standardFields.has(key)) {
          result.customFields[key] = value;
        }
      }
    }

    return result;
  }

  /**
   * Check if a frontmatter field exists.
   */
  hasField(cache: CachedMetadata | null, field: string): boolean {
    return cache?.frontmatter?.[field] !== undefined;
  }

  /**
   * Get a frontmatter field value with type safety.
   */
  getField<T>(cache: CachedMetadata | null, field: string, defaultValue?: T): T | undefined {
    const value = cache?.frontmatter?.[field];
    if (value === undefined) {
      return defaultValue;
    }
    return value as T;
  }

  /**
   * Check if a frontmatter field matches a specific value.
   */
  matchesField(cache: CachedMetadata | null, field: string, value: unknown): boolean {
    const fieldValue = cache?.frontmatter?.[field];
    if (fieldValue === undefined) {
      return false;
    }

    // Handle array fields (e.g., tags)
    if (Array.isArray(fieldValue)) {
      return fieldValue.includes(value);
    }

    return fieldValue === value;
  }

  /**
   * Extract tags from both frontmatter and inline tags in cache.
   */
  private extractTags(cache: CachedMetadata | null): string[] {
    const tags = new Set<string>();

    // Frontmatter tags
    const fmTags = cache?.frontmatter?.tags;
    if (Array.isArray(fmTags)) {
      for (const tag of fmTags) {
        if (typeof tag === 'string') {
          tags.add(this.normalizeTag(tag));
        }
      }
    } else if (typeof fmTags === 'string') {
      tags.add(this.normalizeTag(fmTags));
    }

    // Inline tags from cache
    const cacheTags = cache?.tags ?? [];
    for (const tagCache of cacheTags) {
      tags.add(this.normalizeTag(tagCache.tag));
    }

    return Array.from(tags);
  }

  /**
   * Extract aliases from frontmatter.
   */
  private extractAliases(frontmatter: Record<string, unknown> | undefined): string[] {
    const aliases = frontmatter?.aliases;

    if (Array.isArray(aliases)) {
      return aliases.filter((a): a is string => typeof a === 'string');
    }

    if (typeof aliases === 'string') {
      return [aliases];
    }

    return [];
  }

  /**
   * Normalize a tag by removing the # prefix.
   */
  private normalizeTag(tag: string): string {
    return tag.startsWith('#') ? tag.slice(1) : tag;
  }

  /**
   * Parse a date value from various formats.
   */
  private parseDate(value: unknown): Date | undefined {
    if (!value) {
      return undefined;
    }

    if (value instanceof Date) {
      return value;
    }

    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    return undefined;
  }
}
