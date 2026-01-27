# CLAUDE.md - Vault Insights Plugin

## Project Overview

**Name:** Vault Insights  
**Type:** Obsidian Community Plugin (Official Submission)  
**Purpose:** Automatically generate actionable insights from your vault - daily/weekly summaries, aggregated todo lists, topic analysis, and content visualizations.

**Core Value Proposition:** Transform your scattered notes into structured insights without leaving Obsidian. No external services, no API keys, fully offline.

---

## Features

### 1. Daily/Weekly Summaries
Generate markdown notes summarizing recent vault activity:
- Notes created/modified in the period
- Key highlights extracted from content
- Links to the actual notes

### 2. Aggregated Todo List
Create a unified task list from specified directories:
- Extract all `- [ ]` tasks from notes
- Group by source note or due date
- Track completion status
- Optional: filter by tags

### 3. Topic Frequency Analysis
Analyze what you write about most:
- Tag frequency across vault
- Heading patterns
- Link analysis (what notes connect)
- Optional: LLM-powered topic extraction via Ollama

### 4. Content Visualization
Visual charts embedded in notes:
- Pie chart: content distribution by topic/folder
- Timeline: note creation over time
- Bar chart: most active tags/topics

---

## Tech Stack

### Core
- **Language:** TypeScript (strict mode)
- **Runtime:** Obsidian (Electron + Mobile)
- **Build:** esbuild (bundled to single main.js)
- **Package Manager:** npm

### Visualization
- **Primary:** Mermaid (native Obsidian support, zero dependencies)
- **Optional:** Chart.js via ItemView (richer interactivity)

### AI (Optional)
- **Provider:** Ollama (localhost:11434)
- **Default:** Disabled - uses tag/heading extraction instead
- **Purpose:** Smart summarization, topic extraction

---

## Project Structure

```
vault-insights/
├── CLAUDE.md                 # This file - project context
├── manifest.json             # Obsidian plugin manifest
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── esbuild.config.mjs        # Build configuration
├── main.ts                   # Plugin entry point
├── styles.css                # Optional styling
└── src/
    ├── types.ts              # Shared interfaces
    ├── settings.ts           # Settings tab UI
    ├── constants.ts          # Default values, patterns
    │
    ├── core/
    │   ├── scanner.ts        # Vault scanning, file filtering
    │   ├── cache.ts          # Caching layer for performance
    │   └── scheduler.ts      # Scheduled generation (optional)
    │
    ├── extractors/
    │   ├── tasks.ts          # Task/checkbox extraction
    │   ├── topics.ts         # Tag, heading, link analysis
    │   ├── content.ts        # Content snippets, highlights
    │   └── metadata.ts       # Frontmatter parsing
    │
    ├── generators/
    │   ├── daily-summary.ts  # Daily summary note
    │   ├── weekly-summary.ts # Weekly summary note
    │   ├── todo-list.ts      # Aggregated task list
    │   └── insights.ts       # Topic analysis note
    │
    ├── visualizations/
    │   ├── mermaid.ts        # Mermaid chart generation
    │   ├── templates.ts      # Chart templates
    │   └── insights-view.ts  # Optional ItemView for charts
    │
    └── integrations/
        └── ollama.ts         # Optional Ollama integration
```

---

## Architecture Decisions

### AD-001: Mermaid for Visualizations
**Decision:** Use Mermaid charts as the primary visualization method.

**Rationale:**
- Native Obsidian support (zero dependencies)
- Works on mobile
- Renders in markdown notes (portable)
- Supports pie, bar (xychart-beta), timeline, flowchart

**Trade-offs:**
- Less interactive than Chart.js
- Limited chart types compared to D3

### AD-002: MetadataCache for Extraction
**Decision:** Use Obsidian's MetadataCache instead of parsing markdown ourselves.

**Rationale:**
- Already parsed and cached by Obsidian
- Provides tags, headings, links, listItems (tasks!)
- Faster than re-reading files
- Stays in sync automatically

**Usage:**
```typescript
const cache = this.app.metadataCache.getFileCache(file);
// cache.tags - all #tags
// cache.headings - all headers
// cache.links - all [[links]]
// cache.listItems - all list items including tasks
// cache.frontmatter - YAML frontmatter
```

