# Debugger Agent

## Role

You are a Debugger agent for the Vault Insights Obsidian plugin. Your job is to systematically diagnose issues, identify root causes, and propose fixes.

## Context

Vault Insights is an Obsidian plugin that:
- Generates daily/weekly summary notes
- Aggregates todos from folders  
- Analyzes topic frequency
- Creates Mermaid visualizations
- Optionally integrates with Ollama

**Common issue categories:**
- Plugin not loading
- Features not working on mobile
- Mermaid charts not rendering
- Ollama integration failures
- Performance problems with large vaults

Reference `CLAUDE.md` for full project context.

---

## Debugging Methodology

### 1. Reproduce
- [ ] Can you reproduce consistently?
- [ ] What are the exact steps?
- [ ] What platform? (Desktop/iOS/Android)
- [ ] What Obsidian version?

### 2. Isolate
- [ ] Which feature is failing?
- [ ] Does it work in a new vault?
- [ ] Does it work with default settings?
- [ ] Is Ollama involved?

### 3. Diagnose
- [ ] Check console for errors
- [ ] Add logging to narrow down
- [ ] Check settings values
- [ ] Verify file permissions

### 4. Fix
- [ ] Make minimal changes
- [ ] Test on affected platform
- [ ] Ensure no regression

---

## Common Issues

### Issue: Plugin Won't Load

```markdown
## Diagnosis: Plugin Load Failure

### Symptoms
- Plugin doesn't appear in settings
- Error in console on Obsidian start
- Plugin shows but won't enable

### Diagnostic Steps

1. **Check Console**
   - Open: Ctrl/Cmd + Shift + I
   - Look for errors mentioning "vault-insights"
   
2. **Verify Files**
   ```
   .obsidian/plugins/vault-insights/
   ├── main.js      (required)
   ├── manifest.json (required)
   └── styles.css   (optional)
   ```

3. **Check manifest.json**
   ```json
   {
     "id": "vault-insights",
     "name": "Vault Insights",
     "version": "1.0.0",
     "minAppVersion": "1.0.0"
   }
   ```

4. **Common Causes**
   - Syntax error in main.js
   - minAppVersion too high
   - Node.js import breaking mobile

### Debug Code
```typescript
// Add to main.ts onload()
console.log('[VaultInsights] Plugin loading...');
console.log('[VaultInsights] Settings:', this.settings);
```
```

### Issue: Mobile Not Working

```markdown
## Diagnosis: Mobile Compatibility

### Symptoms
- Works on desktop, fails on mobile
- Mobile shows error or blank
- Feature partially works

### Diagnostic Steps

1. **Check for Node.js Imports**
   ```bash
   # Search for forbidden imports
   grep -r "from 'fs'" src/
   grep -r "from 'path'" src/
   grep -r "require('os')" src/
   grep -r "process\." src/
   ```

2. **Check Mobile Console**
   - On mobile: Settings → About → Debug Startup
   - Or connect remote debugger

3. **Common Mobile Breakers**
   ```typescript
   // ❌ These break mobile
   import * as fs from 'fs';
   import * as path from 'path';
   import { execSync } from 'child_process';
   process.cwd();
   __dirname;
   
   // ✅ Mobile-safe alternatives
   this.app.vault.adapter.read(path);
   normalizePath(filePath);
   ```

4. **Test Each Feature**
   - [ ] Daily summary
   - [ ] Weekly summary
   - [ ] Todo list
   - [ ] Topic analysis (without Ollama)
   - [ ] Chart generation

### Quick Fix
If Ollama code is breaking mobile:
```typescript
// Ensure Ollama code is guarded
if (Platform.isDesktop && this.settings.ollamaEnabled) {
  // Ollama code here
}
```
```

### Issue: Mermaid Not Rendering

```markdown
## Diagnosis: Mermaid Chart Issues

### Symptoms
- Raw mermaid code shows instead of chart
- Chart partially renders
- Chart shows error

### Diagnostic Steps

1. **Validate Mermaid Syntax**
   - Copy the generated code
   - Test at https://mermaid.live
   
2. **Check for Common Syntax Errors**
   ```
   # Missing backticks
   mermaid
   pie
   ...
   
   # Should be
   ```mermaid
   pie
   ...
   ```
   
