/**
 * Tests for date utilities in src/generators/base.ts
 *
 * The date utility functions are protected methods in BaseGenerator.
 * We test them by creating a TestableBaseGenerator subclass that exposes them.
 */

// Mock obsidian module before any imports
jest.mock('obsidian', () => ({
  App: class {
    vault = {
      getMarkdownFiles: jest.fn(() => []),
      cachedRead: jest.fn(async () => ''),
      create: jest.fn(async () => ({ path: 'new-file.md' })),
      modify: jest.fn(async () => {}),
      createFolder: jest.fn(async () => {}),
      getAbstractFileByPath: jest.fn(() => null),
    };
    metadataCache = { getFileCache: jest.fn(() => null) };
    workspace = { getLeaf: jest.fn(() => ({ openFile: jest.fn() })) };
  },
  TFile: class {
    path: string;
    basename: string;
    stat = { ctime: Date.now(), mtime: Date.now(), size: 0 };
    constructor(path: string) {
      this.path = path;
      this.basename = path.replace(/\.md$/, '').split('/').pop() || '';
    }
  },
  Notice: class { constructor() {} },
}));

import { VaultInsightsSettings, DEFAULT_SETTINGS, GeneratedNote } from '../../src/types';
import { BaseGenerator } from '../../src/generators/base';

/**
 * Testable subclass that exposes protected methods for testing
 */
class TestableBaseGenerator extends BaseGenerator {
  // Implement abstract method
  async generate(): Promise<GeneratedNote> {
    return {
      title: 'Test',
      path: 'test.md',
      content: '',
      frontmatter: {
        title: 'Test',
        generated: new Date().toISOString(),
        generator: 'test',
      },
    };
  }

  // Expose protected methods
  public testFormatDate(date: Date): string {
    return this.formatDate(date);
  }

  public testFormatDateDisplay(date: Date): string {
    return this.formatDateDisplay(date);
  }

  public testGetStartOfDay(date: Date): number {
    return this.getStartOfDay(date);
  }

  public testGetEndOfDay(date: Date): number {
    return this.getEndOfDay(date);
  }

  public testGetStartOfWeek(date: Date): Date {
    return this.getStartOfWeek(date);
  }

  public testGetEndOfWeek(date: Date): Date {
    return this.getEndOfWeek(date);
  }

  public testWikilink(path: string, displayText?: string): string {
    return this.wikilink(path, displayText);
  }

  public testGetISOTimestamp(): string {
    return this.getISOTimestamp();
  }
}

