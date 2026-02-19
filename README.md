# FT Digest – Obsidian Plugin

Process Financial Times (or similar commercial news) articles into structured digests and a **concept graph** (Acts, parties, themes, sectors, jurisdictions). Build commercial awareness with solicitor-style perspectives, trainee tasks, and feedback.

## ⚠️ Legal & Compliance Notice

**FT API Usage**: The "FT Sync" feature requires a valid Financial Times Developer API key with a **Datamining Licence**. Users are responsible for:
- Obtaining proper API access from FT (see [FT Developer Portal](https://developer.ft.com/))
- Complying with FT's Terms of Service and API usage policies
- Respecting copyright and attribution requirements for FT content

**Content Attribution**: When using FT articles, ensure proper attribution. The plugin stores source URLs in frontmatter for reference.

**Disclaimer**: This plugin is an independent tool and is not affiliated with or endorsed by the Financial Times. Users are responsible for ensuring their use complies with all applicable laws and terms of service.

## Features

**Note-first workflow (create note, paste article, then run commands):**
- **Lawyer says**: Reads the note and adds (1) up to three lawyer's perspectives with sub-bullets; specific events/cases/mergers become links in the form `[[Merger-Standard Life & Aberdeen 2020]]`, `[[Case-Uber v Aslam 2021]]`, etc. (2) A **References** section with context and source for each link. The plugin creates a stub note for each reference (under `ft-digest/Concepts/References/`) with a short summary and source. (3) One trainee task and a "Your answer" callout.
- **Lawyer reviews** (two-step, to avoid bias): First, a "key points to cover" (and optional model answer) is generated from the task and article only. Then your answer is reviewed against that: you get **Key issues** (succinct bullets in a danger-style callout) and a **Revised version** (your text with ~~strikethrough~~ for removed bits and **bold** for suggested additions).

**Digest pipeline (concept linking—unchanged):**
- **Process FT article**: Paste URL or full text → narrative digest + concept links and stubs.
- **Refresh links for this note**: Re-runs the pipeline on the current note.
- **FT Sync** (optional): Fetches new articles via FT API and runs the same pipeline.

All plugin output (Digests, Concepts) lives under a single **base folder** (default: `ft-digest/`).

## Installation

1. Copy the plugin folder (or clone this repo) into your vault's `.obsidian/plugins/ft-digest/` folder, so that `main.js`, `manifest.json`, and `styles.css` are inside `ft-digest/`.
2. Run `npm run build` in the plugin directory to produce `main.js` if you're building from source.
3. In Obsidian: Settings → Community plugins → enable **FT Digest**.

## Setup

1. **Settings → FT Digest**
   - **Base folder**: All output lives here (default: `ft-digest` → `ft-digest/Digests`, `ft-digest/Concepts`). Override Digest/Concept folders if needed.
   - **LLM**: Provider (OpenAI or Gemini), API key, model. Required for Lawyer says, Lawyer reviews, and Process FT article.
   - **FT API key** (optional): For "FT Sync (fetch new articles)". **Requires FT Developer API access with Datamining Licence** - see [Legal Notice](#-legal--compliance-notice) above.

2. **API Keys & Security**
   - API keys are stored securely in Obsidian's plugin settings (encrypted at rest)
   - Never share your API keys or commit them to version control
   - Use environment variables or secure credential management for development

2. **Suggested workflow**
   - Create a new note and paste the article (or use **Process FT article** with URL/paste to generate a digest).
   - Run **Lawyer says** (command palette) → perspectives and trainee task are inserted; type your answer in the "Your answer" callout.
   - Run **Lawyer reviews** → feedback is appended (or the existing review section is replaced).

## Epistemological framework

Entities extracted align with how commercial lawyers read FT:

- **Sector**, **Jurisdiction**, **Act/Regulation**, **Authority**, **Party**, **Theme**, **Issue**

Digest notes link to concept notes via wiki links (e.g. `[[Act - Companies Act 2006]]`). The Obsidian graph then shows how articles and concepts connect.

### What goes in each concept note

When the plugin creates a concept stub, it now asks the LLM for a short **Summary** per concept (type-aware):

- **Party**: Who they are (company/person/org), sector if relevant; relevance in the article.
- **Act**: What the legislation does, jurisdiction; relevance in this context.
- **Authority**: Who they are, what they regulate, jurisdiction.
- **Issue**: The legal/business question; why it matters.
- **Theme**: Short definition; why commercial lawyers care.
- **Sector**: One sentence defining the industry.
- **Jurisdiction**: One sentence (legal system / geography).

You can edit stubs to add more (e.g. **Case** notes could later be enriched with an agent-searched case summary and structurisation).

## Development

- `npm run dev` – watch build
- `npm run build` – production build
- `npm run lint` – run ESLint
- `npm run format` – format code with Prettier

Requires Node 18+ and npm.

## Troubleshooting

**"FT API key not set"**: Ensure you have a valid FT Developer API key with Datamining Licence. The FT Sync feature is optional - you can still use the plugin by pasting article text manually.

**"LLM API error"**: Check that your LLM API key is valid and you have sufficient credits/quota. For OpenAI, ensure you're using a valid model name (e.g., `gpt-4o-mini`). For Gemini, use models like `gemini-2.0-flash` or `gemini-1.5-flash`.

**"Pipeline failed"**: The LLM may have returned invalid JSON. Try again with a shorter article or check your API quota.

**"Could not fetch URL"**: The plugin attempts to fetch article text from URLs, but some sites may block automated requests. Paste the article text directly instead.
