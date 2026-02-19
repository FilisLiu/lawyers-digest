/**
 * Call LLM API for extraction and narrative pipeline. Supports OpenAI-compatible and Google Gemini.
 */

import {
  buildExtractionUserPrompt,
  EXTRACTION_SYSTEM_PROMPT,
  parseExtractionResponse,
} from "./prompt";
import type { ArticleExtraction } from "./ontology";

export type LLMProvider = "openai" | "gemini";

export interface LLMSettings {
  provider: LLMProvider;
  apiUrl: string;
  apiKey: string;
  model: string;
}

/** Single chat completion returning raw text (for insight and narrative steps). */
export async function chatForText(
  systemPrompt: string,
  userPrompt: string,
  settings: LLMSettings
): Promise<string> {
  const provider = settings.provider || "openai";
  if (provider === "gemini") {
    return chatForTextGemini(systemPrompt, userPrompt, settings);
  }
  return chatForTextOpenAI(systemPrompt, userPrompt, settings);
}

async function chatForTextOpenAI(
  systemPrompt: string,
  userPrompt: string,
  settings: LLMSettings
): Promise<string> {
  const url = settings.apiUrl || OPENAI_DEFAULT_URL;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: settings.model || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });
  if (!res.ok) throw new Error(`LLM API error ${res.status}: ${await res.text().then((t) => t.slice(0, 200))}`);
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("LLM returned no content");
  return text;
}

async function chatForTextGemini(
  systemPrompt: string,
  userPrompt: string,
  settings: LLMSettings
): Promise<string> {
  const model = settings.model || "gemini-2.0-flash";
  const apiKey = settings.apiKey || "";
  const useCustomUrl = settings.apiUrl?.trim() && settings.apiUrl.includes("generativelanguage");
  const url = useCustomUrl && settings.apiUrl
    ? settings.apiUrl
    : `${GEMINI_BASE_URL}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (useCustomUrl && apiKey) headers["x-goog-api-key"] = apiKey;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 2000 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini API error ${res.status}: ${await res.text().then((t) => t.slice(0, 200))}`);
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message?: string };
  };
  if (data.error?.message) throw new Error(`Gemini: ${data.error.message}`);
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no content");
  return text;
}

const OPENAI_DEFAULT_URL = "https://api.openai.com/v1/chat/completions";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export async function extractWithLLM(articleText: string, settings: LLMSettings): Promise<ArticleExtraction | null> {
  const provider = settings.provider || "openai";
  if (provider === "gemini") {
    return extractWithGemini(articleText, settings);
  }
  return extractWithOpenAI(articleText, settings);
}

/** OpenAI (and OpenAI-compatible) chat completions */
async function extractWithOpenAI(articleText: string, settings: LLMSettings): Promise<ArticleExtraction | null> {
  const url = settings.apiUrl || OPENAI_DEFAULT_URL;
  const body = {
    model: settings.model || "gpt-4o-mini",
    messages: [
      { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
      { role: "user", content: buildExtractionUserPrompt(articleText) },
    ],
    temperature: 0.2,
    max_tokens: 2000,
  };
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (settings.apiKey) {
    headers["Authorization"] = `Bearer ${settings.apiKey}`;
  }
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LLM API error ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("LLM returned no content");
  return parseExtractionResponse(content);
}

/** Google Gemini generateContent API (free tier at aistudio.google.com) */
async function extractWithGemini(articleText: string, settings: LLMSettings): Promise<ArticleExtraction | null> {
  const model = settings.model || "gemini-2.0-flash";
  const apiKey = settings.apiKey || "";
  const useCustomUrl = settings.apiUrl?.trim() && settings.apiUrl.includes("generativelanguage");
  const url = useCustomUrl && settings.apiUrl
    ? settings.apiUrl
    : `${GEMINI_BASE_URL}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (useCustomUrl && apiKey) headers["x-goog-api-key"] = apiKey;
  const body = {
    systemInstruction: {
      parts: [{ text: EXTRACTION_SYSTEM_PROMPT }],
    },
    contents: [
      {
        parts: [{ text: buildExtractionUserPrompt(articleText) }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2000,
    },
  };
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message?: string };
  };
  if (data.error?.message) throw new Error(`Gemini: ${data.error.message}`);
  const textPart = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textPart) throw new Error("Gemini returned no content");
  return parseExtractionResponse(textPart);
}