describe('BaseGenerator Date Utilities', () => {
  let generator: TestableBaseGenerator;

  beforeEach(() => {
    const mockApp = {
      vault: {
        getMarkdownFiles: jest.fn(() => []),
        cachedRead: jest.fn(async () => ''),
        create: jest.fn(async () => ({ path: 'new-file.md' })),
        modify: jest.fn(async () => {}),
        createFolder: jest.fn(async () => {}),
        getAbstractFileByPath: jest.fn(() => null),
      },
      metadataCache: { getFileCache: jest.fn(() => null) },
      workspace: { getLeaf: jest.fn(() => ({ openFile: jest.fn() })) },
    };
    generator = new TestableBaseGenerator(
      mockApp as any,
      { ...DEFAULT_SETTINGS }
    );
  });

  // ============================================================================
  // formatDate Tests
  // ============================================================================

  describe('formatDate', () => {
    it('should format date as YYYY-MM-DD', () => {
      const date = new Date(2024, 0, 15); // January 15, 2024
      expect(generator.testFormatDate(date)).toBe('2024-01-15');
    });

    it('should pad single-digit months with zero', () => {
      const date = new Date(2024, 5, 1); // June 1, 2024
      expect(generator.testFormatDate(date)).toBe('2024-06-01');
    });

    it('should pad single-digit days with zero', () => {
      const date = new Date(2024, 11, 5); // December 5, 2024
      expect(generator.testFormatDate(date)).toBe('2024-12-05');
    });

    it('should handle first day of year', () => {
      const date = new Date(2024, 0, 1);
      expect(generator.testFormatDate(date)).toBe('2024-01-01');
    });

    it('should handle last day of year', () => {
      const date = new Date(2024, 11, 31);
      expect(generator.testFormatDate(date)).toBe('2024-12-31');
    });

    it('should handle leap year date', () => {
      const date = new Date(2024, 1, 29); // Feb 29, 2024 (leap year)
      expect(generator.testFormatDate(date)).toBe('2024-02-29');
    });

    it('should handle double-digit months and days', () => {
      const date = new Date(2024, 10, 25); // November 25, 2024
      expect(generator.testFormatDate(date)).toBe('2024-11-25');
    });
  });

  // ============================================================================
  // formatDateDisplay Tests
  // ============================================================================

  describe('formatDateDisplay', () => {
    it('should format date as readable string', () => {
      const date = new Date(2024, 0, 15);
      const result = generator.testFormatDateDisplay(date);

      // Format should be like "January 15, 2024"
      expect(result).toContain('January');
      expect(result).toContain('15');
      expect(result).toContain('2024');
    });

    it('should include full month name', () => {
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];

      months.forEach((monthName, index) => {
        const date = new Date(2024, index, 15);
        expect(generator.testFormatDateDisplay(date)).toContain(monthName);
      });
    });
  });

  // ============================================================================
  // getStartOfDay Tests
  // ============================================================================

  describe('getStartOfDay', () => {
    it('should return midnight timestamp', () => {
      const date = new Date(2024, 0, 15, 14, 30, 45, 123);
      const startOfDay = generator.testGetStartOfDay(date);
      const resultDate = new Date(startOfDay);

      expect(resultDate.getHours()).toBe(0);
      expect(resultDate.getMinutes()).toBe(0);
      expect(resultDate.getSeconds()).toBe(0);
      expect(resultDate.getMilliseconds()).toBe(0);
    });

    it('should preserve the same date', () => {
      const date = new Date(2024, 5, 20, 23, 59, 59);
      const startOfDay = generator.testGetStartOfDay(date);
      const resultDate = new Date(startOfDay);

      expect(resultDate.getFullYear()).toBe(2024);
      expect(resultDate.getMonth()).toBe(5);
      expect(resultDate.getDate()).toBe(20);
    });

    it('should handle midnight input', () => {
      const date = new Date(2024, 0, 1, 0, 0, 0, 0);
      const startOfDay = generator.testGetStartOfDay(date);
      expect(startOfDay).toBe(date.getTime());
    });

    it('should handle near-midnight times', () => {
      const date = new Date(2024, 0, 15, 23, 59, 59, 999);
      const startOfDay = generator.testGetStartOfDay(date);
      const resultDate = new Date(startOfDay);

      expect(resultDate.getDate()).toBe(15); // Still the 15th
      expect(resultDate.getHours()).toBe(0);
    });

    it('should return a number (timestamp)', () => {
      const date = new Date();
      const result = generator.testGetStartOfDay(date);
      expect(typeof result).toBe('number');
    });
  });

  // ============================================================================
  // getEndOfDay Tests
  // ============================================================================

  describe('getEndOfDay', () => {
    it('should return end of day timestamp (23:59:59.999)', () => {
      const date = new Date(2024, 0, 15, 10, 30, 0);
      const endOfDay = generator.testGetEndOfDay(date);
      const resultDate = new Date(endOfDay);

      expect(resultDate.getHours()).toBe(23);
      expect(resultDate.getMinutes()).toBe(59);
      expect(resultDate.getSeconds()).toBe(59);
      expect(resultDate.getMilliseconds()).toBe(999);
    });

    it('should preserve the same date', () => {
      const date = new Date(2024, 5, 20, 0, 0, 0);
      const endOfDay = generator.testGetEndOfDay(date);
      const resultDate = new Date(endOfDay);

      expect(resultDate.getFullYear()).toBe(2024);
      expect(resultDate.getMonth()).toBe(5);
      expect(resultDate.getDate()).toBe(20);
    });

    it('should handle already end of day', () => {
      const date = new Date(2024, 0, 1, 23, 59, 59, 999);
      const endOfDay = generator.testGetEndOfDay(date);
      expect(endOfDay).toBe(date.getTime());
    });

    it('should handle midnight input', () => {
      const date = new Date(2024, 0, 15, 0, 0, 0, 0);
      const endOfDay = generator.testGetEndOfDay(date);
      const resultDate = new Date(endOfDay);

      expect(resultDate.getDate()).toBe(15);
      expect(resultDate.getHours()).toBe(23);
    });

    it('should return a number (timestamp)', () => {
      const date = new Date();
      const result = generator.testGetEndOfDay(date);
      expect(typeof result).toBe('number');
    });
  });

  // ============================================================================
  // getStartOfWeek Tests
  // ============================================================================

  describe('getStartOfWeek', () => {
    it('should return Sunday at midnight', () => {
      // Wednesday, January 17, 2024
      const date = new Date(2024, 0, 17, 14, 30, 0);
      const startOfWeek = generator.testGetStartOfWeek(date);

      // Should be Sunday, January 14, 2024
      expect(startOfWeek.getDay()).toBe(0); // Sunday
      expect(startOfWeek.getDate()).toBe(14);
      expect(startOfWeek.getHours()).toBe(0);
      expect(startOfWeek.getMinutes()).toBe(0);
      expect(startOfWeek.getSeconds()).toBe(0);
      expect(startOfWeek.getMilliseconds()).toBe(0);
    });

    it('should return same day if already Sunday', () => {
      // Sunday, January 14, 2024
      const date = new Date(2024, 0, 14, 10, 0, 0);
      const startOfWeek = generator.testGetStartOfWeek(date);

      expect(startOfWeek.getDay()).toBe(0);
      expect(startOfWeek.getDate()).toBe(14);
    });

    it('should handle Saturday (end of week)', () => {
      // Saturday, January 20, 2024
      const date = new Date(2024, 0, 20, 23, 59, 59);
      const startOfWeek = generator.testGetStartOfWeek(date);

      // Should go back to Sunday, January 14
      expect(startOfWeek.getDay()).toBe(0);
      expect(startOfWeek.getDate()).toBe(14);
    });

    it('should handle week crossing month boundary', () => {
      // Thursday, February 1, 2024
      const date = new Date(2024, 1, 1);
      const startOfWeek = generator.testGetStartOfWeek(date);

      // Should go back to Sunday, January 28, 2024
      expect(startOfWeek.getMonth()).toBe(0); // January
      expect(startOfWeek.getDate()).toBe(28);
    });

    it('should handle week crossing year boundary', () => {
      // Wednesday, January 3, 2024
      const date = new Date(2024, 0, 3);
      const startOfWeek = generator.testGetStartOfWeek(date);

      // Should go back to Sunday, December 31, 2023
      expect(startOfWeek.getFullYear()).toBe(2023);
      expect(startOfWeek.getMonth()).toBe(11); // December
      expect(startOfWeek.getDate()).toBe(31);
    });

    it('should return a Date object', () => {
      const date = new Date();
      const result = generator.testGetStartOfWeek(date);
      expect(result instanceof Date).toBe(true);
    });
  });

  // ============================================================================
  // getEndOfWeek Tests
  // ============================================================================

  describe('getEndOfWeek', () => {
    it('should return Saturday at 23:59:59.999', () => {
      // Wednesday, January 17, 2024
      const date = new Date(2024, 0, 17, 14, 30, 0);
      const endOfWeek = generator.testGetEndOfWeek(date);

      // Should be Saturday, January 20, 2024
      expect(endOfWeek.getDay()).toBe(6); // Saturday
      expect(endOfWeek.getDate()).toBe(20);
      expect(endOfWeek.getHours()).toBe(23);
      expect(endOfWeek.getMinutes()).toBe(59);
      expect(endOfWeek.getSeconds()).toBe(59);
      expect(endOfWeek.getMilliseconds()).toBe(999);
    });

    it('should return same day if already Saturday', () => {
      // Saturday, January 20, 2024
      const date = new Date(2024, 0, 20, 10, 0, 0);
      const endOfWeek = generator.testGetEndOfWeek(date);

      expect(endOfWeek.getDay()).toBe(6);
      expect(endOfWeek.getDate()).toBe(20);
    });

    it('should handle Sunday (start of week)', () => {
      // Sunday, January 14, 2024
      const date = new Date(2024, 0, 14, 0, 0, 0);
      const endOfWeek = generator.testGetEndOfWeek(date);

      // Should go forward to Saturday, January 20
      expect(endOfWeek.getDay()).toBe(6);
      expect(endOfWeek.getDate()).toBe(20);
    });

    it('should handle week crossing month boundary', () => {
      // Sunday, January 28, 2024
      const date = new Date(2024, 0, 28);
      const endOfWeek = generator.testGetEndOfWeek(date);

      // Should go forward to Saturday, February 3, 2024
      expect(endOfWeek.getMonth()).toBe(1); // February
      expect(endOfWeek.getDate()).toBe(3);
    });

    it('should handle week crossing year boundary', () => {
      // Sunday, December 29, 2024
      const date = new Date(2024, 11, 29);
      const endOfWeek = generator.testGetEndOfWeek(date);

      // Should go forward to Saturday, January 4, 2025
      expect(endOfWeek.getFullYear()).toBe(2025);
      expect(endOfWeek.getMonth()).toBe(0); // January
      expect(endOfWeek.getDate()).toBe(4);
    });

    it('should return a Date object', () => {
      const date = new Date();
      const result = generator.testGetEndOfWeek(date);
      expect(result instanceof Date).toBe(true);
    });
  });

  // ============================================================================
  // wikilink Tests
  // ============================================================================

  describe('wikilink', () => {
    it('should create basic wikilink', () => {
      expect(generator.testWikilink('folder/note')).toBe('[[folder/note]]');
    });

    it('should strip .md extension', () => {
      expect(generator.testWikilink('folder/note.md')).toBe('[[folder/note]]');
    });

    it('should add display text when provided', () => {
      expect(generator.testWikilink('folder/note', 'Display')).toBe('[[folder/note|Display]]');
    });

    it('should handle .md extension with display text', () => {
      expect(generator.testWikilink('folder/note.md', 'My Note')).toBe('[[folder/note|My Note]]');
    });

    it('should handle paths without folder', () => {
      expect(generator.testWikilink('note')).toBe('[[note]]');
    });

    it('should handle deeply nested paths', () => {
      expect(generator.testWikilink('a/b/c/d/note.md')).toBe('[[a/b/c/d/note]]');
    });
  });

  // ============================================================================
  // getISOTimestamp Tests
  // ============================================================================

  describe('getISOTimestamp', () => {
    it('should return valid ISO 8601 string', () => {
      const timestamp = generator.testGetISOTimestamp();
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should return current time (within tolerance)', () => {
      const before = new Date().toISOString();
      const result = generator.testGetISOTimestamp();
      const after = new Date().toISOString();

      expect(result >= before).toBe(true);
      expect(result <= after).toBe(true);
    });
  });

  // ============================================================================
  // Edge Cases and Date Boundary Tests
  // ============================================================================

  describe('date boundary edge cases', () => {
    it('should handle daylight saving time transition', () => {
      // March 10, 2024 - DST begins in US
      const date = new Date(2024, 2, 10, 3, 0, 0);

      const startOfDay = new Date(generator.testGetStartOfDay(date));
      const endOfDay = new Date(generator.testGetEndOfDay(date));

      expect(startOfDay.getDate()).toBe(10);
      expect(endOfDay.getDate()).toBe(10);
    });

    it('should handle leap year February', () => {
      const leapYearFeb = new Date(2024, 1, 29);
      const formatted = generator.testFormatDate(leapYearFeb);
      expect(formatted).toBe('2024-02-29');
    });

    it('should handle non-leap year February', () => {
      const nonLeapYearFeb = new Date(2023, 1, 28);
      const formatted = generator.testFormatDate(nonLeapYearFeb);
      expect(formatted).toBe('2023-02-28');
    });

    it('should maintain date integrity when using start/end of week', () => {
      // Test a full week iteration
      for (let i = 0; i < 7; i++) {
        const date = new Date(2024, 0, 14 + i); // Jan 14-20, 2024
        const startOfWeek = generator.testGetStartOfWeek(date);
        const endOfWeek = generator.testGetEndOfWeek(date);

        // All days in the same week should have same start and end
        expect(startOfWeek.getDate()).toBe(14);
        expect(endOfWeek.getDate()).toBe(20);
      }
    });
  });
});
