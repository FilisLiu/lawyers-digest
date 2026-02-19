/**
 * Build digest note content and concept wiki links from extraction.
 */

import type { ArticleExtraction, EntityType } from "./ontology";
import { conceptNoteTitle, ENTITY_TYPES } from "./ontology";

export interface DigestOptions {
  sourceUrl?: string;
  /** Base path for digest file (e.g. "Digests") */
  digestFolder?: string;
  /** Base path for concept stubs (e.g. "Concepts") */
  conceptFolder?: string;
}

/** Slug for filename: safe, readable, unique with date */
export function slugify(headline: string, publishedDate?: string): string {
  const datePart = publishedDate ? publishedDate.replace(/-/g, "").slice(0, 8) : "";
  const base = headline
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  const slug = base ? base.replace(/\s/g, "-") : "untitled";
  return datePart ? `${datePart}-${slug}` : slug;
}

/** Obsidian wiki link for a concept (display name = note name) */
export function wikiLink(type: EntityType, name: string): string {
  const title = conceptNoteTitle(type, name);
  return `[[${title}]]`;
}

export const ENTITY_KEYS: Record<EntityType, keyof ArticleExtraction["entities"]> = {
  sector: "sectors",
  jurisdiction: "jurisdictions",
  act: "acts",
  authority: "authorities",
  party: "parties",
  theme: "themes",
  issue: "issues",
};

/** All concept links from extraction, grouped by type */
export function conceptLinks(entities: ArticleExtraction["entities"]): string[] {
  const out: string[] = [];
  for (const type of ENTITY_TYPES) {
    const list = entities[ENTITY_KEYS[type]];
    if (!Array.isArray(list)) continue;
    const seen = new Set<string>();
    for (const name of list) {
      if (!name || seen.has(name)) continue;
      seen.add(name);
      out.push(wikiLink(type as EntityType, name));
    }
  }
  return out;
}

/** Full markdown content for the digest note (legacy: summary + key points + concept list). */
export function buildDigestMarkdown(extraction: ArticleExtraction, sourceUrl?: string): string {
  const lines: string[] = [];
  const date = extraction.publishedDate ?? new Date().toISOString().slice(0, 10);
  lines.push("---");
  lines.push("type: article");
  lines.push("source: FT");
  lines.push(`date: ${date}`);
  if (sourceUrl) lines.push(`url: ${sourceUrl}`);
  lines.push("---");
  lines.push("");
  lines.push(`# ${extraction.headline}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(extraction.summary);
  lines.push("");
  lines.push("## Key points");
  lines.push("");
  for (const p of extraction.keyPoints) {
    lines.push(`- ${p}`);
  }
  lines.push("");
  lines.push("## Concepts");
  lines.push("");
  const links = conceptLinks(extraction.entities);
  if (links.length) {
    lines.push(links.join(" "));
  } else {
    lines.push("*No concepts extracted.*");
  }
  lines.push("");
  return lines.join("\n");
}

/** Narrative digest: solicitor-style prose with embedded [[links]], then concepts list. */
export function buildNarrativeDigestMarkdown(
  headline: string,
  publishedDate: string | undefined,
  narrative: string,
  conceptNoteNames: string[],
  sourceUrl?: string
): string {
  const date = publishedDate ?? new Date().toISOString().slice(0, 10);
  const lines: string[] = [];
  lines.push("---");
  lines.push("type: article");
  lines.push("source: FT");
  lines.push(`date: ${date}`);
  if (sourceUrl) lines.push(`url: ${sourceUrl}`);
  lines.push("---");
  lines.push("");
  lines.push(`# ${headline}`);
  lines.push("");
  lines.push(narrative);
  lines.push("");
  if (conceptNoteNames.length > 0) {
    lines.push("## Concepts");
    lines.push("");
    lines.push(conceptNoteNames.map((n) => `[[${n}]]`).join(" "));
    lines.push("");
  }
  return lines.join("\n");
}
