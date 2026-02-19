/**
 * Epistemological framework for commercial news article extraction.
 * Entity types and relations aligned with how top-firm solicitors read commercial news.
 */

export const ENTITY_TYPES = [
  "sector",
  "jurisdiction",
  "act",
  "authority",
  "party",
  "theme",
  "issue",
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  sector: "Sector",
  jurisdiction: "Jurisdiction",
  act: "Act",
  authority: "Authority",
  party: "Party",
  theme: "Theme",
  issue: "Issue",
};

/** Canonical note name prefix for Obsidian links, e.g. "Act - Companies Act 2006" */
export function conceptNoteTitle(type: EntityType, name: string): string {
  const label = ENTITY_TYPE_LABELS[type];
  return `${label} - ${name.trim()}`;
}

/** Extracted entities from one article (short labels per plan) */
export interface ExtractedEntities {
  sectors: string[];
  jurisdictions: string[];
  acts: string[];
  authorities: string[];
  parties: string[];
  themes: string[];
  issues: string[];
}

/** Full extraction result from LLM */
export interface ArticleExtraction {
  headline: string;
  summary: string;
  keyPoints: string[];
  publishedDate?: string;
  entities: ExtractedEntities;
}

/** JSON schema for LLM response (structured output) */
export const EXTRACTION_JSON_SCHEMA = {
  type: "object",
  required: ["headline", "summary", "keyPoints", "entities"],
  properties: {
    headline: { type: "string", description: "Article headline" },
    summary: { type: "string", description: "2-3 sentence summary" },
    keyPoints: {
      type: "array",
      items: { type: "string" },
      description: "Bullet-point key takeaways",
    },
    publishedDate: { type: "string", description: "ISO date if identifiable" },
    entities: {
      type: "object",
      required: ["sectors", "jurisdictions", "acts", "authorities", "parties", "themes", "issues"],
      properties: {
        sectors: { type: "array", items: { type: "string" } },
        jurisdictions: { type: "array", items: { type: "string" } },
        acts: { type: "array", items: { type: "string" } },
        authorities: { type: "array", items: { type: "string" } },
        parties: { type: "array", items: { type: "string" } },
        themes: { type: "array", items: { type: "string" } },
        issues: { type: "array", items: { type: "string" } },
      },
    },
  },
} as const;
