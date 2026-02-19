import { App, Notice, Plugin, TFile } from "obsidian";
import { DEFAULT_SETTINGS, type FTDigestSettings, FTDigestSettingTab } from "./settings";
import { ProcessArticleModal } from "./modal";
import { resolveConcept, conceptNotePath, stubNoteContent, parseConceptNoteName } from "./concepts";
import { buildDigestMarkdown, buildNarrativeDigestMarkdown, slugify } from "./digest";
import type { ArticleExtraction } from "./ontology";
import { ENTITY_TYPES } from "./ontology";
import type { EntityType } from "./ontology";
import { ENTITY_KEYS } from "./digest";
import type { PipelineResult } from "./pipeline";
import { runLawyerSays, runLawyerReviews } from "./lawyerCommands";

export default class FTDigestPlugin extends Plugin {
  settings: FTDigestSettings;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new FTDigestSettingTab(this.app, this));

    this.addCommand({
      id: "process-ft-article",
      name: "Process FT article",
      callback: () => {
        new ProcessArticleModal(this.app, this).open();
      },
    });

    this.addCommand({
      id: "refresh-links-for-note",
      name: "Refresh links for this note",
      checkCallback: (checking: boolean) => {
        const file = this.app.workspace.getActiveFile();
        if (!file || !file.path.endsWith(".md")) return false;
        if (checking) return true;
        this.refreshLinksForNote(file.path);
        return true;
      },
    });

    this.addCommand({
      id: "ft-sync",
      name: "FT Sync (fetch new articles)",
      callback: () => {
        this.ftSync();
      },
    });

    this.addCommand({
      id: "lawyersays",
      name: "Lawyer says (perspectives + trainee task)",
      checkCallback: (checking: boolean) => {
        const file = this.app.workspace.getActiveFile();
        if (!file || !file.path.endsWith(".md")) return false;
        if (checking) return true;
        this.runLawyerSays(file);
        return true;
      },
    });

    this.addCommand({
      id: "lawyerreviews",
      name: "Lawyer reviews (feedback on your answer)",
      checkCallback: (checking: boolean) => {
        const file = this.app.workspace.getActiveFile();
        if (!file || !file.path.endsWith(".md")) return false;
        if (checking) return true;
        this.runLawyerReviews(file);
        return true;
      },
    });
  }

  onunload(): void {}

  async loadSettings(): Promise<void> {
    const data = (await this.loadData()) as Partial<FTDigestSettings> | null;
    this.settings = { ...DEFAULT_SETTINGS, ...data };
    if (!this.settings.baseFolder && this.settings.digestFolder === "Digests") {
      this.settings.baseFolder = "ft-digest";
      this.settings.digestFolder = "ft-digest/Digests";
      this.settings.conceptFolder = "ft-digest/Concepts";
      this.settings.ftSyncFolder = "ft-digest/Digests";
    }
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  /** Process full pipeline result: narrative digest + concept stubs. Only creates stubs for non-empty concept names. */
  async processPipelineResult(result: PipelineResult, sourceUrl?: string, existingDigestPath?: string): Promise<string | null> {
    const digestFolder = this.settings.digestFolder?.trim() || "Digests";
    const conceptFolder = this.settings.conceptFolder?.trim() || "Concepts";
    const useSubfolders = this.settings.conceptSubfolders;
    const createStubs = this.settings.createStubs;

    const slug = slugify(result.extraction.headline, result.extraction.publishedDate);
    const digestFileName = `FT - ${slug}.md`;
    const digestPath = existingDigestPath ?? (digestFolder ? `${digestFolder}/${digestFileName}` : digestFileName);

    for (const fullName of result.conceptNoteNames) {
      if (!fullName || fullName.trim().length === 0) continue;
      const parsed = parseConceptNoteName(fullName);
      if (!parsed) continue;
      const { type, name } = parsed;
      const resolved = resolveConcept(this.app, type, name, conceptFolder);
      if (resolved.createdStub && createStubs) {
        const stubPath = conceptNotePath(resolved.noteName, type, conceptFolder, useSubfolders);
        const description = result.conceptDescriptions?.[fullName];
        const stubContent = stubNoteContent(type, name, description);
        const dir = stubPath.replace(/\/[^/]+$/, "");
        if (this.app.vault.getAbstractFileByPath(dir) === null) {
          await this.app.vault.createFolder(dir);
        }
        if (!this.app.vault.getAbstractFileByPath(stubPath)) {
          await this.app.vault.create(stubPath, stubContent);
        }
      }
    }

    const markdown = buildNarrativeDigestMarkdown(
      result.extraction.headline,
      result.extraction.publishedDate,
      result.narrative,
      result.conceptNoteNames,
      sourceUrl
    );
    if (this.app.vault.getAbstractFileByPath(digestFolder) === null && digestFolder) {
      await this.app.vault.createFolder(digestFolder);
    }
    const existingDigest = this.app.vault.getAbstractFileByPath(digestPath);
    if (existingDigest instanceof TFile) {
      await this.app.vault.modify(existingDigest, markdown);
    } else {
      await this.app.vault.create(digestPath, markdown);
    }
    return digestPath;
  }

  /** Process extracted article only (legacy: summary + key points + concept list). Used for Refresh. */
  async processExtraction(extraction: ArticleExtraction, sourceUrl?: string, existingDigestPath?: string): Promise<string | null> {
    const digestFolder = this.settings.digestFolder?.trim() || "Digests";
    const conceptFolder = this.settings.conceptFolder?.trim() || "Concepts";
    const useSubfolders = this.settings.conceptSubfolders;
    const createStubs = this.settings.createStubs;

    const slug = slugify(extraction.headline, extraction.publishedDate);
    const digestFileName = `FT - ${slug}.md`;
    const digestPath = existingDigestPath ?? (digestFolder ? `${digestFolder}/${digestFileName}` : digestFileName);

    const entities = extraction.entities;
    for (const type of ENTITY_TYPES) {
      const list = entities[ENTITY_KEYS[type]];
      if (!Array.isArray(list)) continue;
      const seen = new Set<string>();
      for (const name of list) {
        if (!name || !String(name).trim() || seen.has(name)) continue;
        seen.add(name);
        const resolved = resolveConcept(this.app, type, name, conceptFolder);
        if (resolved.createdStub && createStubs) {
          const stubPath = conceptNotePath(resolved.noteName, type, conceptFolder, useSubfolders);
          const stubContent = stubNoteContent(type, name);
          const dir = stubPath.replace(/\/[^/]+$/, "");
          if (this.app.vault.getAbstractFileByPath(dir) === null) {
            await this.app.vault.createFolder(dir);
          }
          if (!this.app.vault.getAbstractFileByPath(stubPath)) {
            await this.app.vault.create(stubPath, stubContent);
          }
        }
      }
    }

    const markdown = buildDigestMarkdown(extraction, sourceUrl);
    if (this.app.vault.getAbstractFileByPath(digestFolder) === null && digestFolder) {
      await this.app.vault.createFolder(digestFolder);
    }
    const existingDigest = this.app.vault.getAbstractFileByPath(digestPath);
    if (existingDigest instanceof TFile) {
      await this.app.vault.modify(existingDigest, markdown);
    } else {
      await this.app.vault.create(digestPath, markdown);
    }
    return digestPath;
  }

  async refreshLinksForNote(notePath: string): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(notePath);
    if (!file || !(file instanceof TFile)) return;
    const content = await this.app.vault.read(file);
    const textForExtraction = this.getArticleTextFromDigest(content);
    if (!textForExtraction.trim()) {
      new Notice("No summary/key points found to re-extract. Paste full article in Process FT article.");
      return;
    }
    if (!this.settings.llmApiKey?.trim()) {
      new Notice("Set LLM API key in Settings → FT Digest.");
      return;
    }
    const existingUrl = this.getUrlFromFrontmatter(content);
    const { runDigestPipeline } = await import("./pipeline");
    const llmSettings = {
      provider: this.settings.llmProvider || "openai",
      apiUrl: this.settings.llmApiUrl,
      apiKey: this.settings.llmApiKey,
      model: this.settings.llmModel,
    };
    try {
      const result = await runDigestPipeline(textForExtraction, llmSettings);
      if (!result) {
        new Notice("Re-run failed: could not complete pipeline.");
        return;
      }
      await this.processPipelineResult(result, existingUrl, file.path);
      new Notice("Refreshed digest and concept links.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      new Notice(`Refresh failed: ${msg}`);
    }
  }

  private getUrlFromFrontmatter(md: string): string | undefined {
    const match = md.match(/^---\s*[\s\S]*?url:\s*(\S+)\s*[\s\S]*?---/m);
    return match ? match[1].trim() : undefined;
  }

  /** Extract body text from digest (narrative or summary + key points) for re-running pipeline. */
  private getArticleTextFromDigest(md: string): string {
    const withoutFrontmatter = md.replace(/^---[\s\S]*?---\s*/m, "").trim();
    const beforeConcepts = withoutFrontmatter.split(/^##\s+Concepts\s*$/m)[0];
    if (!beforeConcepts) return withoutFrontmatter;
    const withoutTitle = beforeConcepts.replace(/^#\s+.*$/m, "").trim();
    if (withoutTitle.includes("## Summary")) {
      return withoutTitle.replace(/^##\s+Summary\s*$/m, "").replace(/^##\s+Key points\s*$/m, "").trim();
    }
    return withoutTitle;
  }

  async ftSync(): Promise<void> {
    if (!this.settings.ftApiKey?.trim()) {
      new Notice("FT API key not set. Add it in Settings → FT Digest.");
      return;
    }
    const { fetchAndProcessFTArticles } = await import("./ftApi");
    try {
      new Notice("FT Sync started…");
      const count = await fetchAndProcessFTArticles(this.app, this);
      new Notice(`FT Sync: processed ${count} new article(s).`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      new Notice(`FT Sync failed: ${msg}`);
    }
  }

  private async runLawyerSays(file: TFile): Promise<void> {
    if (!this.settings.llmApiKey?.trim()) {
      new Notice("Set LLM API key in Settings → FT Digest.");
      return;
    }
    const content = await this.app.vault.read(file);
    if (content.includes("## Lawyer says")) {
      new Notice("This note already has a Lawyer says section. Remove it or use a new note.");
      return;
    }
    try {
      new Notice("Lawyer says…");
      const llmSettings = {
        provider: this.settings.llmProvider || "openai",
        apiUrl: this.settings.llmApiUrl,
        apiKey: this.settings.llmApiKey,
        model: this.settings.llmModel,
      };
      const toAppend = await runLawyerSays(content, llmSettings);
      await this.app.vault.modify(file, content + toAppend);
      new Notice("Lawyer says added. Complete the trainee task under \"Your answer\", then run Lawyer reviews.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      new Notice(`Lawyer says failed: ${msg}`);
    }
  }

  private async runLawyerReviews(file: TFile): Promise<void> {
    if (!this.settings.llmApiKey?.trim()) {
      new Notice("Set LLM API key in Settings → FT Digest.");
      return;
    }
    let content = await this.app.vault.read(file);
    try {
      new Notice("Lawyer reviews…");
      const llmSettings = {
        provider: this.settings.llmProvider || "openai",
        apiUrl: this.settings.llmApiUrl,
        apiKey: this.settings.llmApiKey,
        model: this.settings.llmModel,
      };
      const newReviewSection = await runLawyerReviews(content, llmSettings);
      const marker = "## Lawyer reviews";
      if (content.includes(marker)) {
        const before = content.split(marker)[0].trimEnd();
        content = before + newReviewSection.trimStart();
      } else {
        content = content + newReviewSection;
      }
      await this.app.vault.modify(file, content);
      new Notice("Lawyer reviews added.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      new Notice(`Lawyer reviews failed: ${msg}`);
    }
  }
}