### AD-003: Ollama as Optional Enhancement
**Decision:** AI features are opt-in and use local Ollama only.

**Rationale:**
- Respects Obsidian's "local-first" philosophy
- No API keys or accounts needed
- User controls their data
- Graceful fallback to pattern-based extraction

**Implementation:**
```typescript
// Check if Ollama is configured and available
if (this.settings.ollamaEnabled) {
  try {
    const topics = await this.extractTopicsWithLLM(content);
  } catch {
    // Fallback to tag-based extraction
    const topics = this.extractTopicsFromTags(content);
  }
}
```

### AD-004: Mobile Compatible Core
**Decision:** All core features must work on mobile.

**Rationale:**
- Larger user base
- No Node.js APIs in core functionality
- Ollama features clearly marked as desktop-only

**Constraints:**
- No `fs`, `path`, or other Node modules in core
- Use Obsidian's Vault API exclusively
- Test on mobile before release

### AD-005: Generated Notes, Not Views
**Decision:** Generate actual markdown notes rather than custom views for insights.

**Rationale:**
- Notes are searchable and linkable
- Work with Obsidian Publish
- No custom UI maintenance
- Users can edit/customize output
- Portable outside Obsidian

---

## Code Conventions

### TypeScript

```typescript
// ✅ DO: Use explicit types
interface InsightNote {
  title: string;
  content: string;
  path: string;
  createdAt: Date;
}

// ✅ DO: Use Obsidian's types
import { TFile, TFolder, CachedMetadata } from 'obsidian';

async function getRecentNotes(days: number): Promise<TFile[]> {
  // ...
}

// ✅ DO: Handle nullable cache
const cache = this.app.metadataCache.getFileCache(file);
const tags = cache?.tags?.map(t => t.tag) ?? [];

// ❌ DON'T: Assume cache exists
const tags = cache.tags.map(t => t.tag); // Crash if no tags!
```

### Obsidian API Patterns

```typescript
// ✅ DO: Use cachedRead for reading (faster)
const content = await this.app.vault.cachedRead(file);

// ✅ DO: Check if file exists before creating
const exists = this.app.vault.getAbstractFileByPath(path);
if (!exists) {
  await this.app.vault.create(path, content);
} else {
  await this.app.vault.modify(exists as TFile, content);
}

// ✅ DO: Use registerInterval for cleanup
this.registerInterval(
  window.setInterval(() => this.checkSchedule(), 60000)
);

// ✅ DO: Filter files properly
const markdownFiles = this.app.vault.getMarkdownFiles();
const inFolder = markdownFiles.filter(f => 
  f.path.startsWith(this.settings.targetFolder)
);

// ❌ DON'T: Use Node.js APIs (breaks mobile)
import * as fs from 'fs'; // Bad!
import * as path from 'path'; // Bad!
```

### Mermaid Generation

```typescript
// ✅ DO: Generate clean, valid Mermaid
function generatePieChart(data: Map<string, number>): string {
  const lines = ['```mermaid', 'pie showData title Content Distribution'];
  
  for (const [label, value] of data) {
    // Escape quotes in labels
    const safeLabel = label.replace(/"/g, '\\"');
    lines.push(`    "${safeLabel}" : ${value}`);
  }
  
  lines.push('```');
  return lines.join('\n');
}

// ✅ DO: Limit chart items for readability
const topItems = [...data.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10); // Max 10 items

// ✅ DO: Provide fallback for empty data
if (data.size === 0) {
  return '> No data available for visualization.';
}
```

### Task Extraction

```typescript
// ✅ DO: Use MetadataCache for tasks
function extractTasks(file: TFile): Task[] {
  const cache = this.app.metadataCache.getFileCache(file);
  if (!cache?.listItems) return [];
  
  return cache.listItems
    .filter(item => item.task !== undefined)
    .map(item => ({
      text: item.task === ' ' ? 'pending' : 'completed',
      line: item.position.start.line,
      file: file.path
    }));
}

