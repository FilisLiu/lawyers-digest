import type { App } from "obsidian";
import { PluginSettingTab, Setting } from "obsidian";
import type LawyerDigestPlugin from "./main";
import type { LLMProvider } from "./llm";

export interface LawyerDigestSettings {
  /** Base folder for all plugin output (e.g. legal-digest). Digests and Concepts live under this. */
  baseFolder: string;
  digestFolder: string;
  conceptFolder: string;
  conceptSubfolders: boolean;
  createStubs: boolean;
  llmProvider: LLMProvider;
  llmApiUrl: string;
  llmApiKey: string;
  llmModel: string;
}

export const DEFAULT_SETTINGS: LawyerDigestSettings = {
  baseFolder: "legal-digest",
  digestFolder: "legal-digest/Digests",
  conceptFolder: "legal-digest/Concepts",
  conceptSubfolders: true,
  createStubs: true,
  llmProvider: "openai",
  llmApiUrl: "https://api.openai.com/v1/chat/completions",
  llmApiKey: "",
  llmModel: "gpt-4o-mini",
};

export class LawyerDigestSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: LawyerDigestPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Lawyer's Digest settings" });

    new Setting(containerEl)
      .setName("Base folder")
      .setDesc("All plugin output lives here (e.g. legal-digest → legal-digest/Digests, legal-digest/Concepts)")
      .addText((t) =>
        t
          .setPlaceholder("legal-digest")
          .setValue(this.plugin.settings.baseFolder || "legal-digest")
          .onChange(async (v) => {
            const base = (v || "legal-digest").trim();
            this.plugin.settings.baseFolder = base;
            this.plugin.settings.digestFolder = base + "/Digests";
            this.plugin.settings.conceptFolder = base + "/Concepts";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Digest folder")
      .setDesc("Where article digests are saved (under base folder)")
      .addText((t) =>
        t
          .setPlaceholder("legal-digest/Digests")
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
          .setPlaceholder("legal-digest/Concepts")
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
      cls: "lawyers-digest-info",
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

  }
}
