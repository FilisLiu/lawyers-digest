/**
 * Multi-step pipeline: extract → solicitor insight → narrative with embedded links.
 */

import type { ArticleExtraction } from "./ontology";
import { ENTITY_TYPE_LABELS } from "./ontology";
import type { EntityType } from "./ontology";
import { extractWithLLM, chatForText } from "./llm";
import type { LLMSettings } from "./llm";
import {
  INSIGHT_SYSTEM_PROMPT,
  NARRATIVE_SYSTEM_PROMPT,
  CONCEPT_DESCRIPTIONS_SYSTEM_PROMPT,
  parseConceptDescriptionsResponse,
} from "./prompt";

export interface PipelineResult {
  extraction: ArticleExtraction;
  insight: string;
  narrative: string;
  /** Canonical note names for stub creation: "Type - Name" */
  conceptNoteNames: string[];
  /** Optional short description per "Type - Name" for stub Summary section */
  conceptDescriptions: Record<string, string>;
}

/** Format entities as "Type - Name" for the narrative prompt. */
function conceptNoteNamesFromExtraction(extraction: ArticleExtraction): string[] {
  const out: string[] = [];
  const e = extraction.entities;
  const keys = [
    "sectors",
    "jurisdictions",
    "acts",
    "authorities",
    "parties",
    "themes",
    "issues",
  ] as const;
  const typeMap: Record<string, EntityType> = {
    sectors: "sector",
    jurisdictions: "jurisdiction",
    acts: "act",
    authorities: "authority",
    parties: "party",
    themes: "theme",
    issues: "issue",
  };
  for (const key of keys) {
    const list = e[key];
    if (!Array.isArray(list)) continue;
    const type = typeMap[key];
    const label = ENTITY_TYPE_LABELS[type];
    for (const name of list) {
      const n = String(name).trim();
      if (!n) continue;
      out.push(`${label} - ${n}`);
    }
  }
  return out;
}

/**
 * Run the full pipeline: extract → insight → narrative.
 * Narrative text will contain embedded [[Type - Name]] links.
 */
export async function runDigestPipeline(
  articleText: string,
  settings: LLMSettings
): Promise<PipelineResult | null> {
  const extraction = await extractWithLLM(articleText, settings);
  if (!extraction) return null;

  const conceptList = conceptNoteNamesFromExtraction(extraction);

  const insight = await chatForText(
    INSIGHT_SYSTEM_PROMPT,
    `Article summary: ${extraction.summary}\n\nFull text (excerpt):\n${articleText.slice(0, 6000)}\n\nProvide solicitor-level interpretation (1–2 paragraphs).`,
    settings
  );

  const narrativeUser = `Headline: ${extraction.headline}\n\nSummary: ${extraction.summary}\n\nSolicitor insight:\n${insight}\n\nConcepts to embed as [[links]] (use these exact strings):\n${conceptList.join("\n")}\n\nWrite the narrative digest with every concept embedded as [[Type - Name]].`;
  const narrative = await chatForText(NARRATIVE_SYSTEM_PROMPT, narrativeUser, settings);

  const descUser = `Article summary: ${extraction.summary}\n\nSolicitor insight:\n${insight}\n\nConcepts (use these exact strings as JSON keys):\n${conceptList.join("\n")}\n\nRespond with a single JSON object: each key is one "Type - Name" above, each value is 1–3 sentences for that concept's Summary.`;
  const descRaw = await chatForText(CONCEPT_DESCRIPTIONS_SYSTEM_PROMPT, descUser, settings);
  const conceptDescriptions = parseConceptDescriptionsResponse(descRaw) ?? {};

  return {
    extraction,
    insight,
    narrative: narrative.trim(),
    conceptNoteNames: conceptList,
    conceptDescriptions,
  };
}
