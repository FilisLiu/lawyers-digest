import { App, Modal, Notice } from "obsidian";
import type FTDigestPlugin from "./main";
import { runDigestPipeline } from "./pipeline";

export class ProcessArticleModal extends Modal {
  constructor(
    app: App,
    private plugin: FTDigestPlugin
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Process FT article" });
    const desc = contentEl.createEl("p", { cls: "ft-digest-modal-desc" });
    desc.setText("Paste article URL or full text below. Extraction uses the configured LLM.");
    const modeContainer = contentEl.createDiv({ cls: "ft-digest-modal-mode" });
    const labelMode = modeContainer.createEl("label");
    labelMode.setText("Input: ");
    const select = modeContainer.createEl("select");
    select.addClass("ft-digest-select");
    const optPaste = select.createEl("option", { value: "paste" });
    optPaste.setText("Paste text");
    const optUrl = select.createEl("option", { value: "url" });
    optUrl.setText("URL (fetch then extract)");
    const inputContainer = contentEl.createDiv({ cls: "ft-digest-modal-input" });
    const ta = contentEl.createEl("textarea", { cls: "ft-digest-textarea" });
    ta.placeholder = "Paste article text or FT article URL…";
    ta.setAttr("rows", "12");
    inputContainer.appendChild(ta);
    const btnRow = contentEl.createDiv({ cls: "ft-digest-modal-buttons" });
    const submit = btnRow.createEl("button", { cls: "mod-cta" });
    submit.setText("Process");
    const cancel = btnRow.createEl("button");
    cancel.setText("Cancel");

    let isUrl = false;
    select.onchange = () => {
      isUrl = select.value === "url";
      ta.placeholder = isUrl ? "https://www.ft.com/content/…" : "Paste article text…";
    };

    submit.onclick = async () => {
      const raw = ta.value.trim();
      if (!raw) {
        new Notice("Enter URL or paste article text.");
        return;
      }
      if (!this.plugin.settings.llmApiKey?.trim()) {
        new Notice("Set LLM API key in Settings → FT Digest.");
        return;
      }
      submit.setAttribute("disabled", "true");
      submit.setText("Processing…");
      try {
        let articleText = raw;
        let sourceUrl: string | undefined;
        if (isUrl || raw.startsWith("http://") || raw.startsWith("https://")) {
          sourceUrl = raw.startsWith("http") ? raw : undefined;
          const url = sourceUrl || raw;
          if (!this.isValidUrl(url)) {
            new Notice("Invalid URL format. Please use http:// or https:// URLs.");
            submit.removeAttribute("disabled");
            submit.setText("Process");
            return;
          }
          const fetched = await this.fetchArticleText(url);
          if (!fetched) {
            new Notice("Could not fetch URL. The site may block automated requests. Paste the article text instead.");
            submit.removeAttribute("disabled");
            submit.setText("Process");
            return;
          }
          articleText = fetched;
          if (!sourceUrl) sourceUrl = raw;
        }
        const llmSettings = {
          provider: this.plugin.settings.llmProvider || "openai",
          apiUrl: this.plugin.settings.llmApiUrl,
          apiKey: this.plugin.settings.llmApiKey,
          model: this.plugin.settings.llmModel,
        };
        const result = await runDigestPipeline(articleText, llmSettings);
        if (!result) {
          new Notice("Pipeline failed: could not extract from article.");
          submit.removeAttribute("disabled");
          submit.setText("Process");
          return;
        }
        const path = await this.plugin.processPipelineResult(result, sourceUrl);
        if (path) {
          new Notice(`Digest saved: ${path}`);
          this.close();
        } else {
          new Notice("Failed to save digest.");
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const errorMsg = msg.length > 100 ? msg.slice(0, 100) + "..." : msg;
        new Notice(`Error: ${errorMsg}`);
        console.error("FT Digest plugin error:", e);
      }
      submit.removeAttribute("disabled");
      submit.setText("Process");
    };

    cancel.onclick = () => this.close();
  }

  /** Validate URL before fetching */
  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      // Only allow http/https protocols
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

  /** Fetch article text from URL; strip HTML to plain text for LLM */
  private async fetchArticleText(url: string): Promise<string | null> {
    if (!this.isValidUrl(url)) {
      return null;
    }
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Obsidian-FT-Digest/1.0" },
        // Add timeout (browser fetch doesn't support timeout directly, but this helps)
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });
      if (!res.ok) return null;
      const html = await res.text();
      return this.stripHtmlToText(html);
    } catch {
      return null;
    }
  }

  /** Safely strip HTML to plain text (improved security) */
  private stripHtmlToText(html: string): string {
    // Limit HTML size to prevent DoS
    const limitedHtml = html.slice(0, 1000000); // 1MB max
    const div = document.createElement("div");
    // Use textContent instead of innerHTML when possible for better security
    // But we need innerHTML to parse structure, so we'll extract text immediately
    div.innerHTML = limitedHtml;
    const article =
      div.querySelector("article") ||
      div.querySelector("[data-trackable='article-body']") ||
      div.querySelector(".article__content") ||
      div;
    let text = article?.textContent ?? div.textContent ?? "";
    text = text.replace(/\s+/g, " ").trim();
    return text.slice(0, 50000);
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}
