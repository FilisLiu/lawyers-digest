/**
 * Resolve concept names to existing vault notes or create stubs.
 * Uses note title and optional frontmatter aliases for matching.
 */

import type { App } from "obsidian";
import type { EntityType } from "./ontology";
import { conceptNoteTitle, ENTITY_TYPE_LABELS } from "./ontology";

/** Parse "Type - Name" (e.g. "Act - Companies Act 2006") to type and name for stub creation. */
export function parseConceptNoteName(fullName: string): { type: EntityType; name: string } | null {
  const trimmed = fullName.trim();
  const labelToType: Record<string, EntityType> = {};
  for (const [type, label] of Object.entries(ENTITY_TYPE_LABELS)) {
    labelToType[label] = type as EntityType;
  }
  for (const [label, type] of Object.entries(labelToType)) {
    const prefix = `${label} - `;
    if (trimmed.startsWith(prefix)) {
      const name = trimmed.slice(prefix.length).trim();
      if (name) return { type, name };
      return null;
    }
  }
  return null;
}

export interface ResolvedConcept {
  /** Exact note name to use in [[link]] */
  noteName: string;
  type: EntityType;
  /** Whether we created a new stub (so caller can write the file) */
  createdStub: boolean;
}

/** Normalise for matching: lowercase, collapse spaces, remove common punctuation */
function normaliseForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/['']/g, "")
    .trim();
}

/** Get all markdown files in vault and index by normalised title and aliases */
function getConceptNoteIndex(app: App, conceptFolder?: string): Map<string, string> {
  const map = new Map<string, string>();
  const files = app.vault.getMarkdownFiles();
  const prefix = conceptFolder ? conceptFolder.replace(/\/$/, "") + "/" : "";
  for (const f of files) {
    const name = f.basename;
    const path = f.path;
    if (conceptFolder && !path.startsWith(prefix)) continue;
    const norm = normaliseForMatch(name);
    if (norm && !map.has(norm)) map.set(norm, name);
    const cache = app.metadataCache.getFileCache(f);
    const aliases = cache?.frontmatter?.aliases;
    if (aliases) {
      const list = Array.isArray(aliases) ? aliases : [aliases];
      for (const a of list) {
        if (typeof a !== "string") continue;
        const an = normaliseForMatch(a);
        if (an && !map.has(an)) map.set(an, name);
      }
    }
  }
  return map;
}

/**
 * Resolve entity to a note name. If a note with matching title or alias exists, return it.
 * Otherwise return the canonical "Type - Name" and mark createdStub true so caller can create the file.
 */
export function resolveConcept(
  app: App,
  type: EntityType,
  name: string,
  conceptFolder?: string
): ResolvedConcept {
  const canonicalName = conceptNoteTitle(type, name);
  const index = getConceptNoteIndex(app, conceptFolder);
  const norm = normaliseForMatch(canonicalName);
  const existing = index.get(norm);
  if (existing) {
    return { noteName: existing, type, createdStub: false };
  }
  const normName = normaliseForMatch(name);
  const byName = index.get(normName);
  if (byName) {
    return { noteName: byName, type, createdStub: false };
  }
  return { noteName: canonicalName, type, createdStub: true };
}

/** Stub note content for a new concept. If description is provided, use it as the Summary body. */
export function stubNoteContent(type: EntityType, name: string, description?: string): string {
  const label = ENTITY_TYPE_LABELS[type];
  const lines: string[] = [];
  lines.push("---");
  lines.push(`type: ${type}`);
  lines.push(`aliases: [${name}]`);
  lines.push("---");
  lines.push("");
  lines.push(`# ${label}: ${name}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  if (description && description.trim()) {
    lines.push(description.trim());
  } else {
    lines.push("*Add a short description and link to articles that mention this concept.*");
  }
  lines.push("");
  return lines.join("\n");
}

/** Path for a concept note (optional subfolder by type, e.g. Concepts/Acts/) */
export function conceptNotePath(
  noteName: string,
  type: EntityType,
  conceptFolder?: string,
  useSubfolders?: boolean
): string {
  const base = conceptFolder ? conceptFolder.replace(/\/$/, "") + "/" : "";
  if (useSubfolders) {
    const sub = type === "act" ? "Acts" : type === "party" ? "Parties" : type === "theme" ? "Themes" : type === "sector" ? "Sectors" : type === "jurisdiction" ? "Jurisdictions" : type === "authority" ? "Authorities" : "Issues";
    return `${base}${sub}/${noteName}.md`;
  }
  return `${base}${noteName}.md`;
}

/** Content for a reference/event note (e.g. [[Merger-Standard Life & Aberdeen 2020]]). Link text = note name; no "Type - " prefix. */
export function referenceNoteContent(linkText: string, context: string, source: string): string {
  const lines: string[] = [];
  lines.push("---");
  lines.push("type: reference");
  lines.push("---");
  lines.push("");
  lines.push(`# ${linkText}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(context.trim());
  lines.push("");
  lines.push("## Source");
  lines.push("");
  lines.push(source.trim() || "*No source provided.*");
  lines.push("");
  return lines.join("\n");
}

/** Path for a reference note (Concepts/References/LinkText.md). */
export function referenceNotePath(linkText: string, conceptFolder: string): string {
  const base = conceptFolder.replace(/\/$/, "") + "/";
  return `${base}References/${linkText}.md`;
}
