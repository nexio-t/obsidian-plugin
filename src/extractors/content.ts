import type { TFile, CachedMetadata } from 'obsidian';
import type { ContentSummary } from '../types';

// Regex patterns
const FRONTMATTER_REGEX = /^---\n[\s\S]*?\n---\n?/;
const CODE_BLOCK_REGEX = /```[\s\S]*?```/g;
const INLINE_CODE_REGEX = /`[^`]+`/g;
const MARKDOWN_LINK_REGEX = /\[([^\]]+)\]\([^)]+\)/g;
const WIKI_LINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
const HEADING_REGEX = /^#{1,6}\s+/gm;
const BOLD_ITALIC_REGEX = /(\*{1,3}|_{1,3})([^*_]+)\1/g;
const BLOCKQUOTE_REGEX = /^>\s*/gm;
const LIST_MARKER_REGEX = /^[\s]*[-*+]\s+/gm;
const NUMBERED_LIST_REGEX = /^[\s]*\d+\.\s+/gm;
const HTML_TAG_REGEX = /<[^>]+>/g;
const MULTIPLE_NEWLINES_REGEX = /\n{3,}/g;
const MULTIPLE_SPACES_REGEX = /\s{2,}/g;

/**
 * Extracts content summaries and metadata from Obsidian notes.
 */
export class ContentExtractor {
  /**
   * Generate an excerpt from note content.
   * Strips frontmatter and optionally markdown formatting.
   */
  generateExcerpt(
    content: string,
    maxLength: number = 200,
    stripMarkdown: boolean = true
  ): string {
    // Remove frontmatter
    let text = content.replace(FRONTMATTER_REGEX, '');

    // Remove code blocks
    text = text.replace(CODE_BLOCK_REGEX, '');

    if (stripMarkdown) {
      text = this.stripMarkdown(text);
    }

    // Normalize whitespace
    text = text.replace(MULTIPLE_NEWLINES_REGEX, '\n\n');
    text = text.replace(MULTIPLE_SPACES_REGEX, ' ');
    text = text.trim();

    // Get first paragraph or first N characters
    const paragraphs = text.split(/\n\n+/);
    let excerpt = paragraphs[0] ?? '';

    // Skip if first paragraph is empty and try next
    if (!excerpt.trim() && paragraphs.length > 1) {
      excerpt = paragraphs[1] ?? '';
    }

    // Truncate at word boundary if needed
    if (excerpt.length > maxLength) {
      excerpt = this.truncateAtWord(excerpt, maxLength);
    }

    return excerpt;
  }

  /**
   * Extract the title from a file.
   * Priority: frontmatter title > first H1 > file basename
   */
  extractTitle(
    file: TFile,
    cache: CachedMetadata | null,
    content?: string
  ): string {
    // 1. Check frontmatter title
    const fmTitle = cache?.frontmatter?.title;
    if (typeof fmTitle === 'string' && fmTitle.trim()) {
      return fmTitle.trim();
    }

    // 2. Check first H1 heading
    const firstH1 = cache?.headings?.find(h => h.level === 1);
    if (firstH1?.heading) {
      return firstH1.heading.trim();
    }

    // 3. If we have content, try to find H1 from text
    if (content) {
      const h1Match = content.match(/^#\s+(.+)$/m);
      if (h1Match?.[1]) {
        return h1Match[1].trim();
      }
    }

    // 4. Fall back to file basename
    return file.basename;
  }

  /**
   * Count words in content.
   * Strips frontmatter and code blocks before counting.
   */
  countWords(content: string): number {
    // Remove frontmatter
    let text = content.replace(FRONTMATTER_REGEX, '');

    // Remove code blocks
    text = text.replace(CODE_BLOCK_REGEX, '');

    // Remove inline code
    text = text.replace(INLINE_CODE_REGEX, '');

    // Strip markdown formatting
    text = this.stripMarkdown(text);

    // Normalize whitespace
    text = text.replace(MULTIPLE_SPACES_REGEX, ' ').trim();

    // Split and count non-empty tokens
    if (!text) {
      return 0;
    }

    const words = text.split(/\s+/).filter(w => w.length > 0);
    return words.length;
  }

  /**
   * Generate a full content summary for a file.
   */
  generateSummary(
    file: TFile,
    cache: CachedMetadata | null,
    content: string
  ): ContentSummary {
    return {
      title: this.extractTitle(file, cache, content),
      excerpt: this.generateExcerpt(content),
      wordCount: this.countWords(content),
      file,
      modifiedAt: file.stat.mtime,
    };
  }

  /**
   * Check if content has meaningful text (not just frontmatter/whitespace).
   */
  hasContent(content: string): boolean {
    const text = content
      .replace(FRONTMATTER_REGEX, '')
      .replace(CODE_BLOCK_REGEX, '')
      .trim();

    return text.length > 0;
  }

  /**
   * Extract all headings as an outline.
   */
  extractOutline(cache: CachedMetadata | null): string[] {
    if (!cache?.headings) {
      return [];
    }

    return cache.headings.map(h => {
      const indent = '  '.repeat(h.level - 1);
      return `${indent}${h.heading}`;
    });
  }

  /**
   * Strip markdown formatting from text.
   */
  private stripMarkdown(text: string): string {
    // Remove wiki links (keep display text or link target)
    text = text.replace(WIKI_LINK_REGEX, (_, link, display) => display ?? link);

    // Remove markdown links (keep display text)
    text = text.replace(MARKDOWN_LINK_REGEX, '$1');

    // Remove heading markers
    text = text.replace(HEADING_REGEX, '');

    // Remove bold/italic markers
    text = text.replace(BOLD_ITALIC_REGEX, '$2');

    // Remove inline code
    text = text.replace(INLINE_CODE_REGEX, '');

    // Remove blockquote markers
    text = text.replace(BLOCKQUOTE_REGEX, '');

    // Remove list markers
    text = text.replace(LIST_MARKER_REGEX, '');
    text = text.replace(NUMBERED_LIST_REGEX, '');

    // Remove HTML tags
    text = text.replace(HTML_TAG_REGEX, '');

    return text;
  }

  /**
   * Truncate text at word boundary.
   */
  private truncateAtWord(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }

    // Find the last space before maxLength
    const truncated = text.slice(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');

    if (lastSpace > maxLength * 0.5) {
      // If we found a space in the latter half, use it
      return truncated.slice(0, lastSpace) + '...';
    }

    // Otherwise just truncate
    return truncated + '...';
  }
}
