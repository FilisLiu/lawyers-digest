import { describe, it, expect, vi, beforeEach } from "vitest";
import { conceptNoteNamesFromExtraction } from "./pipeline";
import type { ArticleExtraction } from "./ontology";

describe("pipeline utilities", () => {
  describe("conceptNoteNamesFromExtraction", () => {
    it("should format all entities as concept note names", () => {
      const extraction: ArticleExtraction = {
        headline: "Test",
        summary: "Test",
        keyPoints: [],
        entities: {
          sectors: ["Financial Services"],
          jurisdictions: ["UK"],
          acts: ["Companies Act 2006"],
          authorities: ["FCA"],
          parties: ["BP"],
          themes: ["FDI screening"],
          issues: ["Merger clearance"],
        },
      };
      const names = conceptNoteNamesFromExtraction(extraction);
      expect(names).toContain("Sector - Financial Services");
      expect(names).toContain("Jurisdiction - UK");
      expect(names).toContain("Act - Companies Act 2006");
      expect(names).toContain("Authority - FCA");
      expect(names).toContain("Party - BP");
      expect(names).toContain("Theme - FDI screening");
      expect(names).toContain("Issue - Merger clearance");
    });

    it("should filter out empty entity names", () => {
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
      const names = conceptNoteNamesFromExtraction(extraction);
      expect(names).toEqual(["Sector - Valid Sector"]);
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
      expect(conceptNoteNamesFromExtraction(extraction)).toEqual([]);
    });

    it("should handle non-array entity values", () => {
      const extraction: ArticleExtraction = {
        headline: "Test",
        summary: "Test",
        keyPoints: [],
        entities: {
          sectors: "not an array" as any,
          jurisdictions: [],
          acts: [],
          authorities: [],
          parties: [],
          themes: [],
          issues: [],
        },
      };
      const names = conceptNoteNamesFromExtraction(extraction);
      expect(names).toEqual([]);
    });

    it("should trim entity names", () => {
      const extraction: ArticleExtraction = {
        headline: "Test",
        summary: "Test",
        keyPoints: [],
        entities: {
          sectors: ["  Financial Services  "],
          jurisdictions: [],
          acts: [],
          authorities: [],
          parties: [],
          themes: [],
          issues: [],
        },
      };
      const names = conceptNoteNamesFromExtraction(extraction);
      expect(names).toEqual(["Sector - Financial Services"]);
    });

    it("should handle multiple entities of same type", () => {
      const extraction: ArticleExtraction = {
        headline: "Test",
        summary: "Test",
        keyPoints: [],
        entities: {
          sectors: ["Tech", "Finance", "Energy"],
          jurisdictions: [],
          acts: [],
          authorities: [],
          parties: [],
          themes: [],
          issues: [],
        },
      };
      const names = conceptNoteNamesFromExtraction(extraction);
      expect(names).toContain("Sector - Tech");
      expect(names).toContain("Sector - Finance");
      expect(names).toContain("Sector - Energy");
      expect(names.filter((n) => n.startsWith("Sector -")).length).toBe(3);
    });
  });
});
