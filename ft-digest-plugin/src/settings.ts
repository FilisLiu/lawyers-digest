import type { App } from "obsidian";
import { PluginSettingTab, Setting } from "obsidian";
import type FTDigestPlugin from "./main";
import type { LLMProvider } from "./llm";

export interface FTDigestSettings {
  /** Base folder for all plugin output (e.g. ft-digest). Digests and Concepts live under this. */
  baseFolder: string;
  digestFolder: string;
  conceptFolder: string;
  conceptSubfolders: boolean;
  createStubs: boolean;
  llmProvider: LLMProvider;
  llmApiUrl: string;
  llmApiKey: string;
  llmModel: string;
  ftApiKey: string;
  ftSyncFolder: string;
  ftSyncLastTimestamp?: string;
  ftProcessedIds?: string[];
}

export const DEFAULT_SETTINGS: FTDigestSettings = {
  baseFolder: "ft-digest",
  digestFolder: "ft-digest/Digests",
  conceptFolder: "ft-digest/Concepts",
  conceptSubfolders: true,
  createStubs: true,
  llmProvider: "openai",
  llmApiUrl: "https://api.openai.com/v1/chat/completions",
  llmApiKey: "",
  llmModel: "gpt-4o-mini",
  ftApiKey: "",
  ftSyncFolder: "ft-digest/Digests",
  ftSyncLastTimestamp: undefined,
  ftProcessedIds: [],
};

export class FTDigestSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: FTDigestPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "FT Digest settings" });

    new Setting(containerEl)
      .setName("Base folder")
      .setDesc("All plugin output lives here (e.g. ft-digest → ft-digest/Digests, ft-digest/Concepts)")
      .addText((t) =>
        t
          .setPlaceholder("ft-digest")
          .setValue(this.plugin.settings.baseFolder || "ft-digest")
          .onChange(async (v) => {
            const base = (v || "ft-digest").trim();
            this.plugin.settings.baseFolder = base;
            this.plugin.settings.digestFolder = base + "/Digests";
            this.plugin.settings.conceptFolder = base + "/Concepts";
            this.plugin.settings.ftSyncFolder = base + "/Digests";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Digest folder")
      .setDesc("Where article digests are saved (under base folder)")
      .addText((t) =>
        t
          .setPlaceholder("ft-digest/Digests")
          .setValue(this.plugin.settings.digestFolder)
          .onChange(async (v) => {
            this.plugin.settings.digestFolder = (v || "").trim() || this.plugin.settings.baseFolder + "/Digests";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Concept folder")
      .setDesc("Where concept notes are saved (under base folder)")
      .addText((t) =>
        t
          .setPlaceholder("ft-digest/Concepts")
          .setValue(this.plugin.settings.conceptFolder)
          .onChange(async (v) => {
            this.plugin.settings.conceptFolder = (v || "").trim() || this.plugin.settings.baseFolder + "/Concepts";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Use concept subfolders")
      .setDesc("Create Acts/, Parties/, Themes/ etc. under Concept folder")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.conceptSubfolders).onChange(async (v) => {
          this.plugin.settings.conceptSubfolders = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Create concept stubs")
      .setDesc("When a concept does not exist, create a stub note")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.createStubs).onChange(async (v) => {
          this.plugin.settings.createStubs = v;
          await this.plugin.saveSettings();
        })
      );

    containerEl.createEl("h3", { text: "LLM (extraction)" });
    const llmInfo = containerEl.createEl("p", {
      cls: "ft-digest-info",
      text: "API keys are stored securely in Obsidian settings. Never share your keys.",
    });
    llmInfo.style.color = "var(--text-muted)";
    llmInfo.style.fontSize = "0.9em";
    llmInfo.style.marginBottom = "1em";
    new Setting(containerEl)
      .setName("Provider")
      .setDesc("OpenAI (or compatible) or Google Gemini (free tier at aistudio.google.com)")
      .addDropdown((d) =>
        d
          .addOption("openai", "OpenAI / compatible")
          .addOption("gemini", "Google Gemini")
          .setValue(this.plugin.settings.llmProvider || "openai")
          .onChange(async (v) => {
            this.plugin.settings.llmProvider = v as LLMProvider;
            await this.plugin.saveSettings();
          })
      );
    new Setting(containerEl)
      .setName("API URL")
      .setDesc("Leave blank to use default (OpenAI or Gemini). Custom proxy URL if needed.")
      .addText((t) =>
        t
          .setPlaceholder("default")
          .setValue(this.plugin.settings.llmApiUrl)
          .onChange(async (v) => {
            this.plugin.settings.llmApiUrl = (v ?? "").trim();
            await this.plugin.saveSettings();
          })
      );
    new Setting(containerEl)
      .setName("API key")
      .setDesc("Bearer token for LLM API")
      .addText((t) =>
        t
          .setPlaceholder("sk-...")
          .setValue(this.plugin.settings.llmApiKey)
          .onChange(async (v) => {
            this.plugin.settings.llmApiKey = v ?? "";
            await this.plugin.saveSettings();
          })
      );
    new Setting(containerEl)
      .setName("Model")
      .setDesc("OpenAI: gpt-4o-mini, etc. Gemini: gemini-2.0-flash, gemini-1.5-flash (free tier)")
      .addText((t) =>
        t
          .setPlaceholder("e.g. gpt-4o-mini or gemini-2.0-flash")
          .setValue(this.plugin.settings.llmModel)
          .onChange(async (v) => {
            this.plugin.settings.llmModel = (v ?? "").trim() || (this.plugin.settings.llmProvider === "gemini" ? "gemini-2.0-flash" : "gpt-4o-mini");
            await this.plugin.saveSettings();
          })
      );

    containerEl.createEl("h3", { text: "FT API (optional)" });
    const ftWarning = containerEl.createEl("p", {
      cls: "ft-digest-warning",
      text: "⚠️ FT Sync requires a valid FT Developer API key with Datamining Licence. Users are responsible for complying with FT's Terms of Service.",
    });
    ftWarning.style.color = "var(--text-warning)";
    ftWarning.style.fontSize = "0.9em";
    ftWarning.style.marginBottom = "1em";
    new Setting(containerEl)
      .setName("FT API key")
      .setDesc("For Sync: FT Developer API key (Datamining Licence). See README for legal requirements.")
      .addText((t) =>
        t
          .setPlaceholder("")
          .setValue(this.plugin.settings.ftApiKey)
          .onChange(async (v) => {
            this.plugin.settings.ftApiKey = v ?? "";
            await this.plugin.saveSettings();
          })
      );
    new Setting(containerEl)
      .setName("FT Sync folder")
      .setDesc("Folder for articles fetched via FT Sync")
      .addText((t) =>
        t
          .setPlaceholder("Digests")
          .setValue(this.plugin.settings.ftSyncFolder)
          .onChange(async (v) => {
            this.plugin.settings.ftSyncFolder = v || "Digests";
            await this.plugin.saveSettings();
          })
      );
  }
}