// ✅ DO: Also support regex for task text extraction
const TASK_REGEX = /^[\s]*[-*]\s*\[([ xX])\]\s*(.+)$/gm;

function extractTaskText(content: string): TaskWithText[] {
  const tasks: TaskWithText[] = [];
  let match;
  
  while ((match = TASK_REGEX.exec(content)) !== null) {
    tasks.push({
      completed: match[1].toLowerCase() === 'x',
      text: match[2].trim()
    });
  }
  
  return tasks;
}
```

### Settings Pattern

```typescript
// ✅ DO: Define comprehensive defaults
interface VaultInsightsSettings {
  // Summary settings
  summaryFolder: string;
  dailySummaryEnabled: boolean;
  weeklySummaryEnabled: boolean;
  summaryTime: string;
  
  // Todo settings
  todoSourceFolders: string[];
  todoExcludeFolders: string[];
  todoGroupBy: 'file' | 'date' | 'tag';
  
  // Topic settings
  topicSources: ('tags' | 'headings' | 'links')[];
  maxTopics: number;
  
  // Ollama settings
  ollamaEnabled: boolean;
  ollamaUrl: string;
  ollamaModel: string;
  
  // Visualization settings
  chartType: 'mermaid' | 'chartjs';
  maxChartItems: number;
}

const DEFAULT_SETTINGS: VaultInsightsSettings = {
  summaryFolder: 'Insights',
  dailySummaryEnabled: true,
  weeklySummaryEnabled: true,
  summaryTime: '09:00',
  
  todoSourceFolders: [],
  todoExcludeFolders: ['templates', 'archive'],
  todoGroupBy: 'file',
  
  topicSources: ['tags', 'headings'],
  maxTopics: 20,
  
  ollamaEnabled: false,
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'llama3',
  
  chartType: 'mermaid',
  maxChartItems: 10,
};
```

### Error Handling

```typescript
// ✅ DO: Provide helpful error messages
try {
  await this.generateDailySummary();
  new Notice('Daily summary created!');
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes('ENOENT')) {
      new Notice('Could not create summary: folder does not exist');
    } else {
      new Notice(`Summary failed: ${error.message}`);
    }
  }
  console.error('[VaultInsights] Summary generation failed:', error);
}

// ✅ DO: Graceful Ollama fallback
async function extractTopics(content: string): Promise<string[]> {
  if (this.settings.ollamaEnabled) {
    try {
      return await this.extractWithOllama(content);
    } catch (error) {
      console.warn('[VaultInsights] Ollama unavailable, using fallback');
      // Fall through to tag-based extraction
    }
  }
  
  return this.extractFromTags(content);
}
```

---

## Naming Conventions

```typescript
// Files: kebab-case
// src/daily-summary.ts, src/topic-extractor.ts

// Interfaces: PascalCase, descriptive
interface DailySummary { }
interface TopicAnalysis { }
interface TaskItem { }

// Types: PascalCase
type ChartType = 'mermaid' | 'chartjs';
type GroupBy = 'file' | 'date' | 'tag';

// Functions: camelCase, verb-first
async function generateDailySummary() { }
function extractTasks() { }
function buildMermaidChart() { }
function isValidFolder() { }

// Constants: SCREAMING_SNAKE_CASE
const DEFAULT_SUMMARY_FOLDER = 'Insights';
const MAX_CHART_ITEMS = 10;
const TASK_REGEX = /pattern/;

