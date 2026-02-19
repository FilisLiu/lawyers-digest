import { describe, it, expect } from "vitest";
import { slugify, wikiLink, conceptLinks, buildDigestMarkdown, buildNarrativeDigestMarkdown } from "./digest";
import type { ArticleExtraction } from "./ontology";

describe("digest utilities", () => {
  describe("slugify", () => {
    it("should create a readable slug from headline", () => {
      expect(slugify("UK Companies Act Reform")).toBe("UK-Companies-Act-Reform");
    });

    it("should handle special characters", () => {
      expect(slugify("Company's £1bn Deal")).toBe("Companys-1bn-Deal");
    });

    it("should include date prefix when provided", () => {
      expect(slugify("Test Article", "2024-01-15")).toBe("20240115-Test-Article");
    });

    it("should truncate long headlines", () => {
      const longHeadline = "A".repeat(100);
      const slug = slugify(longHeadline);
      expect(slug.length).toBeLessThanOrEqual(68); // date prefix (8) + dash (1) + 60 chars max
    });

    it("should handle empty headline", () => {
      expect(slugify("")).toBe("untitled");
    });

    it("should handle headline with only special characters", () => {
      expect(slugify("!!!")).toBe("untitled");
    });

    it("should normalize whitespace", () => {
      expect(slugify("  Multiple   Spaces  ")).toBe("Multiple-Spaces");
    });

    it("should handle date-only slug", () => {
      expect(slugify("", "2024-01-15")).toBe("20240115-untitled");
    });
  });

  describe("wikiLink", () => {
    it("should create correct wiki link format", () => {
      expect(wikiLink("act", "Companies Act 2006")).toBe("[[Act - Companies Act 2006]]");
    });

    it("should handle different entity types", () => {
      expect(wikiLink("party", "BP")).toBe("[[Party - BP]]");
      expect(wikiLink("sector", "Financial Services")).toBe("[[Sector - Financial Services]]");
    });
  });

  describe("conceptLinks", () => {
    it("should extract all concept links from entities", () => {
      const extraction: ArticleExtraction = {
        headline: "Test",
        summary: "Test summary",
        keyPoints: [],
        entities: {
          sectors: ["Financial Services"],
          jurisdictions: ["UK"],
          acts: ["Companies Act 2006"],
          authorities: [],
          parties: ["BP"],
          themes: [],
          issues: [],
        },
      };
      const links = conceptLinks(extraction.entities);
      expect(links).toContain("[[Sector - Financial Services]]");
      expect(links).toContain("[[Jurisdiction - UK]]");
      expect(links).toContain("[[Act - Companies Act 2006]]");
      expect(links).toContain("[[Party - BP]]");
    });

    it("should deduplicate entities", () => {
      const extraction: ArticleExtraction = {
        headline: "Test",
        summary: "Test",
        keyPoints: [],
        entities: {
          sectors: ["Financial Services", "Financial Services"],
          jurisdictions: [],
          acts: [],
          authorities: [],
          parties: [],
          themes: [],
          issues: [],
        },
      };
      const links = conceptLinks(extraction.entities);
      expect(links.filter((l) => l === "[[Sector - Financial Services]]").length).toBe(1);
    });

    it("should filter out empty strings", () => {
      const extraction: ArticleExtraction = {
        headline: "Test",
        summary: "Test",
        keyPoints: [],
        entities: {
          sectors: ["", "Valid Sector", "   "],
          jurisdictions: [],
          acts: [],
          authorities: [],
          parties: [],
          themes: [],
          issues: [],
        },
      };
      const links = conceptLinks(extraction.entities);
      expect(links).toEqual(["[[Sector - Valid Sector]]"]);
    });

    it("should handle empty entities", () => {
      const extraction: ArticleExtraction = {
        headline: "Test",
        summary: "Test",
        keyPoints: [],
        entities: {
          sectors: [],
          jurisdictions: [],
          acts: [],
          authorities: [],
          parties: [],
          themes: [],
          issues: [],
        },
      };
      expect(conceptLinks(extraction.entities)).toEqual([]);
    });
  });

  describe("buildDigestMarkdown", () => {
    it("should build correct markdown structure", () => {
      const extraction: ArticleExtraction = {
        headline: "Test Article",
        summary: "This is a test summary.",
        keyPoints: ["Point 1", "Point 2"],
        publishedDate: "2024-01-15",
        entities: {
          sectors: ["Tech"],
          jurisdictions: [],
          acts: [],
          authorities: [],
          parties: [],
          themes: [],
          issues: [],
        },
      };
      const markdown = buildDigestMarkdown(extraction, "https://example.com");
      expect(markdown).toContain("type: article");
      expect(markdown).toContain("date: 2024-01-15");
      expect(markdown).toContain("url: https://example.com");
      expect(markdown).toContain("# Test Article");
      expect(markdown).toContain("## Summary");
      expect(markdown).toContain("This is a test summary.");
      expect(markdown).toContain("## Key points");
      expect(markdown).toContain("- Point 1");
      expect(markdown).toContain("- Point 2");
      expect(markdown).toContain("## Concepts");
    });

    it("should use current date when publishedDate is missing", () => {
      const extraction: ArticleExtraction = {
        headline: "Test",
        summary: "Test",
        keyPoints: [],
        entities: {
          sectors: [],
          jurisdictions: [],
          acts: [],
          authorities: [],
          parties: [],
          themes: [],
          issues: [],
        },
      };
      const markdown = buildDigestMarkdown(extraction);
      expect(markdown).toMatch(/date: \d{4}-\d{2}-\d{2}/);
    });

    it("should handle missing source URL", () => {
      const extraction: ArticleExtraction = {
        headline: "Test",
        summary: "Test",
        keyPoints: [],
        entities: {
          sectors: [],
          jurisdictions: [],
          acts: [],
          authorities: [],
          parties: [],
          themes: [],
          issues: [],
        },
      };
      const markdown = buildDigestMarkdown(extraction);
      expect(markdown).not.toContain("url:");
    });

    it("should show message when no concepts", () => {
      const extraction: ArticleExtraction = {
        headline: "Test",
        summary: "Test",
        keyPoints: [],
        entities: {
          sectors: [],
          jurisdictions: [],
          acts: [],
          authorities: [],
          parties: [],
          themes: [],
          issues: [],
        },
      };
      const markdown = buildDigestMarkdown(extraction);
      expect(markdown).toContain("*No concepts extracted.*");
    });
  });

  describe("buildNarrativeDigestMarkdown", () => {
    it("should build narrative digest with embedded links", () => {
      const markdown = buildNarrativeDigestMarkdown(
        "Test Article",
        "2024-01-15",
        "This is a narrative with [[Act - Companies Act 2006]] mentioned.",
        ["Act - Companies Act 2006", "Party - BP"],
        "https://example.com"
      );
      expect(markdown).toContain("type: article");
      expect(markdown).toContain("date: 2024-01-15");
      expect(markdown).toContain("url: https://example.com");
      expect(markdown).toContain("# Test Article");
      expect(markdown).toContain("This is a narrative");
      expect(markdown).toContain("## Concepts");
      expect(markdown).toContain("[[Act - Companies Act 2006]]");
      expect(markdown).toContain("[[Party - BP]]");
    });

    it("should handle empty concept list", () => {
      const markdown = buildNarrativeDigestMarkdown("Test", "2024-01-15", "Narrative", [], undefined);
      expect(markdown).not.toContain("## Concepts");
    });

    it("should use current date when publishedDate is missing", () => {
      const markdown = buildNarrativeDigestMarkdown("Test", undefined, "Narrative", [], undefined);
      expect(markdown).toMatch(/date: \d{4}-\d{2}-\d{2}/);
    });
  });
});