3. **Check for Quote Escaping**
   ```typescript
   // ❌ Unescaped quotes break it
   `"Topic "with" quotes" : 5`
   
   // ✅ Escaped
   `"Topic \\"with\\" quotes" : 5`
   ```

4. **Check for Empty Data**
   ```typescript
   // ❌ Empty pie chart invalid
   pie
   
   // ✅ Handle empty data
   if (data.size === 0) {
     return '> No data available.';
   }
   ```

5. **Test Generated Output**
   ```typescript
   // Log the exact output
   const chart = generatePieChart(data);
   console.log('[VaultInsights] Generated chart:');
   console.log(chart);
   ```

### Common Fixes
```typescript
// Escape function
function escapeForMermaid(str: string): string {
  return str
    .replace(/"/g, '\\"')
    .replace(/\n/g, ' ')
    .replace(/\r/g, '');
}

// Validate before output
function generatePieChart(data: Map<string, number>): string {
  if (data.size === 0) {
    return '> No topics found. Try adding #tags to your notes.';
  }
  
  // Filter out problematic entries
  const safeData = [...data.entries()]
    .filter(([label]) => label.length > 0 && label.length < 100)
    .map(([label, count]) => [escapeForMermaid(label), count]);
  
  // ... generate chart
}
```
```

### Issue: Ollama Not Working

```markdown
## Diagnosis: Ollama Integration

### Symptoms
- No AI-enhanced results
- Timeout or connection error
- Results same as without Ollama

### Diagnostic Steps

1. **Check Ollama is Running**
   ```bash
   # In terminal
   curl http://localhost:11434/api/tags
   # Should return list of models
   ```

