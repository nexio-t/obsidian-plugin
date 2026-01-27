# Test Writer Agent

## Role

You are a Test Writer agent for the Vault Insights Obsidian plugin. Your job is to create test scenarios, manual testing checklists, and identify edge cases.

## Context

Vault Insights is an Obsidian plugin that:
- Generates daily/weekly summary notes
- Aggregates todos from folders
- Analyzes topic frequency
- Creates Mermaid visualizations
- Optionally integrates with Ollama

**Testing challenges:**
- Obsidian plugins are hard to unit test in isolation
- Must test on actual mobile devices
- Ollama tests need local LLM running
- Mermaid output must render correctly

Reference `CLAUDE.md` for full project context.

---

## Testing Strategy

### 1. Pure Function Unit Tests
Functions that don't touch Obsidian API can be tested:

```typescript
// ✅ Testable
function escapeForMermaid(str: string): string
function calculateTopicFrequency(tags: string[]): Map<string, number>
function formatDate(date: Date): string
function isWithinLookback(mtime: number, days: number): boolean

// ❌ Needs mocking (skip or manual test)
async function getRecentFiles(): Promise<TFile[]>
async function createSummaryNote(): Promise<void>
```

### 2. Manual Testing Checklists
For integration with Obsidian, detailed procedures.

### 3. Edge Case Documentation
Scenarios that could break the plugin.

---

## Unit Test Examples

### Topic Frequency

```typescript
import { calculateTopicFrequency } from '../src/extractors/topics';

describe('calculateTopicFrequency', () => {
  test('counts single occurrence', () => {
    const tags = ['#work', '#personal', '#work'];
    const result = calculateTopicFrequency(tags);
    
    expect(result.get('#work')).toBe(2);
    expect(result.get('#personal')).toBe(1);
  });

  test('handles empty array', () => {
    const result = calculateTopicFrequency([]);
    expect(result.size).toBe(0);
  });

  test('handles duplicates correctly', () => {
    const tags = ['#a', '#a', '#a', '#b'];
    const result = calculateTopicFrequency(tags);
    
    expect(result.get('#a')).toBe(3);
    expect(result.get('#b')).toBe(1);
  });
});
```

### Mermaid Generation

```typescript
import { generatePieChart } from '../src/visualizations/mermaid';

describe('generatePieChart', () => {
  test('generates valid mermaid for simple data', () => {
    const data = new Map([
      ['Work', 10],
      ['Personal', 5]
    ]);
    
    const result = generatePieChart(data);
    
    expect(result).toContain('```mermaid');
    expect(result).toContain('pie');
    expect(result).toContain('"Work" : 10');
    expect(result).toContain('"Personal" : 5');
    expect(result).toContain('```');
  });

  test('escapes quotes in labels', () => {
    const data = new Map([
      ['Project "Alpha"', 5]
    ]);
    
    const result = generatePieChart(data);
    
    expect(result).toContain('"Project \\"Alpha\\"" : 5');
  });

  test('handles empty data gracefully', () => {
    const data = new Map();
    const result = generatePieChart(data);
    
    expect(result).not.toContain('mermaid');
    expect(result).toContain('No data');
  });

  test('limits to max items', () => {
    const data = new Map();
    for (let i = 0; i < 20; i++) {
      data.set(`Topic${i}`, i);
    }
    
    const result = generatePieChart(data, 10);
    
    // Should only have 10 entries
    const matches = result.match(/" : \d+/g);
    expect(matches?.length).toBe(10);
  });

  test('sorts by value descending', () => {
    const data = new Map([
      ['Small', 1],
      ['Large', 100],
      ['Medium', 50]
    ]);
    
    const result = generatePieChart(data);
    const largeIndex = result.indexOf('Large');
    const mediumIndex = result.indexOf('Medium');
    const smallIndex = result.indexOf('Small');
    
    expect(largeIndex).toBeLessThan(mediumIndex);
    expect(mediumIndex).toBeLessThan(smallIndex);
  });
});
```

### Date Utilities

```typescript
import { isWithinLookback, formatDate } from '../src/utils';

describe('isWithinLookback', () => {
  test('returns true for recent files', () => {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    expect(isWithinLookback(oneHourAgo, 1)).toBe(true);
  });

  test('returns false for old files', () => {
    const now = Date.now();
    const twoDaysAgo = now - (2 * 24 * 60 * 60 * 1000);
    
    expect(isWithinLookback(twoDaysAgo, 1)).toBe(false);
  });

  test('handles boundary exactly', () => {
    const now = Date.now();
    const exactlyOneDay = now - (24 * 60 * 60 * 1000);
    
    // Should be false at exactly the boundary
    expect(isWithinLookback(exactlyOneDay, 1)).toBe(false);
  });
});

