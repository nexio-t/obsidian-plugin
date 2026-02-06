# Vault Insights

Generate actionable insights from your Obsidian vault - daily/weekly summaries, aggregated todo lists, topic analysis, and content visualizations.

**No external services. No API keys. Fully offline.**

## Features

### Daily & Weekly Summaries

Automatically generate markdown notes summarizing your vault activity:

- Notes created and modified in the period
- Scheduled generation at a configurable time
- Choose **calendar weeks (Sun–Sat)** or **rolling lookback windows**
- **Word count tracking** with "Most Active Note" highlight
- Task completion statistics
- Topic distribution with Mermaid charts
- Direct links to touched notes
- **Navigation links** between daily and weekly summaries
- Optional AI-powered summaries via local Ollama
- **Auto-opens** generated notes in the editor

### Aggregated Todo List

Create a unified task list from your entire vault or specific folders:

- Extract all `- [ ]` and `- [x]` tasks
- Group by source file, due date, or tag
- **Smart sorting** by due date (earliest first)
- **Overdue highlighting** with warning callouts
- Track completion progress with visualization
- Support for due date syntax (`📅 2024-01-26` or `due:: 2024-01-26`)
- Toggle completed tasks visibility

### Topic Frequency Analysis

Understand what you write about most:

- Tag frequency across your vault
- Heading patterns (H1 and H2)
- Internal link analysis
- Visual charts showing topic distribution
- Optional AI-powered topic extraction via Ollama

### Content Visualization

Embedded Mermaid charts in your generated notes:

- **Pie charts**: Content distribution by topic or folder
- **Bar charts**: Topic frequency, daily activity
- **Tables**: Ranked topic listings

All charts render natively in Obsidian - zero external dependencies.

## Installation

### From Community Plugins (Recommended)

1. Open Obsidian Settings
2. Go to Community Plugins → Browse
3. Search for "Vault Insights"
4. Click Install, then Enable

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release
2. Create a folder `vault-insights` in your vault's `.obsidian/plugins/` directory
3. Copy the downloaded files into this folder
4. Restart Obsidian and enable the plugin in Settings → Community Plugins

## Commands

| Command | Description |
|---------|-------------|
| **Generate daily summary** | Create a summary note for today's vault activity |
| **Generate weekly summary** | Create a summary note for the current week |
| **Generate todo list** | Aggregate all tasks from configured folders |
| **Generate pending todo list** | Create a clean list of uncompleted tasks |
| **Analyze vault topics** | Generate topic frequency analysis |
| **Refresh all insights** | Regenerate all insight notes |

Access these commands via the Command Palette (`Ctrl/Cmd + P`).

## Settings

### Summary Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Summary Folder | Where generated notes are saved | `Insights` |
| Daily Summary | Enable daily summary generation | On |
| Weekly Summary | Enable weekly summary generation | On |
| Summary Time | Scheduled generation time | `09:00` |
| Use Calendar Weeks | Weekly summaries use Sunday–Saturday | On |

### Todo Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Source Folders | Folders to scan for tasks (empty = all) | `[]` |
| Exclude Folders | Folders to skip when scanning | `templates, archive` |
| Group By | How to organize tasks | `file` |
| Include Completed | Show completed tasks in the list | Off |

### Topic Analysis Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Topic Sources | What to analyze (tags, headings, links) | `tags, headings` |
| Max Topics | Maximum topics to display | `20` |

### Visualization Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Chart Type | Rendering engine for charts | `mermaid` |
| Max Chart Items | Maximum items in charts | `10` |

> Note: Chart.js is listed but not yet implemented. Mermaid is fully supported.

### Section Visibility

Customize which sections appear in generated summaries:

| Setting | Description | Default |
|---------|-------------|---------|
| Show AI Summary | Include AI-generated summary section | On |
| Show Charts | Include Mermaid charts and visualizations | On |
| Show File List | Include list of notes touched | On |
| Show Topic Table | Include topic rankings table | On |

### Ollama Integration (Optional)

| Setting | Description | Default |
|---------|-------------|---------|
| Enable Ollama | Use local LLM for smart extraction | Off |
| Ollama URL | Local Ollama server address | `http://localhost:11434` |
| Ollama Model | Model to use for extraction | `llama3` |

## Generated Note Structure

All generated notes include:

- **YAML frontmatter** with metadata (generator, date range, tags)
- **AI Summary section** (when Ollama is enabled)
- **Overview section** with key statistics
- **Mermaid visualizations** for data
- **Detailed listings** with wikilinks to source notes

Example output structure:

```
Insights/
├── Daily/
│   └── Daily Summary - 2024-01-26.md
├── Weekly/
│   └── Weekly Summary - 2024-01-21 to 2024-01-27.md
├── Todos/
│   └── Todo List - 2024-01-26.md
└── Vault Insights - 2024-01-26.md
```

Example frontmatter:

