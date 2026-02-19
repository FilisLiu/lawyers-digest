/**
 * FT Developer API: Notifications + Content.
 * Syncs new articles and runs the same digest pipeline (idempotent by article id).
 */

import type { App } from "obsidian";
import type FTDigestPlugin from "./main";
import { runDigestPipeline } from "./pipeline";

const FT_NOTIFICATIONS_URL = "https://api.ft.com/content/notifications";
const FT_CONTENT_URL = "https://api.ft.com/content";
const RATE_DELAY_MS = 500;
const MAX_PROCESSED_IDS = 5000;

/** Fetch notifications since last sync (article UUIDs) */
async function fetchNotificationIds(apiKey: string, since?: string): Promise<string[]> {
  const url = since
    ? `${FT_NOTIFICATIONS_URL}?since=${encodeURIComponent(since)}`
    : FT_NOTIFICATIONS_URL;
  const res = await fetch(url, {
    headers: { "X-Api-Key": apiKey },
  });
  if (!res.ok) throw new Error(`FT Notifications API ${res.status}`);
  const data = (await res.json()) as { notifications?: Array<{ id?: string }> };
  const list = data?.notifications ?? [];
  return list.map((n) => n.id).filter((id): id is string => typeof id === "string");
}

/** Fetch one article body by id */
async function fetchArticleContent(apiKey: string, id: string): Promise<{ title?: string; bodyXML?: string; webUrl?: string; publishedDate?: string } | null> {
  const res = await fetch(`${FT_CONTENT_URL}/${id}`, {
    headers: { "X-Api-Key": apiKey },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { title?: string; bodyXML?: string; webUrl?: string; publishedDate?: string };
  return data;
}

function htmlToPlainText(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.innerText ?? "").replace(/\s+/g, " ").trim().slice(0, 50000);
}

export async function fetchAndProcessFTArticles(app: App, plugin: FTDigestPlugin): Promise<number> {
  const apiKey = plugin.settings.ftApiKey?.trim();
  if (!apiKey) throw new Error("FT API key not set");

  const lastTs = plugin.settings.ftSyncLastTimestamp ?? undefined;
  const ids = await fetchNotificationIds(apiKey, lastTs);
  const processed = new Set(plugin.settings.ftProcessedIds ?? []);
  const toProcess = ids.filter((id) => !processed.has(id)).slice(0, 20);

  let count = 0;
  const now = new Date().toISOString();
  const newProcessed = [...(plugin.settings.ftProcessedIds ?? [])];

  for (const id of toProcess) {
    await new Promise((r) => setTimeout(r, RATE_DELAY_MS));
    const content = await fetchArticleContent(apiKey, id);
    if (!content?.bodyXML) continue;
    const articleText = content.title ? `${content.title}\n\n${htmlToPlainText(content.bodyXML)}` : htmlToPlainText(content.bodyXML);
    const llmSettings = {
      provider: plugin.settings.llmProvider || "openai",
      apiUrl: plugin.settings.llmApiUrl,
      apiKey: plugin.settings.llmApiKey,
      model: plugin.settings.llmModel,
    };
    const result = await runDigestPipeline(articleText, llmSettings);
    if (!result) continue;
    const url = content.webUrl;
    await plugin.processPipelineResult(result, url);
    newProcessed.push(id);
    count++;
  }

  plugin.settings.ftSyncLastTimestamp = now;
  plugin.settings.ftProcessedIds = newProcessed.slice(-MAX_PROCESSED_IDS);
  await plugin.saveSettings();
  return count;
}
