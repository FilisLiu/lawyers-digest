// Mock Obsidian API for testing
export class App {
  vault: any;
  workspace: any;
  metadataCache: any;
  constructor() {
    this.vault = {};
    this.workspace = {};
    this.metadataCache = {};
  }
}

export class Modal {
  app: App;
  constructor(app: App) {
    this.app = app;
  }
  onOpen(): void {}
  onClose(): void {}
  open(): void {}
  close(): void {}
}

export class Notice {
  constructor(message: string) {}
}

export class Plugin {
  app: App;
  settings: any;
  constructor(app: App) {
    this.app = app;
  }
  onload(): Promise<void> | void {}
  onunload(): void {}
  addCommand(command: any): void {}
  addSettingTab(tab: any): void {}
  loadData(): Promise<any> {
    return Promise.resolve(null);
  }
  saveData(data: any): Promise<void> {
    return Promise.resolve();
  }
}

export class PluginSettingTab extends Plugin {
  display(): void {}
}

export class Setting {
  constructor(containerEl: HTMLElement) {}
  setName(name: string): this {
    return this;
  }
  setDesc(desc: string): this {
    return this;
  }
  addText(callback: (text: any) => void): this {
    return this;
  }
  addDropdown(callback: (dropdown: any) => void): this {
    return this;
  }
  addToggle(callback: (toggle: any) => void): this {
    return this;
  }
}

export class TFile {
  basename: string;
  path: string;
  extension: string;
  constructor(basename: string, path: string) {
    this.basename = basename;
    this.path = path;
    this.extension = "md";
  }
}
