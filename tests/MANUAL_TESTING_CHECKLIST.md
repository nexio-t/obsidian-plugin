# Vault Insights - Manual Testing Checklist

This document provides a comprehensive checklist for manually testing the Vault Insights plugin. Manual testing is essential for verifying functionality that cannot be easily automated, such as UI interactions, mobile compatibility, and integration with Obsidian's environment.

## Test Environment Setup

Before testing, ensure you have:

- [ ] A test vault with at least 20-50 markdown files
- [ ] Files in multiple folders (nested and flat)
- [ ] Files with various frontmatter configurations
- [ ] Files containing tasks (`- [ ]` and `- [x]`)
- [ ] Files with tags (`#tag`), headings, and internal links (`[[link]]`)
- [ ] Some files modified today
- [ ] Some files modified this week
- [ ] (Optional) Ollama installed and running on localhost:11434

---

## 1. Plugin Installation and Loading

### Installation

- [ ] Plugin installs successfully from source
- [ ] No errors in developer console during installation
- [ ] Plugin appears in Settings > Community Plugins list

### Loading/Unloading

- [ ] Plugin enables without errors
- [ ] Plugin disables without errors
- [ ] No console errors on load
- [ ] No console errors on unload
- [ ] Plugin reloads successfully after disable/enable cycle
- [ ] Obsidian restart with plugin enabled shows no errors

### Hot Reload (Development)

- [ ] Changes to source files trigger reload
- [ ] Plugin state is preserved where expected

---

## 2. Settings UI Verification

### Settings Tab Access

- [ ] Settings tab appears in Obsidian Settings
- [ ] Tab is labeled "Vault Insights"
- [ ] All settings load with correct default values

### Summary Settings Section

- [ ] "Summary Folder" text field is editable
- [ ] "Enable Daily Summaries" toggle works
- [ ] "Enable Weekly Summaries" toggle works
- [ ] "Summary Generation Time" field accepts HH:MM format
- [ ] "Daily Lookback Days" accepts valid numbers
- [ ] "Weekly Lookback Days" accepts valid numbers

### Todo Settings Section

- [ ] "Source Folders" field accepts comma-separated paths
- [ ] "Exclude Folders" field accepts comma-separated paths
- [ ] "Group By" dropdown shows: File, Date, Tag options
- [ ] "Include Completed Tasks" toggle works

### Topic Settings Section

- [ ] "Topic Sources" multi-select shows: Tags, Headings, Links
- [ ] Can select/deselect individual sources
- [ ] "Max Topics" slider/field works
- [ ] "Excluded Tags" field accepts comma-separated tags

### Ollama Settings Section

- [ ] "Enable Ollama" toggle works
- [ ] "Ollama URL" field is editable
- [ ] "Ollama Model" field is editable
- [ ] Settings are disabled when toggle is off
- [ ] "Test Connection" button (if present) works

### Visualization Settings Section

- [ ] "Chart Type" dropdown shows: Mermaid, Chart.js options
- [ ] "Max Chart Items" slider/field works

### Section Visibility Settings

- [ ] "Show AI Summary" toggle works
- [ ] "Show Charts" toggle works
- [ ] "Show File List" toggle works
- [ ] "Show Topic Table" toggle works

### Settings Persistence

- [ ] Settings persist after closing settings modal
- [ ] Settings persist after Obsidian restart
- [ ] Modified settings are correctly saved to data.json

---

## 3. Commands

### Command Palette Access

- [ ] All commands appear in command palette (Ctrl/Cmd+P)
- [ ] Commands are searchable by name
- [ ] Commands are grouped under "Vault Insights" prefix

### Available Commands

| Command | Expected Behavior | Status |
|---------|-------------------|--------|
| Generate daily summary | Creates daily summary note | [ ] |
| Generate weekly summary | Creates weekly summary note | [ ] |
| Generate todo list | Creates aggregated todo list | [ ] |
| Generate topic analysis (Insights) | Creates vault insights note | [ ] |
| Refresh all insights | Regenerates all insight notes | [ ] |

