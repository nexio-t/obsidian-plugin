import type { CachedMetadata } from 'obsidian';
import type { ExtractedTopic, TopicAnalysis, TopicsBySource, TopicSource } from '../types';

// Common words to filter out from headings
const COMMON_HEADING_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he',
  'she', 'we', 'they', 'what', 'which', 'who', 'whom', 'whose', 'where',
  'when', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now', 'here',
  'there', 'then', 'once', 'introduction', 'conclusion', 'summary',
  'overview', 'notes', 'references', 'appendix', 'todo', 'tasks',
]);

// Minimum heading length to consider as a topic
const MIN_HEADING_LENGTH = 3;

/**
 * Extracts and analyzes topics from Obsidian notes.
 * Topics can come from tags, headings, or links.
 */
export class TopicExtractor {
  /**
   * Extract topics from tags in a single file's cache.
   */
  extractTags(cache: CachedMetadata | null): ExtractedTopic[] {
    if (!cache?.tags) {
      return [];
    }

    const tagCounts = new Map<string, { count: number; displayName: string }>();

    for (const tagCache of cache.tags) {
      const displayName = tagCache.tag.startsWith('#')
        ? tagCache.tag.slice(1)
        : tagCache.tag;
      const normalized = displayName.toLowerCase();

      const existing = tagCounts.get(normalized);
      if (existing) {
        existing.count++;
      } else {
        tagCounts.set(normalized, { count: 1, displayName });
      }
    }

    return Array.from(tagCounts.entries()).map(([name, data]) => ({
      name,
      count: data.count,
      source: 'tag' as TopicSource,
      displayName: data.displayName,
    }));
  }

  /**
   * Extract topics from headings in a single file's cache.
   * Filters out common words and very short headings.
   */
  extractHeadings(cache: CachedMetadata | null): ExtractedTopic[] {
    if (!cache?.headings) {
      return [];
    }

    const headingCounts = new Map<string, { count: number; displayName: string }>();

    for (const heading of cache.headings) {
      const text = heading.heading.trim();

      // Skip very short headings
      if (text.length < MIN_HEADING_LENGTH) {
        continue;
      }

      // Skip common/generic headings
      const lowerText = text.toLowerCase();
      if (COMMON_HEADING_WORDS.has(lowerText)) {
        continue;
      }

      const normalized = lowerText;

      const existing = headingCounts.get(normalized);
      if (existing) {
        existing.count++;
      } else {
        headingCounts.set(normalized, { count: 1, displayName: text });
      }
    }

    return Array.from(headingCounts.entries()).map(([name, data]) => ({
      name,
      count: data.count,
      source: 'heading' as TopicSource,
      displayName: data.displayName,
    }));
  }

  /**
   * Extract topics from internal links in a single file's cache.
   */
  extractLinks(cache: CachedMetadata | null): ExtractedTopic[] {
    if (!cache?.links) {
      return [];
    }

    const linkCounts = new Map<string, { count: number; displayName: string }>();

    for (const link of cache.links) {
      // Use the link target, not display text
      const displayName = link.link;
      const normalized = displayName.toLowerCase();

      const existing = linkCounts.get(normalized);
      if (existing) {
        existing.count++;
      } else {
        linkCounts.set(normalized, { count: 1, displayName });
      }
    }

    return Array.from(linkCounts.entries()).map(([name, data]) => ({
      name,
      count: data.count,
      source: 'link' as TopicSource,
      displayName: data.displayName,
    }));
  }

  /**
   * Extract all topics from a single file's cache.
   */
  extractAll(cache: CachedMetadata | null): ExtractedTopic[] {
    return [
      ...this.extractTags(cache),
      ...this.extractHeadings(cache),
      ...this.extractLinks(cache),
    ];
  }

  /**
   * Count topic frequency across multiple file caches.
   * Aggregates topics and sorts by count.
   */
  countFrequency(
    caches: CachedMetadata[],
    sources: TopicSource[] = ['tag', 'heading', 'link']
  ): TopicAnalysis {
    const topicMap = new Map<string, ExtractedTopic>();

    const bySource: TopicsBySource = {
      tags: [],
      headings: [],
      links: [],
    };

    // Track per-source aggregation
    const sourceAggregates = {
      tag: new Map<string, ExtractedTopic>(),
      heading: new Map<string, ExtractedTopic>(),
      link: new Map<string, ExtractedTopic>(),
    };

    for (const cache of caches) {
      // Extract based on requested sources
      const topics: ExtractedTopic[] = [];

      if (sources.includes('tag')) {
        topics.push(...this.extractTags(cache));
      }
      if (sources.includes('heading')) {
        topics.push(...this.extractHeadings(cache));
      }
      if (sources.includes('link')) {
        topics.push(...this.extractLinks(cache));
      }

      // Aggregate into global map
      for (const topic of topics) {
        // Global aggregate
        const existing = topicMap.get(topic.name);
        if (existing) {
          existing.count += topic.count;
        } else {
          topicMap.set(topic.name, { ...topic });
        }

        // Per-source aggregate
        const sourceMap = sourceAggregates[topic.source];
        const sourceExisting = sourceMap.get(topic.name);
        if (sourceExisting) {
          sourceExisting.count += topic.count;
        } else {
          sourceMap.set(topic.name, { ...topic });
        }
      }
    }

    // Convert maps to sorted arrays
    const sortByCount = (a: ExtractedTopic, b: ExtractedTopic) => b.count - a.count;

    const allTopics = Array.from(topicMap.values()).sort(sortByCount);
    bySource.tags = Array.from(sourceAggregates.tag.values()).sort(sortByCount);
    bySource.headings = Array.from(sourceAggregates.heading.values()).sort(sortByCount);
    bySource.links = Array.from(sourceAggregates.link.values()).sort(sortByCount);

    // Calculate totals
    const totalOccurrences = allTopics.reduce((sum, t) => sum + t.count, 0);

    return {
      topics: allTopics,
      uniqueCount: allTopics.length,
      totalOccurrences,
      bySource,
    };
  }

  /**
   * Get top N topics from an analysis.
   */
  getTopTopics(analysis: TopicAnalysis, limit: number): ExtractedTopic[] {
    return analysis.topics.slice(0, limit);
  }

  /**
   * Filter topics by minimum count threshold.
   */
  filterByMinCount(topics: ExtractedTopic[], minCount: number): ExtractedTopic[] {
    return topics.filter(t => t.count >= minCount);
  }
}