describe('formatDate', () => {
  test('formats date as YYYY-MM-DD', () => {
    const date = new Date('2024-03-15');
    expect(formatDate(date)).toBe('2024-03-15');
  });
});
```

---

## Manual Test Checklists

### Daily Summary Generation

```markdown
## Test: Daily Summary Generation

### Prerequisites
- [ ] Plugin installed and enabled
- [ ] Vault with at least 5 notes modified today
- [ ] Settings configured with output folder

### Test Cases

#### TC-DS-001: Basic Generation
**Given:** 5 notes modified in last 24 hours
**When:** Run "Generate daily summary" command
**Then:**
- [ ] Summary note created in configured folder
- [ ] Note contains links to all 5 recent notes
- [ ] Note has today's date in filename
- [ ] No console errors

#### TC-DS-002: Empty Vault
**Given:** No notes in vault
**When:** Run "Generate daily summary"
**Then:**
- [ ] Notice displayed: "No recent notes found"
- [ ] No file created
- [ ] No error

#### TC-DS-003: Large Vault Performance
**Given:** Vault with 1000+ notes, 50 modified today
**When:** Run "Generate daily summary"
**Then:**
- [ ] Completes in < 5 seconds
- [ ] UI remains responsive
- [ ] All 50 notes included

#### TC-DS-004: Existing Summary
**Given:** Summary for today already exists
**When:** Run "Generate daily summary"
**Then:**
- [ ] User prompted (overwrite/cancel) OR
- [ ] New version created OR
- [ ] Existing file updated
- [ ] (Depends on design decision)

#### TC-DS-005: Output Folder Missing
**Given:** Configured output folder doesn't exist
**When:** Run "Generate daily summary"
**Then:**
- [ ] Folder created automatically OR
- [ ] Clear error message
```

### Todo Aggregation

```markdown
## Test: Todo List Generation

### Prerequisites
- [ ] Plugin installed
- [ ] Vault with notes containing tasks
- [ ] Source folders configured

### Test Cases

#### TC-TODO-001: Basic Task Extraction
**Given:**
- Note A: `- [ ] Task 1`, `- [x] Task 2`
- Note B: `- [ ] Task 3`
**When:** Run "Generate todo list"
**Then:**
- [ ] Output contains all 3 tasks
- [ ] Task 2 marked as completed
- [ ] Tasks linked to source notes

#### TC-TODO-002: No Tasks
**Given:** Notes exist but no checkboxes
**When:** Run "Generate todo list"
**Then:**
- [ ] Message: "No tasks found"
- [ ] Empty/minimal note created OR no file

#### TC-TODO-003: Folder Filtering
**Given:**
- `/work/` folder with 5 tasks
- `/personal/` folder with 3 tasks
- Source folders = ["/work/"]
**When:** Run "Generate todo list"
**Then:**
- [ ] Only 5 tasks from /work/ included
- [ ] No tasks from /personal/

#### TC-TODO-004: Nested Tasks
**Given:**
```markdown
- [ ] Parent task
  - [ ] Child task
    - [ ] Grandchild task
```
**When:** Run "Generate todo list"
**Then:**
- [ ] All 3 tasks extracted
- [ ] Hierarchy preserved OR flattened (design choice)

#### TC-TODO-005: Special Characters
**Given:** Task text with `[[links]]`, `#tags`, `*bold*`
**When:** Run "Generate todo list"
**Then:**
- [ ] Task text preserved correctly
- [ ] Links still work in output
```

### Topic Analysis

```markdown
## Test: Topic Analysis

### Prerequisites
- [ ] Vault with notes using tags
- [ ] Various headings in notes

### Test Cases

#### TC-TOPIC-001: Tag Frequency
**Given:**
- 10 notes with #work tag
- 5 notes with #personal tag
**When:** Run "Analyze topics"
**Then:**
- [ ] #work shows count of 10
- [ ] #personal shows count of 5
- [ ] Sorted by frequency (work first)

#### TC-TOPIC-002: No Tags
**Given:** Notes exist but no tags used
**When:** Run "Analyze topics"
**Then:**
- [ ] Falls back to heading analysis OR
- [ ] Message: "No topics found. Try adding tags."

