# Manual Test Plan: Chart.js Visualization Support

## Prerequisites

- [ ] Plugin is built (`npm run build` produces `main.js`)
- [ ] Test vault symlink exists at `.obsidian/plugins/vault-insights`
- [ ] Test vault has at least a few markdown notes with tags, headings, and `- [ ]` tasks

---

## Test 1: Settings UI

1. Open Obsidian with the test vault
2. Go to **Settings > Community Plugins** and enable **Vault Insights** (reload if needed)
3. Go to **Settings > Vault Insights**
4. Scroll to **Visualization Settings**

**Verify:**
- [ ] Chart type dropdown shows **"Mermaid (Native)"** and **"Chart.js (Interactive)"**
- [ ] There is NO mention of "Not yet supported"
- [ ] "Show charts" toggle description says **"Include charts and visualizations in generated notes."** (not "Mermaid charts")

---

## Test 2: Mermaid Still Works (Regression)

1. In settings, set **Chart type** to **Mermaid (Native)**
2. Ensure **Show charts** is ON
3. Open the command palette (Cmd+P) and run **"Vault Insights: Generate daily summary"**
4. Open the generated note in `Insights/Daily/`

**Verify:**
- [ ] Note contains a ```` ```mermaid ```` code block (if topics exist)
- [ ] Mermaid pie chart renders correctly in reading view
- [ ] No "Chart.js not available" notice appears

---

## Test 3: Chart.js Daily Summary

1. In settings, switch **Chart type** to **Chart.js (Interactive)**
2. Run **"Vault Insights: Generate daily summary"**
3. Open the generated note

**Verify:**
- [ ] Note contains a ```` ```chartjs ```` code block (if topics exist)
- [ ] Switch to **reading view** - the code block renders as an interactive doughnut chart
- [ ] Chart has a title "Topic Distribution"
- [ ] Chart has a legend at the bottom
- [ ] Colors are visible and distinct
- [ ] No "Chart.js not available" notice appears
- [ ] No console errors (open DevTools with Cmd+Option+I)

---

## Test 4: Chart.js Weekly Summary

1. Keep Chart.js selected
2. Run **"Vault Insights: Generate weekly summary"**
3. Open the generated note in `Insights/Weekly/`

**Verify:**
- [ ] **Daily Activity** section has a `chartjs` code block
- [ ] In reading view, it renders as a horizontal bar chart with day labels
- [ ] **Topic Distribution** section has a doughnut chart
- [ ] Both charts are theme-aware (text readable in current theme)

---

## Test 5: Chart.js Todo List

1. Keep Chart.js selected
2. Ensure **Include completed tasks** is ON in Todo Settings
3. Create a few test tasks in notes if needed:
   ```
   - [ ] Test pending task
   - [x] Test completed task
   ```
4. Run **"Vault Insights: Generate todo list"**
5. Open the generated note in `Insights/Todos/`

**Verify:**
- [ ] **Summary** section shows task counts
- [ ] A doughnut chart showing Completed vs Pending renders (needs both to exist)
- [ ] Chart title is "Task Completion"

---

## Test 6: Chart.js Vault Insights (Topic Analysis)

1. Keep Chart.js selected
2. Run **"Vault Insights: Analyze vault topics"**
3. Open the generated note in `Insights/`

**Verify:**
- [ ] **Content Distribution** section has a doughnut chart (folder distribution)
- [ ] **Topic Distribution** section has a doughnut chart
- [ ] **Topic Frequency** section has a horizontal bar chart
- [ ] All three charts render in reading view

---

## Test 7: Refresh All

1. Keep Chart.js selected
2. Run **"Vault Insights: Refresh all insights"**

**Verify:**
- [ ] Notice says "All insights refreshed!" (no failures)
- [ ] Daily, Weekly, Todo, and Insights notes all have `chartjs` blocks
- [ ] All charts render in reading view

---

## Test 8: Theme Switching

1. Open a generated note with Chart.js charts in reading view
2. Go to **Settings > Appearance** and switch theme (light to dark or vice versa)
3. Go back to the note

**Verify:**
- [ ] Chart text (title, legend, axis labels) is still readable
- [ ] Grid lines use the theme's border color
- [ ] Charts don't break or disappear (may need to scroll away and back)

---

## Test 9: Charts Disabled

1. In settings, turn **Show charts** OFF
2. Run **"Vault Insights: Generate daily summary"**
3. Open the generated note

**Verify:**
- [ ] No `chartjs` or `mermaid` code blocks in the note
- [ ] No "Chart.js not available" notice
- [ ] Other sections (Overview table, Topics table, file list) still present

---

## Test 10: Edge Cases

### Empty vault
1. Create a new empty vault or exclude all folders
2. Generate daily summary with Chart.js selected

**Verify:**
- [ ] No chart blocks appear (empty data = no chart)
- [ ] Empty state callout messages appear instead
- [ ] No errors

### Invalid JSON in code block (developer test)
1. In source/edit mode, manually type:
   ````
   ```chartjs
   { this is not valid json }
   ```
   ````
2. Switch to reading view

**Verify:**
- [ ] Error message appears: "Invalid Chart.js configuration: could not parse JSON."
- [ ] Error is styled with red text and left border
- [ ] No console exceptions

---

## Test 11: Switching Between Chart Types

1. Generate a daily summary with **Mermaid**
2. Switch to **Chart.js** and generate another daily summary (same day overwrites)
3. Open the note

**Verify:**
- [ ] Note now has `chartjs` blocks (not `mermaid`)
- [ ] Charts render correctly

4. Switch back to **Mermaid** and generate again

**Verify:**
- [ ] Note now has `mermaid` blocks (not `chartjs`)
- [ ] Mermaid charts render correctly

---

## Bundle Size Check

Run in terminal:
```bash
ls -lh main.js
```

**Verify:**
- [ ] Bundle size is reasonable (~400-500KB with Chart.js included)
- [ ] Compare to previous size if available

---

## Results

| Test | Pass/Fail | Notes |
|------|-----------|-------|
| 1. Settings UI | | |
| 2. Mermaid regression | | |
| 3. Chart.js daily | | |
| 4. Chart.js weekly | | |
| 5. Chart.js todo | | |
| 6. Chart.js insights | | |
| 7. Refresh all | | |
| 8. Theme switching | | |
| 9. Charts disabled | | |
| 10. Edge cases | | |
| 11. Switch types | | |
| Bundle size | | |