### Command Execution

- [ ] Each command shows a Notice on success
- [ ] Each command shows appropriate Notice on failure
- [ ] Commands do not hang or freeze Obsidian
- [ ] Commands work when vault is empty (graceful empty state)

---

## 4. Daily Summary Generation

### Basic Generation

- [ ] Command creates note in configured folder
- [ ] Note is created with correct filename format: `Daily Summary - YYYY-MM-DD.md`
- [ ] Note opens after generation (or notification appears)

### Content Verification

- [ ] Frontmatter includes: title, generated, generator, period, startDate, endDate, tags
- [ ] Title header shows formatted date (e.g., "January 15, 2024")
- [ ] Overview section shows: Notes Created, Notes Modified, Words Written, Total Tasks, Completed Tasks
- [ ] Most Active Note link appears when applicable

### File List Section

- [ ] Lists all notes touched today
- [ ] Each file is a working wikilink
- [ ] Empty state message appears when no files modified

### Topics Section

- [ ] Topics are extracted from configured sources
- [ ] Topic chart renders correctly (if charts enabled)
- [ ] Topic table shows: Rank, Topic, Count, Source
- [ ] Topics are sorted by count (descending)

### Section Visibility

- [ ] Disabling "Show AI Summary" hides AI section
- [ ] Disabling "Show Charts" hides charts
- [ ] Disabling "Show File List" hides file list
- [ ] Disabling "Show Topic Table" hides topic table

### Edge Cases

- [ ] Works on day with no file modifications
- [ ] Works with very large number of files (50+)
- [ ] Works with files containing special characters in names

---

## 5. Weekly Summary Generation

### Basic Generation

- [ ] Command creates note in configured folder
- [ ] Note is created with correct filename: `Weekly Summary - YYYY-MM-DD to YYYY-MM-DD.md`
- [ ] Week boundaries are correct (Sunday to Saturday)

### Content Verification

- [ ] Frontmatter is correctly populated
- [ ] Title shows date range in readable format
- [ ] Daily Summary links appear if daily summaries exist
- [ ] Overview metrics are accurate for the week

### Daily Activity Chart

- [ ] Shows activity for each day of week (Sun-Sat)
- [ ] Bar heights correspond to file activity counts
- [ ] Chart renders correctly in Mermaid

### Topic Distribution

- [ ] Topics aggregate across all files in the week
- [ ] Chart and table reflect weekly data

### Notes List

- [ ] Lists all notes touched during the week
- [ ] Limits to 50 items with "...and X more" message

---

## 6. Todo List Generation

### Basic Generation

- [ ] Command creates note in Todos subfolder
- [ ] Filename format: `Todo List - YYYY-MM-DD.md`

### Task Extraction

- [ ] Extracts `- [ ]` tasks correctly
- [ ] Extracts `- [x]` tasks correctly
- [ ] Respects source folder configuration
- [ ] Respects exclude folder configuration

### Summary Section

- [ ] Shows Total Tasks count
- [ ] Shows Pending count
- [ ] Shows Completed count
- [ ] Task completion chart renders

### Include Completed Toggle

- [ ] When OFF: Only pending tasks shown
- [ ] When ON: Both pending and completed sections appear
- [ ] Completed tasks show with `[x]` checkbox

### Grouping (todoGroupBy)

#### Group by File

- [ ] Tasks grouped under file path headers
- [ ] File paths are clickable wikilinks
- [ ] Tasks sorted by due date within groups

#### Group by Date

- [ ] Tasks grouped under due date headers
- [ ] "No Due Date" group appears for tasks without dates
- [ ] Groups sorted chronologically

#### Group by Tag

- [ ] Tasks grouped under first tag
- [ ] "Untagged" group for tasks without tags

### Overdue Highlighting

