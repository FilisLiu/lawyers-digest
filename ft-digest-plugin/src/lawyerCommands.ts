/**
 * Lawyer says: perspectives + trainee task.
 * Lawyer reviews: two-step (key points without user draft, then issues + revised answer with ~~ and **).
 */

import { chatForText } from "./llm";
import type { LLMSettings } from "./llm";
import {
  LAWYER_SAYS_SYSTEM_PROMPT,
  LAWYER_REVIEWS_KEY_POINTS_PROMPT,
  LAWYER_REVIEWS_FEEDBACK_PROMPT,
} from "./prompt";

const LAWYER_SAYS_MARKER = "## Lawyer says";
const TRAINEE_TASK_HEADING = "## Trainee task";
const YOUR_ANSWER_CALLOUT = "> [!todo]- Your answer";
const LAWYER_REVIEWS_MARKER = "## Lawyer reviews";

/** Build the "Your answer" block. */
function yourAnswerBlock(): string {
  return [
    "",
    "### Your answer",
    "",
    YOUR_ANSWER_CALLOUT,
    ">",
    "> ",
    "",
  ].join("\n");
}

/**
 * Run Lawyer says: read article content, return markdown to append (perspectives + trainee task + answer block).
 */
export async function runLawyerSays(articleContent: string, settings: LLMSettings): Promise<string> {
  const userPrompt = `Article content:\n\n---\n${articleContent.slice(0, 12000)}\n---\n\nProvide the lawyer's perspective (up to 3 points, with sub-bullets where relevant) and one trainee task. Use the exact headings specified.`;
  const raw = await chatForText(LAWYER_SAYS_SYSTEM_PROMPT, userPrompt, settings);
  const trimmed = raw.trim();
  return "\n\n" + LAWYER_SAYS_MARKER + "\n\n" + trimmed + yourAnswerBlock();
}

/**
 * Extract the trainee's answer from the note: content after "Your answer" callout (or after ### Your answer) until ## Lawyer reviews or end.
 */
export function extractTraineeAnswer(noteContent: string): string {
  const afterCallout = noteContent.split(YOUR_ANSWER_CALLOUT)[1] || noteContent.split("### Your answer")[1];
  if (!afterCallout) return "";
  const beforeReviews = afterCallout.split(LAWYER_REVIEWS_MARKER)[0];
  const text = beforeReviews
    .replace(/^>\s*$/gm, "")
    .replace(/^>\s?/gm, "")
    .trim();
  return text.slice(0, 4000);
}

/**
 * Run Lawyer reviews: two-step. (1) Key points to cover + model answer (no user draft). (2) Key issues + revised answer with ~~ and **.
 */
export async function runLawyerReviews(noteContent: string, settings: LLMSettings): Promise<string> {
  const answer = extractTraineeAnswer(noteContent);
  if (!answer || answer.length < 10) {
    return "\n\n" + LAWYER_REVIEWS_MARKER + "\n\n*No answer found. Add your response under the \"Your answer\" callout and run this command again.*\n";
  }
  const taskSection = noteContent.includes(TRAINEE_TASK_HEADING)
    ? noteContent.split(TRAINEE_TASK_HEADING)[1]?.split("### Your answer")[0]?.trim().slice(0, 800) ?? ""
    : "";
  const articleExcerpt = noteContent.split(LAWYER_SAYS_MARKER)[0]?.trim().slice(0, 4000) ?? "";

  const keyPointsUser = `Task:\n${taskSection}\n\nArticle context (excerpt):\n${articleExcerpt}\n\nOutput key points to cover and an optional short model answer. Do not look at any trainee answer.`;
  const keyPointsRaw = await chatForText(LAWYER_REVIEWS_KEY_POINTS_PROMPT, keyPointsUser, settings);

  const feedbackUser = `Key points to cover (and optional model answer) — use these to assess the trainee's answer. Do not repeat these in your output.\n${keyPointsRaw}\n\n---\nTrainee's answer:\n---\n${answer}\n\nOutput Key issues (bullets) and Revised version (with ~~removed~~ and **added**).`;
  const feedbackRaw = await chatForText(LAWYER_REVIEWS_FEEDBACK_PROMPT, feedbackUser, settings);

  const keyIssuesBlock = feedbackRaw.includes("## Key issues")
    ? feedbackRaw.split("## Key issues")[1]?.split("## Revised version")[0]?.trim() ?? ""
    : "";
  const revisedBlock = feedbackRaw.includes("## Revised version")
    ? feedbackRaw.split("## Revised version")[1]?.trim() ?? ""
    : feedbackRaw;

  const keyIssuesCallout = keyIssuesBlock
    ? "> [!danger]- Key issues\n>\n" + keyIssuesBlock.split("\n").map((l) => "> " + l).join("\n") + "\n\n"
    : "";
  const revisedCallout = revisedBlock
    ? "> [!tip]- Revised version\n>\n" + revisedBlock.split("\n").map((l) => "> " + l).join("\n") + "\n"
    : "";

  return "\n\n" + LAWYER_REVIEWS_MARKER + "\n\n" + keyIssuesCallout + revisedCallout + "\n";
}
