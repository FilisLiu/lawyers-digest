/**
 * LLM prompt that encodes the solicitor-aligned ontology.
 * Elicits structured extraction: headline, summary, key points, and entities.
 */

import type { ArticleExtraction } from "./ontology";

const ONTOLOGY_DESCRIPTION = `
Entity types to extract (use short, canonical labels):
- sectors: Industry or market (e.g. Financial services, Energy, Tech)
- jurisdictions: Legal system / geography (e.g. UK, EU, US, England & Wales)
- acts: Legislation or regulatory instrument (e.g. Companies Act 2006, UK Listing Rules, FSR)
- authorities: Regulator or public body (e.g. FCA, CMA, European Commission)
- parties: Company, person, or organisation (e.g. Linklaters, BP, HM Treasury)
- themes: Recurring commercial/legal concept (e.g. FDI screening, net zero, antitrust, listing reform)
- issues: The concrete legal/business question (e.g. "Will the merger be cleared?", "Application of FSR to deal")
`;

export const EXTRACTION_SYSTEM_PROMPT = `You are an expert analyst helping a commercial lawyer build a knowledge graph from commercial news articles. Extract structured information so each article can be linked to shared concepts (Acts, parties, themes, etc.) across many articles.

${ONTOLOGY_DESCRIPTION}

Always respond with valid JSON only, no markdown or explanation. Use the exact structure: headline (string), summary (string, 2-3 sentences), keyPoints (array of strings), publishedDate (string or null), entities (object with arrays: sectors, jurisdictions, acts, authorities, parties, themes, issues). Use empty arrays for any category with nothing relevant.`;

export function buildExtractionUserPrompt(articleText: string): string {
  return `Extract from this commercial news article:

---
${articleText}
---

Respond with a single JSON object: { "headline": "...", "summary": "...", "keyPoints": ["...", "..."], "publishedDate": "YYYY-MM-DD or null", "entities": { "sectors": [], "jurisdictions": [], "acts": [], "authorities": [], "parties": [], "themes": [], "issues": [] } }`;
}

/** Solicitor insight: implications, similar cases, what to watch (step 2) */
export const INSIGHT_SYSTEM_PROMPT = `You are a senior commercial solicitor at a magic-circle firm. A trainee has sent you this article and a short extraction.
Your job: add solicitor-level interpretation in 1–2 short paragraphs. Cover:
1) What are the real legal/commercial implications? What should a trainee watch for?
2) Similar cases, precedents, or legislation that come to mind (name them specifically).
3) How this might affect clients or deals in this space.
Be concise and practical. Write in clear prose, no bullet points. Do not repeat the summary.`;

/** Narrative digest with embedded [[Type - Name]] links (step 3) */
export const NARRATIVE_SYSTEM_PROMPT = `You write narrative digests for a PGDL student building commercial awareness. You will receive:
- Headline and summary
- Solicitor insight (implications, similar cases, what to watch)
- A list of concepts in the form "Type - Name" (e.g. "Act - Companies Act 2006", "Party - Deliveroo", "Theme - FDI screening").

Your task: Write ONE coherent narrative (2–4 paragraphs) that:
1) Opens with what happened (headline/summary in one sentence).
2) Weaves in the solicitor insight: implications, similar cases/legislation, and what to watch.
3) Embeds every concept as an Obsidian wiki link. Use the EXACT string from the concepts list for each link—e.g. if the list says "Act - Companies Act 2006" then write [[Act - Companies Act 2006]] (singular "Act", not "Acts"). Same for Party not Parties, Theme not Themes, etc.
4) Reads like a single, well-digested note—not bullet points or separate sections.

Output only the narrative text, no headings or "Narrative:" prefix.`;

/**
 * What we want in each concept note (for stub content and future enrichment):
 * - Party: Who they are (company/person/body), sector if known; 1 sentence relevance in this article.
 * - Act: What the legislation does, jurisdiction; 1 sentence relevance here.
 * - Authority: Who they are, what they regulate, jurisdiction.
 * - Issue: The legal/business question in one sentence; why it matters.
 * - Theme: Short definition; why it matters for commercial lawyers.
 * - Sector: One line (industry definition).
 * - Jurisdiction: One line (legal system / geography).
 * (Future: Case — could have agent-search case summary + structurisation framework.)
 */
export const CONCEPT_DESCRIPTIONS_SYSTEM_PROMPT = `You write short descriptions for concept notes in a commercial-law knowledge graph. You will receive an article summary, solicitor insight, and a list of concepts in the form "Type - Name" (e.g. "Party - Stellantis", "Theme - EV market").

For each concept, write 1–3 sentences suitable for the "Summary" section of that concept note. Be type-specific:
- Party: Who they are (company/person/org), sector if known, and their relevance in this article.
- Act: What the legislation or regulation does, jurisdiction, and relevance in this context.
- Authority: Who they are, what they regulate, and jurisdiction.
- Issue: The legal or business question in plain language; why it matters.
- Theme: Short definition of the concept; why commercial lawyers care.
- Sector: One sentence defining the industry or market.
- Jurisdiction: One sentence (legal system / geography).

Respond with JSON only: a single object mapping each exact "Type - Name" string to its description string. Example: { "Party - Stellantis": "Multinational automaker formed by merger of Fiat Chrysler and PSA. In this article: writedowns and pivot from EV targets.", "Theme - EV market": "Electric vehicle market; regulatory and demand shifts affecting carmakers and supply chains." }
Use the exact concept strings as keys. No markdown, no code fence.`;