```yaml
---
title: "Daily Summary - 2024-01-26"
generated: 2024-01-26T10:00:00.000Z
generator: daily-summary
period: daily
startDate: 2024-01-26
endDate: 2024-01-26
tags: [vault-insights, daily-summary]
---
```

## AI Features (Optional)

Vault Insights supports optional AI-powered features via [Ollama](https://ollama.ai), a local LLM runner:

- **AI Summaries**: Natural language summaries of your daily/weekly activity
- **AI Topics**: Identifies themes from your note content

### Setup

1. Install [Ollama](https://ollama.ai)
2. Pull a model: `ollama pull llama3`
3. Start Ollama: `ollama serve`
4. Enable in plugin settings and test the connection

### Privacy

- All AI processing happens **locally** on your machine
- No data is sent to external servers
- Ollama runs entirely offline once models are downloaded
- AI features gracefully degrade if Ollama is unavailable

**Note**: Ollama features are desktop-only. Mobile users get all other features.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Language | TypeScript (strict mode) |
| Runtime | Obsidian (Electron + Mobile) |
| Build | esbuild |
| Visualizations | Mermaid (native Obsidian support) |
| AI | Ollama (optional, local-only) |

## Development

### Prerequisites

- Node.js 16+
- npm

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/vault-insights.git
cd vault-insights

# Install dependencies
npm install

# Build for development (with watch mode)
npm run dev

# Build for production
npm run build

# Type checking
npm run typecheck

# Linting
npm run lint

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Project Structure

```
vault-insights/
├── main.ts                   # Plugin entry point
├── manifest.json             # Obsidian plugin manifest
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── esbuild.config.mjs        # Build configuration
├── jest.config.js            # Jest test configuration
├── styles.css                # Plugin styles
├── tests/                    # Test suite
│   ├── __mocks__/            # Obsidian API mocks
│   ├── generators/           # Generator tests
│   └── visualizations/       # Visualization tests
└── src/
    ├── types.ts              # Shared interfaces and types
    ├── settings.ts           # Settings tab UI
    ├── constants.ts          # Default values and patterns
    │
    ├── core/
    │   ├── scanner.ts        # Vault scanning and filtering
    │   └── cache.ts          # Caching layer for performance
    │
    ├── extractors/
    │   ├── tasks.ts          # Task/checkbox extraction
    │   ├── topics.ts         # Tag, heading, link analysis
    │   ├── content.ts        # Content snippets and highlights
    │   └── metadata.ts       # Frontmatter parsing
    │
    ├── generators/
    │   ├── base.ts           # Abstract base generator class
    │   ├── daily-summary.ts  # Daily summary generation
    │   ├── weekly-summary.ts # Weekly summary generation
    │   ├── todo-list.ts      # Aggregated task list
    │   └── insights.ts       # Topic analysis and insights
    │
    ├── visualizations/
    │   ├── mermaid.ts        # Mermaid chart generation
    │   └── templates.ts      # Chart templates and helpers
    │
    └── integrations/
        └── ollama.ts         # Ollama AI client
```

### Testing in Obsidian

1. Build the plugin: `npm run build`
2. Copy `main.js` and `manifest.json` to your test vault's `.obsidian/plugins/vault-insights/`
3. Reload Obsidian (`Cmd/Ctrl + R`)
4. Enable the plugin in Settings → Community Plugins

## Compatibility

| Platform | Support |
|----------|---------|
| Windows | Full |
| macOS | Full |
| Linux | Full |
| iOS | Core features (no Ollama) |
| Android | Core features (no Ollama) |

**Minimum Obsidian version**: 1.0.0

## FAQ

### Does this work on mobile?

Yes! All core features work on mobile. The optional Ollama integration is desktop-only and gracefully falls back on mobile.

### Will this slow down my vault?

No. Vault Insights uses Obsidian's built-in MetadataCache, which means files aren't re-read from disk. Generation is efficient even with large vaults (1000+ notes).

### Can I customize the output?

Generated notes are standard markdown files. You can edit them after generation.

### Where are insights saved?

By default, insights are saved to an `Insights` folder in your vault root. You can change this in settings.

### How do I exclude certain folders?

Add folder names to the "Exclude Folders" setting (comma-separated). Tasks and topics from these folders won't appear in generated notes.

### What happens if Ollama is unavailable?

AI features gracefully degrade - summaries and insights are generated without the AI sections. You'll never see an error, just standard extraction-based output.

## Privacy

- **100% Local**: All processing happens on your device
- **No telemetry**: No data is collected or sent anywhere
- **No API keys**: Core features require no external accounts
- **Ollama is local**: Even AI features use a locally-running model

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

- [Report an issue](https://github.com/yourusername/vault-insights/issues)
- [Feature requests](https://github.com/yourusername/vault-insights/discussions)

## License

MIT License - see [LICENSE](LICENSE) for details.

---

Made for the Obsidian community.