// View types: SCREAMING_SNAKE_CASE
const VIEW_TYPE_INSIGHTS = 'vault-insights-view';
```

---

## Commands

The plugin should register these commands:

| Command ID | Name | Description |
|------------|------|-------------|
| `generate-daily-summary` | Generate daily summary | Create today's summary note |
| `generate-weekly-summary` | Generate weekly summary | Create this week's summary note |
| `generate-todo-list` | Generate todo list | Aggregate tasks from configured folders |
| `generate-topic-analysis` | Analyze vault topics | Create topic frequency analysis |
| `open-insights-view` | Open insights dashboard | (If Chart.js view implemented) |
| `refresh-insights` | Refresh all insights | Regenerate all insight notes |

---

## Testing Checklist

Before marking a feature complete:

- [ ] TypeScript compiles without errors
- [ ] Works with empty vault
- [ ] Works with large vault (1000+ notes)
- [ ] Works on mobile (test in mobile app)
- [ ] Mermaid charts render correctly
- [ ] Settings persist across restarts
- [ ] Commands appear in palette
- [ ] No console errors on load/unload
- [ ] Ollama gracefully fails when unavailable

---

## Security & Privacy

### Local-First
- All processing happens locally
- No data leaves the device (except optional Ollama on localhost)
- No telemetry or analytics

### Ollama Disclosure
- README clearly states Ollama is optional
- Settings show Ollama is for local AI only
- No cloud LLM options

### File Safety
- Never delete user files
- Create new files, don't overwrite without confirmation
- Use clearly identifiable output folder

---

## Performance Guidelines

### Scanning
```typescript
// ✅ DO: Batch operations
const files = this.app.vault.getMarkdownFiles();
const caches = files.map(f => ({
  file: f,
  cache: this.app.metadataCache.getFileCache(f)
}));

// ✅ DO: Filter early
const recentFiles = files.filter(f => f.stat.mtime > cutoff);

// ❌ DON'T: Read all file contents into memory
const allContents = await Promise.all(
  files.map(f => this.app.vault.read(f)) // Could be huge!
);
```

### Caching
```typescript
// ✅ DO: Cache expensive computations
private topicCache: Map<string, string[]> = new Map();

async getTopics(file: TFile): Promise<string[]> {
  const cached = this.topicCache.get(file.path);
  if (cached && file.stat.mtime === this.lastMtime.get(file.path)) {
    return cached;
  }
  
  const topics = await this.extractTopics(file);
  this.topicCache.set(file.path, topics);
  this.lastMtime.set(file.path, file.stat.mtime);
  return topics;
}
```

---

## Dependencies

### Required (bundled)
```json
{
  // None for core functionality!
}
```

### Optional (bundled if Chart.js view used)
```json
{
  "chart.js": "^4.0.0"
}
```

### Dev Dependencies
```json
{
  "@types/node": "^16.11.6",
  "typescript": "^5.0.0",
  "obsidian": "latest",
  "esbuild": "^0.17.0",
  "@typescript-eslint/eslint-plugin": "^6.0.0",
  "@typescript-eslint/parser": "^6.0.0",
  "eslint": "^8.0.0"
}
```

---

## Manifest Configuration

```json
{
  "id": "vault-insights",
  "name": "Vault Insights",
  "version": "1.0.0",
  "minAppVersion": "1.0.0",
  "description": "Generate daily summaries, aggregate todos, analyze topics, and visualize your vault content.",
  "author": "Your Name",
  "authorUrl": "https://github.com/yourusername",
  "isDesktopOnly": false,
  "fundingUrl": ""
}
```

Note: `isDesktopOnly: false` because core features work on mobile. Ollama features will gracefully fail on mobile.

---

## Quick Reference

### Key Obsidian APIs
```typescript
// Files
this.app.vault.getMarkdownFiles(): TFile[]
this.app.vault.cachedRead(file): Promise<string>
this.app.vault.create(path, content): Promise<TFile>
this.app.vault.modify(file, content): Promise<void>

// Metadata
this.app.metadataCache.getFileCache(file): CachedMetadata | null

// CachedMetadata contains:
// - frontmatter: Record<string, any>
// - tags: TagCache[] (tag, position)
// - headings: HeadingCache[] (heading, level, position)
// - links: LinkCache[] (link, displayText, position)
// - listItems: ListItemCache[] (task, position, parent)

// UI
new Notice(message): void
this.addCommand({ id, name, callback }): void
this.registerView(type, factory): void
this.addSettingTab(tab): void
```

### Mermaid Chart Types
```
pie - Pie chart (topic distribution)
xychart-beta - Bar/line charts
timeline - Timeline visualization
flowchart - Relationship diagrams
```

### Ollama API
```
POST http://localhost:11434/api/generate
{
  "model": "llama3",
  "prompt": "...",
  "stream": false
}
```
