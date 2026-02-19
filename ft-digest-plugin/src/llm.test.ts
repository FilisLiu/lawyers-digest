import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { LLMSettings } from "./llm";

// Mock fetch globally
global.fetch = vi.fn();

describe("LLM error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("API error responses", () => {
    it("should handle 401 unauthorized errors", async () => {
      const { chatForText } = await import("./llm");
      const settings: LLMSettings = {
        provider: "openai",
        apiUrl: "https://api.openai.com/v1/chat/completions",
        apiKey: "invalid-key",
        model: "gpt-4o-mini",
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => "Unauthorized",
      });

      await expect(chatForText("system", "user", settings)).rejects.toThrow(/401/);
    });

    it("should handle 429 rate limit errors", async () => {
      const { chatForText } = await import("./llm");
      const settings: LLMSettings = {
        provider: "openai",
        apiUrl: "https://api.openai.com/v1/chat/completions",
        apiKey: "test-key",
        model: "gpt-4o-mini",
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => "Rate limit exceeded",
      });

      await expect(chatForText("system", "user", settings)).rejects.toThrow(/429/);
    });

    it("should handle empty response content", async () => {
      const { chatForText } = await import("./llm");
      const settings: LLMSettings = {
        provider: "openai",
        apiUrl: "https://api.openai.com/v1/chat/completions",
        apiKey: "test-key",
        model: "gpt-4o-mini",
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: {} }] }),
      });

      await expect(chatForText("system", "user", settings)).rejects.toThrow(/no content/i);
    });

    it("should handle missing choices array", async () => {
      const { chatForText } = await import("./llm");
      const settings: LLMSettings = {
        provider: "openai",
        apiUrl: "https://api.openai.com/v1/chat/completions",
        apiKey: "test-key",
        model: "gpt-4o-mini",
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await expect(chatForText("system", "user", settings)).rejects.toThrow(/no content/i);
    });
  });

  describe("Gemini API error handling", () => {
    it("should handle Gemini error messages", async () => {
      const { chatForText } = await import("./llm");
      const settings: LLMSettings = {
        provider: "gemini",
        apiUrl: "",
        apiKey: "test-key",
        model: "gemini-2.0-flash",
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          error: { message: "API key invalid" },
        }),
      });

      await expect(chatForText("system", "user", settings)).rejects.toThrow(/API key invalid/);
    });

    it("should handle Gemini empty candidates", async () => {
      const { chatForText } = await import("./llm");
      const settings: LLMSettings = {
        provider: "gemini",
        apiUrl: "",
        apiKey: "test-key",
        model: "gemini-2.0-flash",
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [],
        }),
      });

      await expect(chatForText("system", "user", settings)).rejects.toThrow(/no content/i);
    });
  });

  describe("URL construction", () => {
    it("should use default OpenAI URL when not provided", async () => {
      const { extractWithLLM } = await import("./llm");
      const settings: LLMSettings = {
        provider: "openai",
        apiUrl: "",
        apiKey: "test-key",
        model: "gpt-4o-mini",
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({ headline: "Test", summary: "Test", keyPoints: [], entities: {} }) } }],
        }),
      });

      await extractWithLLM("test article", settings);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.openai.com/v1/chat/completions",
        expect.any(Object)
      );
    });

    it("should use custom API URL when provided", async () => {
      const { extractWithLLM } = await import("./llm");
      const settings: LLMSettings = {
        provider: "openai",
        apiUrl: "https://custom-api.com/v1/chat/completions",
        apiKey: "test-key",
        model: "gpt-4o-mini",
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({ headline: "Test", summary: "Test", keyPoints: [], entities: {} }) } }],
        }),
      });

      await extractWithLLM("test article", settings);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://custom-api.com/v1/chat/completions",
        expect.any(Object)
      );
    });
  });

  describe("API key handling", () => {
    it("should include Authorization header when API key is provided", async () => {
      const { extractWithLLM } = await import("./llm");
      const settings: LLMSettings = {
        provider: "openai",
        apiUrl: "",
        apiKey: "sk-test123",
        model: "gpt-4o-mini",
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({ headline: "Test", summary: "Test", keyPoints: [], entities: {} }) } }],
        }),
      });

      await extractWithLLM("test article", settings);
      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[1].headers.Authorization).toBe("Bearer sk-test123");
    });

    it("should handle empty API key gracefully", async () => {
      const { extractWithLLM } = await import("./llm");
      const settings: LLMSettings = {
        provider: "openai",
        apiUrl: "",
        apiKey: "",
        model: "gpt-4o-mini",
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({ headline: "Test", summary: "Test", keyPoints: [], entities: {} }) } }],
        }),
      });

      await extractWithLLM("test article", settings);
      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[1].headers.Authorization).toBeUndefined();
    });
  });
});
