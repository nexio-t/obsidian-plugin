import type { TFile, CachedMetadata } from 'obsidian';
import type { ExtractedTask, TaskMarker, TaskPriority, TaskStatus } from '../types';

// Regex patterns for task extraction
const TASK_LINE_REGEX = /^[\s]*[-*]\s*\[([ xX\-/>!?])\]\s*(.+)$/gm;
const INLINE_TAG_REGEX = /#[\w\-/]+/g;
const FRONTMATTER_REGEX = /^---\n[\s\S]*?\n---\n?/;
const CODE_BLOCK_REGEX = /```[\s\S]*?```/g;

// Due date patterns
const DUE_DATE_PATTERNS = [
  /@due\((\d{4}-\d{2}-\d{2})\)/,           // @due(2024-01-15)
  /\[due::\s*(\d{4}-\d{2}-\d{2})\]/,       // [due:: 2024-01-15]
  /\ud83d\udcc5\s*(\d{4}-\d{2}-\d{2})/,    // 📅 2024-01-15
  /due:\s*(\d{4}-\d{2}-\d{2})/i,           // due: 2024-01-15
];

// Priority markers
const PRIORITY_MAP: Record<string, TaskPriority> = {
  '\u23eb': 'high',    // ⏫
  '\ud83d\udd3c': 'high',    // 🔼
  '\ud83d\udd3d': 'low',     // 🔽
  '!': 'high',
  '!!': 'high',
  '!!!': 'high',
};

/**
 * Extracts tasks from Obsidian notes.
 * Supports both MetadataCache-based extraction and full-text parsing.
 */
export class TaskExtractor {
  /**
   * Extract basic task information from MetadataCache.
   * Fast but doesn't include task text content.
   */
  extractFromCache(file: TFile, cache: CachedMetadata | null): ExtractedTask[] {
    if (!cache?.listItems) {
      return [];
    }

    return cache.listItems
      .filter(item => item.task !== undefined)
      .map(item => {
        const completed = item.task === 'x' || item.task === 'X';
        return {
          text: '',
          completed,
          status: (completed ? 'completed' : 'pending') as TaskStatus,
          line: item.position.start.line,
          filePath: file.path,
          fileName: file.basename,
          tags: [],
          taskMarker: (item.task ?? ' ') as TaskMarker,
        };
      });
  }

  /**
   * Extract tasks with full text content using regex.
   * Slower but provides complete task information.
   */
  extractWithText(file: TFile, content: string): ExtractedTask[] {
    const tasks: ExtractedTask[] = [];
    const excludedRanges = this.getExcludedRanges(content);

    // Reset regex state
    TASK_LINE_REGEX.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = TASK_LINE_REGEX.exec(content)) !== null) {
      if (this.isInExcludedRange(match.index, excludedRanges)) {
        continue;
      }
      const marker = match[1] as TaskMarker;
      const text = match[2].trim();

      // Calculate line number
      const linesBefore = content.slice(0, match.index).split('\n');
      const lineNumber = linesBefore.length - 1;

      const completed = marker === 'x' || marker === 'X';
      const task: ExtractedTask = {
        text,
        completed,
        status: completed ? 'completed' : 'pending',
        line: lineNumber,
        filePath: file.path,
        fileName: file.basename,
        tags: this.extractInlineTags(text),
        taskMarker: marker,
      };

      // Extract due date
      const dueDate = this.extractDueDate(text);
      if (dueDate) {
        task.dueDate = dueDate;
      }

      // Extract priority
      const priority = this.extractPriority(text);
      if (priority) {
        task.priority = priority;
      }

      tasks.push(task);
    }

    return tasks;
  }

  /**
   * Extract inline tags from task text.
   */
  private extractInlineTags(text: string): string[] {
    const matches = text.match(INLINE_TAG_REGEX);
    if (!matches) {
      return [];
    }

    return matches.map(tag => tag.slice(1)); // Remove # prefix
  }

  private getExcludedRanges(content: string): Array<{ start: number; end: number }> {
    const ranges: Array<{ start: number; end: number }> = [];

    // Frontmatter (only if at start of file)
    if (content.startsWith('---')) {
      const frontmatterMatch = content.match(FRONTMATTER_REGEX);
      if (frontmatterMatch?.index !== undefined) {
        ranges.push({
          start: frontmatterMatch.index,
          end: frontmatterMatch.index + frontmatterMatch[0].length,
        });
      }
    }

    // Code blocks
    CODE_BLOCK_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = CODE_BLOCK_REGEX.exec(content)) !== null) {
      ranges.push({ start: match.index, end: match.index + match[0].length });
    }

    return ranges;
  }

  private isInExcludedRange(index: number, ranges: Array<{ start: number; end: number }>): boolean {
    return ranges.some(range => index >= range.start && index < range.end);
  }

  /**
   * Extract due date from task text.
   */
  private extractDueDate(text: string): Date | undefined {
    for (const pattern of DUE_DATE_PATTERNS) {
      const match = text.match(pattern);
      if (match?.[1]) {
        const date = new Date(match[1]);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }
    return undefined;
  }

  /**
   * Extract priority from task text.
   */
  private extractPriority(text: string): TaskPriority | undefined {
    // Check for emoji priorities
    for (const [marker, priority] of Object.entries(PRIORITY_MAP)) {
      if (text.includes(marker)) {
        return priority;
      }
    }

    // Check for text-based priority markers
    if (/\[priority::\s*high\]/i.test(text) || /\(A\)/.test(text)) {
      return 'high';
    }
    if (/\[priority::\s*medium\]/i.test(text) || /\(B\)/.test(text)) {
      return 'medium';
    }
    if (/\[priority::\s*low\]/i.test(text) || /\(C\)/.test(text)) {
      return 'low';
    }

    return undefined;
  }
}