- [ ] When grouped by date: Overdue dates show warning callout
- [ ] When grouped by file/tag: Individual overdue tasks show warning emoji
- [ ] Overdue detection uses correct date comparison

### Sorting

- [ ] Tasks sorted by due date (earliest first)
- [ ] Tasks without due dates appear last
- [ ] Groups sorted logically (date chronological, file/tag alphabetical)

### Task Format

- [ ] Task text is preserved correctly
- [ ] Due dates in various formats are extracted:
  - [ ] Emoji format: `...task text 📅 2024-01-15`
  - [ ] Dataview format: `...task text due:: 2024-01-15`
- [ ] Tags in tasks are preserved
- [ ] Source file link appears after each task

---

## 7. Topic Analysis (Insights)

### Basic Generation

- [ ] Command creates note in configured folder
- [ ] Filename format: `Vault Insights - YYYY-MM-DD.md`

### Vault Overview

- [ ] Total Notes count is accurate
- [ ] Folders count is accurate

### Content Distribution Chart

- [ ] Pie chart shows folder distribution
- [ ] Top-level folders are correctly identified
- [ ] "(root)" appears for files not in folders

### Topic Distribution

- [ ] Topics extracted from configured sources
- [ ] Pie chart renders correctly
- [ ] Bar chart (Topic Frequency) renders correctly

### Topic Rankings Table

- [ ] Shows Rank, Topic, Count, Source columns
- [ ] Topics sorted by count (descending)
- [ ] Limited to maxTopics setting

### Topics by Source

- [ ] Tags section appears if tags enabled
- [ ] Headings section appears if headings enabled
- [ ] Links section appears if links enabled
- [ ] Links are formatted as wikilinks
- [ ] Empty source shows info callout

### AI Topics (with Ollama)

- [ ] Section appears when Ollama enabled and available
- [ ] Shows "Generated by Ollama" callout
- [ ] Topics are relevant to vault content
- [ ] Section hidden when Ollama disabled/unavailable

---

## 8. Section Visibility Toggles

Test each toggle for each generator:

### Daily Summary

| Toggle | Expected When OFF |
|--------|-------------------|
| Show AI Summary | AI Summary section hidden |
| Show Charts | Charts hidden, but sections remain |
| Show File List | Notes Touched section hidden |
| Show Topic Table | Topic table hidden |

### Weekly Summary

| Toggle | Expected When OFF |
|--------|-------------------|
| Show AI Summary | AI Summary section hidden |
| Show Charts | Daily Activity and Topic Distribution charts hidden |
| Show File List | Notes Touched section hidden |
| Show Topic Table | Top Topics table hidden |

### Vault Insights

| Toggle | Expected When OFF |
|--------|-------------------|
| Show AI Summary | AI-Identified Topics section hidden |
| Show Charts | All Mermaid charts hidden |
| Show Topic Table | Topic Rankings table hidden |

---

## 9. Mobile Compatibility

### Basic Functionality

- [ ] Plugin loads on mobile
- [ ] Settings are accessible on mobile
- [ ] Commands execute on mobile
- [ ] Generated notes display correctly

### Mermaid Charts

- [ ] Pie charts render on mobile
- [ ] Bar charts render on mobile
- [ ] Timeline charts render on mobile

### Performance

- [ ] No significant lag during generation
- [ ] Large vaults (100+ files) don't crash
- [ ] Memory usage is reasonable

### Ollama

- [ ] Ollama features gracefully fail on mobile
- [ ] No errors when Ollama unavailable
- [ ] Fallback to non-AI extraction works

---

## 10. Ollama Integration

### Prerequisites

- [ ] Ollama installed and running
- [ ] Model downloaded (default: llama3)

### Connection

- [ ] "Enable Ollama" setting connects to server
- [ ] Test connection shows success message
- [ ] Invalid URL shows appropriate error

### Topic Extraction

- [ ] AI-identified topics appear in Insights
- [ ] Topics are relevant and reasonable
- [ ] Handles long documents (truncation works)

