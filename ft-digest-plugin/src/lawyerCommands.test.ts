import { describe, it, expect } from "vitest";
import { extractTraineeAnswer } from "./lawyerCommands";

describe("lawyerCommands utilities", () => {
  describe("extractTraineeAnswer", () => {
    it("should extract answer from callout", () => {
      const content = `# Article

## Lawyer says
Some content

## Trainee task
Do something

### Your answer
> [!todo]- Your answer
>
> This is my answer text`;

      const answer = extractTraineeAnswer(content);
      expect(answer).toContain("This is my answer text");
      expect(answer).not.toContain(">");
    });

    it("should extract answer from heading format", () => {
      const content = `# Article

### Your answer
This is my answer text`;

      const answer = extractTraineeAnswer(content);
      expect(answer).toContain("This is my answer text");
    });

    it("should stop at Lawyer reviews section", () => {
      const content = `# Article

### Your answer
> [!todo]- Your answer
>
> This is my answer

## Lawyer reviews
Review content`;

      const answer = extractTraineeAnswer(content);
      expect(answer).toContain("This is my answer");
      expect(answer).not.toContain("Review content");
    });

    it("should remove callout formatting", () => {
      const content = `### Your answer
> [!todo]- Your answer
>
> Line 1
> Line 2
> Line 3`;

      const answer = extractTraineeAnswer(content);
      expect(answer).toBe("Line 1\nLine 2\nLine 3");
    });

    it("should handle empty answer", () => {
      const content = `### Your answer
> [!todo]- Your answer
>
> `;

      const answer = extractTraineeAnswer(content);
      expect(answer.trim()).toBe("");
    });

    it("should return empty string when no answer found", () => {
      const content = `# Article
Some content`;
      expect(extractTraineeAnswer(content)).toBe("");
    });

    it("should limit answer length", () => {
      const longAnswer = "x".repeat(5000);
      const content = `### Your answer
> [!todo]- Your answer
>
> ${longAnswer}`;

      const answer = extractTraineeAnswer(content);
      expect(answer.length).toBeLessThanOrEqual(4000);
    });

    it("should handle multiline answer", () => {
      const content = `### Your answer
> [!todo]- Your answer
>
> First paragraph
>
> Second paragraph
>
> Third paragraph`;

      const answer = extractTraineeAnswer(content);
      expect(answer).toContain("First paragraph");
      expect(answer).toContain("Second paragraph");
      expect(answer).toContain("Third paragraph");
    });
  });
});
