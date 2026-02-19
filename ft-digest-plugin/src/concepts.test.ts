import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseConceptNoteName, resolveConcept, stubNoteContent, conceptNotePath, referenceNoteContent, referenceNotePath } from "./concepts";
import type { App } from "obsidian";

describe("concepts utilities", () => {
  describe("parseConceptNoteName", () => {
    it("should parse valid concept note name", () => {
      const result = parseConceptNoteName("Act - Companies Act 2006");
      expect(result).toEqual({ type: "act", name: "Companies Act 2006" });
    });

    it("should handle different entity types", () => {
      expect(parseConceptNoteName("Party - BP")).toEqual({ type: "party", name: "BP" });
      expect(parseConceptNoteName("Sector - Financial Services")).toEqual({ type: "sector", name: "Financial Services" });
      expect(parseConceptNoteName("Jurisdiction - UK")).toEqual({ type: "jurisdiction", name: "UK" });
      expect(parseConceptNoteName("Authority - FCA")).toEqual({ type: "authority", name: "FCA" });
      expect(parseConceptNoteName("Theme - FDI screening")).toEqual({ type: "theme", name: "FDI screening" });
      expect(parseConceptNoteName("Issue - Merger clearance")).toEqual({ type: "issue", name: "Merger clearance" });
    });

    it("should handle whitespace", () => {
      expect(parseConceptNoteName("  Act - Companies Act 2006  ")).toEqual({ type: "act", name: "Companies Act 2006" });
    });

    it("should return null for invalid format", () => {
      expect(parseConceptNoteName("Invalid Format")).toBeNull();
      expect(parseConceptNoteName("Act-NoSpace")).toBeNull();
      expect(parseConceptNoteName("")).toBeNull();
    });

    it("should return null when name is empty after prefix", () => {
      expect(parseConceptNoteName("Act - ")).toBeNull();
      expect(parseConceptNoteName("Act -   ")).toBeNull();
    });
  });

  describe("stubNoteContent", () => {
    it("should create stub content without description", () => {
      const content = stubNoteContent("act", "Companies Act 2006");
      expect(content).toContain("type: act");
      expect(content).toContain("aliases: [Companies Act 2006]");
      expect(content).toContain("# Act: Companies Act 2006");
      expect(content).toContain("## Summary");
      expect(content).toContain("*Add a short description");
    });

    it("should include description when provided", () => {
      const description = "UK company law legislation";
      const content = stubNoteContent("party", "BP", description);
      expect(content).toContain(description);
      expect(content).not.toContain("*Add a short description");
    });

    it("should handle empty description", () => {
      const content = stubNoteContent("act", "Test Act", "");
      expect(content).toContain("*Add a short description");
    });

    it("should trim description whitespace", () => {
      const content = stubNoteContent("act", "Test", "  Description  ");
      expect(content).toContain("Description");
      expect(content).not.toContain("  Description  ");
    });
  });

  describe("conceptNotePath", () => {
    it("should create path without subfolders", () => {
      expect(conceptNotePath("Act - Test", "act", "Concepts", false)).toBe("Concepts/Act - Test.md");
    });

    it("should create path with subfolders", () => {
      expect(conceptNotePath("Act - Test", "act", "Concepts", true)).toBe("Concepts/Acts/Act - Test.md");
      expect(conceptNotePath("Party - BP", "party", "Concepts", true)).toBe("Concepts/Parties/Party - BP.md");
      expect(conceptNotePath("Theme - FDI", "theme", "Concepts", true)).toBe("Concepts/Themes/Theme - FDI.md");
      expect(conceptNotePath("Sector - Tech", "sector", "Concepts", true)).toBe("Concepts/Sectors/Sector - Tech.md");
      expect(conceptNotePath("Jurisdiction - UK", "jurisdiction", "Concepts", true)).toBe("Concepts/Jurisdictions/Jurisdiction - UK.md");
      expect(conceptNotePath("Authority - FCA", "authority", "Concepts", true)).toBe("Concepts/Authorities/Authority - FCA.md");
      expect(conceptNotePath("Issue - Test", "issue", "Concepts", true)).toBe("Concepts/Issues/Issue - Test.md");
    });

    it("should handle folder without trailing slash", () => {
      expect(conceptNotePath("Act - Test", "act", "Concepts/", false)).toBe("Concepts/Act - Test.md");
    });

    it("should handle empty folder", () => {
      expect(conceptNotePath("Act - Test", "act", "", false)).toBe("Act - Test.md");
    });
  });

  describe("referenceNoteContent", () => {
    it("should create reference note content", () => {
      const content = referenceNoteContent("Merger-Standard Life & Aberdeen 2020", "Context here", "https://example.com");
      expect(content).toContain("type: reference");
      expect(content).toContain("# Merger-Standard Life & Aberdeen 2020");
      expect(content).toContain("## Summary");
      expect(content).toContain("Context here");
      expect(content).toContain("## Source");
      expect(content).toContain("https://example.com");
    });

    it("should handle empty source", () => {
      const content = referenceNoteContent("Test", "Context", "");
      expect(content).toContain("*No source provided.*");
    });

    it("should trim context and source", () => {
      const content = referenceNoteContent("Test", "  Context  ", "  Source  ");
      expect(content).toContain("Context");
      expect(content).toContain("Source");
      expect(content).not.toContain("  Context  ");
    });
  });

  describe("referenceNotePath", () => {
    it("should create correct reference path", () => {
      expect(referenceNotePath("Merger-Test", "Concepts")).toBe("Concepts/References/Merger-Test.md");
    });

    it("should handle folder with trailing slash", () => {
      expect(referenceNotePath("Test", "Concepts/")).toBe("Concepts/References/Test.md");
    });
  });

  describe("resolveConcept", () => {
    let mockApp: App;
    let mockFiles: Array<{ basename: string; path: string }>;
    let mockMetadataCache: Map<string, { frontmatter?: { aliases?: string | string[] } }>;

    beforeEach(() => {
      mockFiles = [];
      mockMetadataCache = new Map();
      mockApp = {
        vault: {
          getMarkdownFiles: vi.fn(() => mockFiles as any),
        },
        metadataCache: {
          getFileCache: vi.fn((file: any) => mockMetadataCache.get(file.path)),
        },
      } as any;
    });

    it("should return canonical name when no existing note found", () => {
      const result = resolveConcept(mockApp, "act", "Companies Act 2006", "Concepts");
      expect(result).toEqual({
        noteName: "Act - Companies Act 2006",
        type: "act",
        createdStub: true,
      });
    });

    it("should find existing note by canonical name", () => {
      mockFiles.push({ basename: "Act - Companies Act 2006", path: "Concepts/Act - Companies Act 2006.md" });
      const result = resolveConcept(mockApp, "act", "Companies Act 2006", "Concepts");
      expect(result.createdStub).toBe(false);
      expect(result.noteName).toBe("Act - Companies Act 2006");
    });

    it("should find existing note by alias", () => {
      mockFiles.push({ basename: "Companies Act", path: "Concepts/Companies Act.md" });
      mockMetadataCache.set("Concepts/Companies Act.md", {
        frontmatter: { aliases: ["Companies Act 2006"] },
      });
      const result = resolveConcept(mockApp, "act", "Companies Act 2006", "Concepts");
      expect(result.createdStub).toBe(false);
      expect(result.noteName).toBe("Companies Act");
    });

    it("should handle multiple aliases", () => {
      mockFiles.push({ basename: "Test Act", path: "Concepts/Test Act.md" });
      mockMetadataCache.set("Concepts/Test Act.md", {
        frontmatter: { aliases: ["Alias 1", "Companies Act 2006", "Alias 2"] },
      });
      const result = resolveConcept(mockApp, "act", "Companies Act 2006", "Concepts");
      expect(result.createdStub).toBe(false);
    });

    it("should normalize for matching (case insensitive)", () => {
      mockFiles.push({ basename: "ACT - COMPANIES ACT 2006", path: "Concepts/ACT - COMPANIES ACT 2006.md" });
      const result = resolveConcept(mockApp, "act", "companies act 2006", "Concepts");
      expect(result.createdStub).toBe(false);
    });

    it("should only search within concept folder", () => {
      mockFiles.push(
        { basename: "Act - Test", path: "Concepts/Act - Test.md" },
        { basename: "Act - Test", path: "Other/Act - Test.md" }
      );
      const result = resolveConcept(mockApp, "act", "Test", "Concepts");
      expect(result.createdStub).toBe(false);
      expect(result.noteName).toBe("Act - Test");
    });

    it("should handle empty concept folder", () => {
      mockFiles.push({ basename: "Act - Test", path: "Act - Test.md" });
      const result = resolveConcept(mockApp, "act", "Test", "");
      expect(result.createdStub).toBe(false);
    });
  });
});