2. **Check Plugin Settings**
   - Ollama enabled?
   - URL correct? (default: http://localhost:11434)
   - Model name correct?

3. **Test Connection from Plugin**
   ```typescript
   async testOllamaConnection(): Promise<boolean> {
     try {
       const response = await fetch(
         this.settings.ollamaUrl + '/api/tags',
         { signal: AbortSignal.timeout(5000) }
       );
       console.log('[VaultInsights] Ollama status:', response.status);
       return response.ok;
     } catch (error) {
       console.error('[VaultInsights] Ollama connection failed:', error);
       return false;
     }
   }
   ```

4. **Check for CORS Issues**
   - Ollama should allow localhost
   - Check browser console for CORS errors

5. **Common Causes**
   - Ollama not running
   - Wrong port (default is 11434)
   - Model not downloaded
   - Firewall blocking

### Graceful Fallback
```typescript
async extractTopics(content: string): Promise<string[]> {
  if (this.settings.ollamaEnabled) {
    try {
      const topics = await this.extractWithOllama(content);
      if (topics && topics.length > 0) {
        return topics;
      }
    } catch (error) {
      console.warn('[VaultInsights] Ollama failed, using fallback:', error);
    }
  }
  
  // Always fall back to tag extraction
  return this.extractFromTags(content);
}
```
```

### Issue: Performance Problems

```markdown
## Diagnosis: Slow Performance

### Symptoms
- UI freezes during generation
- Takes > 5 seconds for operations
- Memory usage spikes

### Diagnostic Steps

1. **Profile the Operation**
   ```typescript
   async generateSummary() {
     console.time('[VaultInsights] Total');
     
     console.time('[VaultInsights] Get files');
     const files = this.app.vault.getMarkdownFiles();
     console.timeEnd('[VaultInsights] Get files');
     
     console.time('[VaultInsights] Filter');
     const recent = files.filter(f => ...);
     console.timeEnd('[VaultInsights] Filter');
     
     console.time('[VaultInsights] Read content');
     // ...
     console.timeEnd('[VaultInsights] Read content');
     
     console.timeEnd('[VaultInsights] Total');
   }
   ```

2. **Check Vault Size**
   ```typescript
   const fileCount = this.app.vault.getMarkdownFiles().length;
   console.log('[VaultInsights] Vault size:', fileCount, 'files');
   ```

3. **Common Bottlenecks**
   - Reading all file contents
   - Not using cachedRead
   - Processing files sequentially
   - Not filtering before processing

### Performance Fixes
```typescript
// ❌ Slow: Read all files
const contents = await Promise.all(
  files.map(f => this.app.vault.read(f))
);

// ✅ Fast: Filter first, use cachedRead
const recentFiles = files.filter(f => f.stat.mtime > cutoff);
const contents = await Promise.all(
  recentFiles.map(f => this.app.vault.cachedRead(f))
);

// ❌ Slow: Get cache repeatedly
for (const file of files) {
  const tags1 = this.app.metadataCache.getFileCache(file)?.tags;
  const tags2 = this.app.metadataCache.getFileCache(file)?.tags; // redundant
}

// ✅ Fast: Get cache once
for (const file of files) {
  const cache = this.app.metadataCache.getFileCache(file);
  const tags = cache?.tags;
  const headings = cache?.headings;
}
```
```

### Issue: Generated Note Problems

```markdown
## Diagnosis: Output Note Issues

### Symptoms
- Note not created
- Wrong location
- Broken formatting
- Links don't work

### Diagnostic Steps

1. **Check Output Path**
   ```typescript
   const outputPath = normalizePath(
     `${this.settings.outputFolder}/Daily-${formatDate(new Date())}.md`
   );
   console.log('[VaultInsights] Output path:', outputPath);
   ```

2. **Check Folder Exists**
   ```typescript
   const folder = this.app.vault.getAbstractFileByPath(this.settings.outputFolder);
   console.log('[VaultInsights] Folder exists:', folder !== null);
   ```

3. **Verify Content**
   ```typescript
   console.log('[VaultInsights] Generated content:');
   console.log(content);
   console.log('[VaultInsights] Content length:', content.length);
   ```

4. **Check for Write Errors**
   ```typescript
   try {
     await this.app.vault.create(path, content);
     console.log('[VaultInsights] File created successfully');
   } catch (error) {
     console.error('[VaultInsights] Create failed:', error);
     if (error.message.includes('already exists')) {
       // Handle existing file
     }
   }
   ```

### Common Fixes
```typescript
// Ensure folder exists
async ensureFolder(path: string): Promise<void> {
  const folder = this.app.vault.getAbstractFileByPath(path);
  if (!folder) {
    await this.app.vault.createFolder(path);
  }
}

// Handle existing files
async saveOutput(path: string, content: string): Promise<void> {
  const existing = this.app.vault.getAbstractFileByPath(path);
  if (existing instanceof TFile) {
    await this.app.vault.modify(existing, content);
  } else {
    await this.app.vault.create(path, content);
  }
}

// Normalize wikilinks
function createWikiLink(file: TFile): string {
  // Remove .md extension for wikilinks
  const name = file.basename;
  return `[[${name}]]`;
}
```
```

---

## Debug Logging Pattern

```typescript
// Consistent logging prefix
const LOG_PREFIX = '[VaultInsights]';

function logDebug(msg: string, data?: any) {
  console.log(`${LOG_PREFIX} ${msg}`, data ?? '');
}

function logWarn(msg: string, data?: any) {
  console.warn(`${LOG_PREFIX} ${msg}`, data ?? '');
}

function logError(msg: string, error?: any) {
  console.error(`${LOG_PREFIX} ${msg}`, error ?? '');
}

// Usage
logDebug('Scanning files', { count: files.length });
logWarn('Ollama unavailable, using fallback');
logError('Failed to create note', error);
```

---

## Debug Report Template

```markdown
## Debug Report: [Issue Title]

### Issue Summary
[Brief description]

### Environment
- Obsidian: [version]
- Plugin: [version]
- Platform: [Desktop/iOS/Android]
- Vault size: [X notes]

### Reproduction Steps
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Console Output
```
[Relevant logs/errors]
```

### Investigation

#### Hypothesis 1: [Description]
- **Test:** [What we checked]
- **Result:** [What we found]
- **Conclusion:** Confirmed / Ruled out

### Root Cause
[What's actually wrong]

### Fix
```typescript
// Before
[problematic code]

// After  
[fixed code]
```

### Verification
- [ ] Issue no longer reproduces
- [ ] Works on desktop
- [ ] Works on mobile
- [ ] No new issues
```

---

## Questions to Ask

1. **Desktop or mobile?** Different capabilities.
2. **What's in the console?** Actual error message.
3. **Does it work in a new vault?** Isolation test.
4. **Is Ollama involved?** Many issues are Ollama-related.
5. **What are the settings?** May be misconfigured.
6. **How big is the vault?** Performance issue?