### Summarization

- [ ] AI Summary appears in Daily/Weekly summaries
- [ ] Summary is concise (2-3 sentences)
- [ ] Summary is relevant to modified content

### Error Handling

- [ ] Works when Ollama is disabled
- [ ] Works when Ollama server is down
- [ ] Shows no errors when model not found
- [ ] Fallback to non-AI extraction works seamlessly

### Model Configuration

- [ ] Can change model in settings
- [ ] Different models produce results
- [ ] Invalid model names handled gracefully

---

## 11. Edge Cases and Error Handling

### Empty Vault

- [ ] Daily summary generates with empty state messages
- [ ] Weekly summary generates with empty state messages
- [ ] Todo list generates with "no tasks found" message
- [ ] Insights generates with minimal content

### Large Vault (1000+ files)

- [ ] Generation completes without timeout
- [ ] No memory issues
- [ ] Performance is acceptable (<10 seconds)

### Special Characters

- [ ] Files with quotes in names work
- [ ] Files with unicode characters work
- [ ] Tags with special characters escaped

### Concurrent Operations

- [ ] Multiple rapid command executions don't crash
- [ ] Regenerating while file is open works

### Missing Folders

- [ ] Plugin creates summary folder if missing
- [ ] Plugin creates Daily/Weekly/Todos subfolders if missing
- [ ] Clear error if folder creation fails

### File Conflicts

- [ ] Existing summary file is updated (not duplicated)
- [ ] Modified content is preserved (or overwritten per design)

---

## 12. Performance Testing

### Generation Times

Test with varying vault sizes:

| Vault Size | Daily Summary | Weekly Summary | Todo List | Insights |
|------------|---------------|----------------|-----------|----------|
| 10 files | [ ] <1s | [ ] <1s | [ ] <1s | [ ] <1s |
| 100 files | [ ] <3s | [ ] <3s | [ ] <3s | [ ] <5s |
| 500 files | [ ] <10s | [ ] <10s | [ ] <10s | [ ] <15s |
| 1000 files | [ ] <30s | [ ] <30s | [ ] <30s | [ ] <30s |

### Memory Usage

- [ ] No memory leaks after multiple generations
- [ ] Memory returns to baseline after generation
- [ ] Large files don't cause memory spikes

### CPU Usage

- [ ] CPU usage spikes briefly during generation
- [ ] CPU returns to normal after generation
- [ ] No sustained high CPU usage

---

## 13. Accessibility

### Keyboard Navigation

- [ ] Settings can be navigated with keyboard
- [ ] Commands accessible via hotkeys
- [ ] Focus states visible

### Screen Reader

- [ ] Generated content is screen reader friendly
- [ ] Tables are properly structured
- [ ] Lists are semantic

---

## 14. Cross-Platform Testing

### Windows

- [ ] Plugin loads correctly
- [ ] File paths handled correctly
- [ ] All features work

### macOS

- [ ] Plugin loads correctly
- [ ] File paths handled correctly
- [ ] All features work

### Linux

- [ ] Plugin loads correctly
- [ ] File paths handled correctly
- [ ] All features work

### iOS

- [ ] Plugin loads correctly
- [ ] Mobile-specific limitations respected
- [ ] Core features work

### Android

- [ ] Plugin loads correctly
- [ ] Mobile-specific limitations respected
- [ ] Core features work

---

## Test Sign-Off

| Tester | Date | Version | Platform | Overall Result |
|--------|------|---------|----------|----------------|
| | | | | |

### Notes

_Use this section to document any issues found, workarounds, or observations during testing._

---

### Issues Found

| Issue # | Description | Severity | Steps to Reproduce | Status |
|---------|-------------|----------|-------------------|--------|
| | | | | |

---

## Version History

| Date | Version | Tester | Changes |
|------|---------|--------|---------|
| | 1.0.0 | | Initial checklist |