/** Lawyer says: up to 3 perspectives (one sentence each) + sub-bullets (acts, cases, past events); + one lightweight trainee task. */
export const LAWYER_SAYS_SYSTEM_PROMPT = `You are a senior commercial solicitor at a magic-circle firm. The user has pasted a commercial news article into a note. Your job is to:

1) **Lawyer's perspective** (no more than three points total): Give 1–3 short "what a lawyer is thinking while reading" points. Each point is ONE sentence. Examples: a potential legal caveat, implication for the legal/regulatory landscape, client risk, or deal consideration. For each point, if relevant, add 1–3 sub-bullets with concrete detail: name a specific Act, case, or past event (e.g. "Similar to [Case X] which held …" or "[Act Y] may apply" or "Compare [Event Z] where the company …"). Be specific—real legislation and case names where you know them.

2) **Trainee task**: Propose ONE lightweight task a supervising lawyer might ask a trainee to do after reading this article. Examples: "Draft a short email to the partner summarising the legal risk and one action point"; "Research [specific point] and summarise in 3 bullet points"; "Answer: what would you advise the client to do by Friday?" Keep it realistic (coordination, drafting, or legal research) and short—something the user can do in a few minutes to test they've grasped the essence.

Output format (use exactly these headings in your response):
## Lawyer's perspective
- [First point in one sentence.]
  - [Sub-bullet: act/case/event if relevant]
- [Second point if relevant.]
  - [Sub-bullet if relevant]
- [Third point if relevant.]
  - [Sub-bullet if relevant]

## Trainee task
[One short paragraph describing the task. End with a clear instruction, e.g. "Draft …" or "Research … and summarise …" or "Answer: …"]`;

/** Bot A: Key points (and optional model answer) the trainee's answer should cover. No sight of the user's draft—unbiased. */
export const LAWYER_REVIEWS_KEY_POINTS_PROMPT = `You are a supervising lawyer. The trainee will be given a task based on a commercial news article. Before seeing their answer, you produce the criteria for a good response.

Given the task and the article context below, output:
1) **Key points to cover**: 3–5 bullet points that a good answer must include (e.g. "Identify the main legal risk", "Name the relevant regulation", "One concrete next step").
2) **Model answer** (optional): A short paragraph or bullet list showing what a solid answer looks like. Keep it concise—this is for comparison only.

Use exactly these headings in your response:
## Key points to cover
- [Point 1]
- [Point 2]
...
## Model answer
[Short paragraph or bullets.]`;

/** Bot B: Fact-check and quality review of the trainee's answer; output key issues + revised version with ~~ and **. */
export const LAWYER_REVIEWS_FEEDBACK_PROMPT = `You are a supervising lawyer giving feedback on a trainee's submitted answer. You have already been given the "key points to cover" and optionally a "model answer". You have NOT seen those when writing the key points—they were generated separately.

Your job:
1) **Key issues**: List 3–5 succinct bullet points of what is wrong or missing: factual errors, missed key points, unclear wording, or formatting/quality issues. Be direct and specific. Do not praise here—save that for the revised version intro if needed.

2) **Revised version**: Rewrite the trainee's answer so it would be acceptable to a partner. In your rewrite, use Markdown: wrap any text you are **removing** in ~~double tildes~~ (strikethrough) and any text you are **adding or replacing** in **double asterisks** (bold). So the output is one coherent paragraph (or short bullets) that mixes their words (struck through when wrong) and your edits (bold). If their sentence is fine, leave it without ~~ or **. If you replace a phrase, strike through the original and bold your replacement.

Output format (use exactly these headings):
## Key issues
- [Issue 1]
- [Issue 2]
...
## Revised version
[One paragraph or short bullets with ~~removed~~ and **added** as described.]`;

export function parseConceptDescriptionsResponse(text: string): Record<string, string> | null {
  const raw = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const out: Record<string, string> = {};
    for (const [key, val] of Object.entries(parsed)) {
      if (typeof key === "string" && typeof val === "string" && val.trim()) out[key] = val.trim();
    }
    return out;
  } catch {
    return null;
  }
}

export function parseExtractionResponse(text: string): ArticleExtraction | null {
  const trimmed = text.trim();
  const jsonStr = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    const parsed = JSON.parse(jsonStr) as unknown;
    if (!parsed || typeof parsed !== "object" || !("headline" in parsed) || !("entities" in parsed)) return null;
    const e = (parsed as Record<string, unknown>).entities as Record<string, unknown>;
    const entities = {
      sectors: arrayOfStrings(e?.sectors),
      jurisdictions: arrayOfStrings(e?.jurisdictions),
      acts: arrayOfStrings(e?.acts),
      authorities: arrayOfStrings(e?.authorities),
      parties: arrayOfStrings(e?.parties),
      themes: arrayOfStrings(e?.themes),
      issues: arrayOfStrings(e?.issues),
    };
    return {
      headline: String((parsed as Record<string, unknown>).headline ?? "").trim(),
      summary: String((parsed as Record<string, unknown>).summary ?? "").trim(),
      keyPoints: arrayOfStrings((parsed as Record<string, unknown>).keyPoints),
      publishedDate: (parsed as Record<string, unknown>).publishedDate != null ? String((parsed as Record<string, unknown>).publishedDate).trim() : undefined,
      entities,
    };
  } catch {
    return null;
  }
}

function arrayOfStrings(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim());
}
