/**
 * Mock for the 'obsidian' module.
 * Provides stub implementations for Obsidian API types used in tests.
 */

export class TFile {
  path: string;
  name: string;
  basename: string;
  extension: string;
  stat: {
    ctime: number;
    mtime: number;
    size: number;
  };

  constructor(path: string) {
    this.path = path;
    this.name = path.split('/').pop() || '';
    this.basename = this.name.replace(/\.[^/.]+$/, '');
    this.extension = this.name.includes('.') ? this.name.split('.').pop() || '' : '';
    this.stat = {
      ctime: Date.now(),
      mtime: Date.now(),
      size: 0,
    };
  }
}

export class TFolder {
  path: string;
  name: string;

  constructor(path: string) {
    this.path = path;
    this.name = path.split('/').pop() || '';
  }
}

export class Notice {
  constructor(message: string, timeout?: number) {
    // Mock notice - does nothing in tests
  }
}

export class App {
  vault = {
    getMarkdownFiles: jest.fn(() => []),
    cachedRead: jest.fn(async () => ''),
    read: jest.fn(async () => ''),
    create: jest.fn(async () => new TFile('new-file.md')),
    modify: jest.fn(async () => {}),
    createFolder: jest.fn(async () => {}),
    getAbstractFileByPath: jest.fn(() => null),
  };

  metadataCache = {
    getFileCache: jest.fn(() => null),
  };
}

export class Plugin {
  app: App;

  constructor(app: App, manifest: any) {
    this.app = app;
  }

  addCommand(command: any) {}
  addSettingTab(tab: any) {}
  registerInterval(id: number) {}
  loadData() { return Promise.resolve({}); }
  saveData(data: any) { return Promise.resolve(); }
}

export class PluginSettingTab {
  app: App;
  plugin: Plugin;
  containerEl: HTMLElement;

  constructor(app: App, plugin: Plugin) {
    this.app = app;
    this.plugin = plugin;
    this.containerEl = document.createElement('div');
  }

  display() {}
  hide() {}
}

export class Setting {
  constructor(containerEl: HTMLElement) {}
  setName(name: string) { return this; }
  setDesc(desc: string) { return this; }
  addText(cb: any) { return this; }
  addToggle(cb: any) { return this; }
  addDropdown(cb: any) { return this; }
  addSlider(cb: any) { return this; }
  addButton(cb: any) { return this; }
}

// Types that are commonly used
export interface CachedMetadata {
  frontmatter?: Record<string, any>;
  tags?: Array<{ tag: string; position: any }>;
  headings?: Array<{ heading: string; level: number; position: any }>;
  links?: Array<{ link: string; displayText?: string; position: any }>;
  listItems?: Array<{ task?: string; position: any; parent?: number }>;
}