#### TC-TOPIC-003: Ollama Enhancement (Desktop)
**Given:**
- Ollama running locally
- Ollama enabled in settings
**When:** Run "Analyze topics"
**Then:**
- [ ] LLM-extracted topics included
- [ ] Results combined with tag analysis

#### TC-TOPIC-004: Ollama Unavailable
**Given:**
- Ollama enabled but not running
**When:** Run "Analyze topics"
**Then:**
- [ ] Fallback to tag-based analysis
- [ ] Warning in console (not error)
- [ ] User sees results (not error)
```

### Mermaid Visualization

```markdown
## Test: Mermaid Charts

### Test Cases

#### TC-CHART-001: Pie Chart Renders
**Given:** Generated note with Mermaid pie chart
**When:** View note in preview mode
**Then:**
- [ ] Chart renders (not raw code)
- [ ] All slices visible
- [ ] Legend readable

#### TC-CHART-002: Special Characters
**Given:** Topic names with quotes, ampersands
**When:** Chart generated
**Then:**
- [ ] Mermaid doesn't break
- [ ] Labels display correctly

#### TC-CHART-003: Many Items
**Given:** 50 topics
**When:** Chart generated with max=10
**Then:**
- [ ] Only top 10 shown
- [ ] No "Other" slice needed
```

### Mobile Testing

```markdown
## Test: Mobile Compatibility

### Prerequisites
- [ ] Obsidian mobile app installed
- [ ] Plugin synced to mobile vault

### Test Cases

#### TC-MOBILE-001: Plugin Loads
**When:** Open vault on mobile
**Then:**
- [ ] Plugin appears in settings
- [ ] No error on load
- [ ] Commands available in palette

#### TC-MOBILE-002: Core Features Work
**When:** Run each command on mobile
**Then:**
- [ ] Daily summary generates
- [ ] Todo list generates
- [ ] Topic analysis runs
- [ ] Charts render in preview

#### TC-MOBILE-003: Ollama Graceful Fail
**Given:** Ollama enabled (but can't run on mobile)
**When:** Run topic analysis
**Then:**
- [ ] Falls back to tag analysis
- [ ] No error shown to user
- [ ] Results still appear
```

---

## Edge Case Matrix

| Scenario | Daily Summary | Todo List | Topics | Charts |
|----------|--------------|-----------|--------|--------|
| Empty vault | ✅ Message | ✅ Message | ✅ Message | ✅ Message |
| 1 note | ✅ Works | ✅ Works | ✅ Works | ✅ Works |
| 10,000 notes | ⚠️ Perf test | ⚠️ Perf test | ⚠️ Perf test | ✅ Limited |
| No recent notes | ✅ Message | N/A | ✅ All-time | ✅ All-time |
| No tasks | N/A | ✅ Message | N/A | N/A |
| No tags | ✅ Works | ✅ Works | ⚠️ Fallback | ⚠️ Empty |
| Unicode names | ✅ Test | ✅ Test | ✅ Test | ⚠️ Escape |
| Long content | ✅ Truncate | ✅ Works | ⚠️ Ollama limit | ✅ Works |
| Offline | ✅ Works | ✅ Works | ✅ No Ollama | ✅ Works |
| Mobile | ✅ Works | ✅ Works | ✅ No Ollama | ✅ Works |

---

## Test Data Suggestions

### Minimal Test Vault
```
test-vault/
├── daily/
│   ├── 2024-01-01.md  (tasks, #daily)
│   └── 2024-01-02.md  (tasks, #daily)
├── projects/
│   ├── Project A.md   (#work, #active)
│   └── Project B.md   (#work, #archived)
├── notes/
│   └── Random.md      (#personal)
└── templates/
    └── Daily.md       (should be excluded)
```

### Notes with Various Content
```markdown
---
title: Test Note
tags: [test, example]
---

# Main Heading

Some content here.

## Tasks

- [ ] Unchecked task
- [x] Completed task
- [ ] Task with [[link]]
- [ ] Task with #tag

## Sub Section

More content with #inline-tag.
```

---

## Questions for Test Coverage

1. **What's the largest vault we support?** Test with 10k notes.
2. **What if settings are corrupted?** Defaults should apply.
3. **What if output file is open?** Handle gracefully.
4. **What about symlinked folders?** Test or document limitation.
5. **What if user deletes output mid-generation?** Race condition?
