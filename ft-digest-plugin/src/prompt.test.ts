import { describe, it, expect } from "vitest";
import { parseExtractionResponse, parseConceptDescriptionsResponse } from "./prompt";

describe("prompt parsing", () => {
  describe("parseExtractionResponse", () => {
    it("should parse valid JSON extraction", () => {
      const json = `{
        "headline": "Test Article",
        "summary": "Test summary",
        "keyPoints": ["Point 1", "Point 2"],
        "publishedDate": "2024-01-15",
        "entities": {
          "sectors": ["Tech"],
          "jurisdictions": ["UK"],
          "acts": ["Companies Act 2006"],
          "authorities": [],
          "parties": ["BP"],
          "themes": [],
          "issues": []
        }
      }`;
      const result = parseExtractionResponse(json);
      expect(result).not.toBeNull();
      expect(result?.headline).toBe("Test Article");
      expect(result?.summary).toBe("Test summary");
      expect(result?.keyPoints).toEqual(["Point 1", "Point 2"]);
      expect(result?.publishedDate).toBe("2024-01-15");
      expect(result?.entities.sectors).toEqual(["Tech"]);
      expect(result?.entities.parties).toEqual(["BP"]);
    });

    it("should parse JSON wrapped in code fences", () => {
      const json = "```json\n" + JSON.stringify({
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
      }) + "\n```";
      const result = parseExtractionResponse(json);
      expect(result).not.toBeNull();
      expect(result?.headline).toBe("Test");
    });

    it("should handle missing publishedDate", () => {
      const json = JSON.stringify({
        headline: "Test",
        summary: "Test",
        keyPoints: [],
        publishedDate: null,
        entities: {
          sectors: [],
          jurisdictions: [],
          acts: [],
          authorities: [],
          parties: [],
          themes: [],
          issues: [],
        },
      });
      const result = parseExtractionResponse(json);
      expect(result?.publishedDate).toBeUndefined();
    });

    it("should filter out empty entity values", () => {
      const json = JSON.stringify({
        headline: "Test",
        summary: "Test",
        keyPoints: [],
        entities: {
          sectors: ["", "Valid", "   "],
          jurisdictions: [],
          acts: [],
          authorities: [],
          parties: [],
          themes: [],
          issues: [],
        },
      });
      const result = parseExtractionResponse(json);
      expect(result?.entities.sectors).toEqual(["Valid"]);
    });

    it("should handle non-array entity values", () => {
      const json = JSON.stringify({
        headline: "Test",
        summary: "Test",
        keyPoints: [],
        entities: {
          sectors: "not an array",
          jurisdictions: [],
          acts: [],
          authorities: [],
          parties: [],
          themes: [],
          issues: [],
        },
      });
      const result = parseExtractionResponse(json);
      expect(result?.entities.sectors).toEqual([]);
    });

    it("should handle non-string entity values", () => {
      const json = JSON.stringify({
        headline: "Test",
        summary: "Test",
        keyPoints: [],
        entities: {
          sectors: [123, "Valid", null],
          jurisdictions: [],
          acts: [],
          authorities: [],
          parties: [],
          themes: [],
          issues: [],
        },
      });
      const result = parseExtractionResponse(json);
      expect(result?.entities.sectors).toEqual(["Valid"]);
    });

    it("should return null for invalid JSON", () => {
      expect(parseExtractionResponse("not json")).toBeNull();
      expect(parseExtractionResponse("{ invalid }")).toBeNull();
    });

    it("should return null for missing required fields", () => {
      const json = JSON.stringify({
        summary: "Test",
        keyPoints: [],
        entities: {},
      });
      expect(parseExtractionResponse(json)).toBeNull();
    });

    it("should handle empty keyPoints", () => {
      const json = JSON.stringify({
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
      });
      const result = parseExtractionResponse(json);
      expect(result?.keyPoints).toEqual([]);
    });

    it("should handle non-array keyPoints", () => {
      const json = JSON.stringify({
        headline: "Test",
        summary: "Test",
        keyPoints: "not an array",
        entities: {
          sectors: [],
          jurisdictions: [],
          acts: [],
          authorities: [],
          parties: [],
          themes: [],
          issues: [],
        },
      });
      const result = parseExtractionResponse(json);
      expect(result?.keyPoints).toEqual([]);
    });

    it("should trim string values", () => {
      const json = JSON.stringify({
        headline: "  Test  ",
        summary: "  Summary  ",
        keyPoints: ["  Point  "],
        entities: {
          sectors: ["  Tech  "],
          jurisdictions: [],
          acts: [],
          authorities: [],
          parties: [],
          themes: [],
          issues: [],
        },
      });
      const result = parseExtractionResponse(json);
      expect(result?.headline).toBe("Test");
      expect(result?.summary).toBe("Summary");
      expect(result?.keyPoints).toEqual(["Point"]);
      expect(result?.entities.sectors).toEqual(["Tech"]);
    });
  });

  describe("parseConceptDescriptionsResponse", () => {
    it("should parse valid concept descriptions JSON", () => {
      const json = JSON.stringify({
        "Act - Companies Act 2006": "UK company law legislation",
        "Party - BP": "Energy company",
      });
      const result = parseConceptDescriptionsResponse(json);
      expect(result).toEqual({
        "Act - Companies Act 2006": "UK company law legislation",
        "Party - BP": "Energy company",
      });
    });

    it("should parse JSON wrapped in code fences", () => {
      const json = "```json\n" + JSON.stringify({
        "Act - Test": "Description",
      }) + "\n```";
      const result = parseConceptDescriptionsResponse(json);
      expect(result).toEqual({
        "Act - Test": "Description",
      });
    });

    it("should filter out non-string values", () => {
      const json = JSON.stringify({
        "Act - Test": "Valid",
        "Party - Test": 123,
        "Sector - Test": null,
        "Theme - Test": "Also valid",
      });
      const result = parseConceptDescriptionsResponse(json);
      expect(result).toEqual({
        "Act - Test": "Valid",
        "Theme - Test": "Also valid",
      });
    });

    it("should filter out empty descriptions", () => {
      const json = JSON.stringify({
        "Act - Test": "Valid",
        "Party - Test": "",
        "Sector - Test": "   ",
      });
      const result = parseConceptDescriptionsResponse(json);
      expect(result).toEqual({
        "Act - Test": "Valid",
      });
    });

    it("should trim description values", () => {
      const json = JSON.stringify({
        "Act - Test": "  Description  ",
      });
      const result = parseConceptDescriptionsResponse(json);
      expect(result).toEqual({
        "Act - Test": "Description",
      });
    });

    it("should return null for invalid JSON", () => {
      expect(parseConceptDescriptionsResponse("not json")).toBeNull();
      expect(parseConceptDescriptionsResponse("{ invalid }")).toBeNull();
    });

    it("should return null for non-object JSON", () => {
      expect(parseConceptDescriptionsResponse('"string"')).toBeNull();
      expect(parseConceptDescriptionsResponse("[]")).toBeNull();
      expect(parseConceptDescriptionsResponse("123")).toBeNull();
    });

    it("should handle empty object", () => {
      const result = parseConceptDescriptionsResponse("{}");
      expect(result).toEqual({});
    });
  });
});
