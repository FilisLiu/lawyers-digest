# Testing Guide

This project uses [Vitest](https://vitest.dev/) for unit testing. The test suite ensures code quality, safety, and correctness.

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Coverage

The test suite covers:

### ✅ Core Utilities (`digest.test.ts`)
- Slug generation (`slugify`)
- Wiki link formatting
- Concept link extraction
- Markdown digest building
- Edge cases and error handling

### ✅ Concept Management (`concepts.test.ts`)
- Concept note name parsing
- Concept resolution and matching
- Stub note content generation
- Path building with subfolders
- Reference note handling
- Normalization and deduplication

### ✅ LLM Integration (`llm.test.ts`)
- API error handling (401, 429, etc.)
- Empty response handling
- URL construction
- API key handling
- Provider-specific logic (OpenAI vs Gemini)

### ✅ Parsing Functions (`prompt.test.ts`)
- JSON extraction parsing
- Concept descriptions parsing
- Code fence handling
- Malformed JSON handling
- Data validation and sanitization

### ✅ Pipeline Logic (`pipeline.test.ts`)
- Entity extraction formatting
- Concept note name generation
- Empty entity handling
- Type mapping

### ✅ Lawyer Commands (`lawyerCommands.test.ts`)
- Trainee answer extraction
- Callout formatting removal
- Section boundary detection
- Length limiting

### ✅ Security (`modal.test.ts`)
- URL validation (http/https only)
- HTML sanitization
- DoS prevention (size limits)
- XSS prevention
- Input validation

## Test Structure

Tests are organized by module, mirroring the source code structure:
- Each `.ts` file has a corresponding `.test.ts` file
- Tests use descriptive names following the pattern: `should [expected behavior]`
- Edge cases and error conditions are explicitly tested

## Writing New Tests

When adding new functionality:

1. **Add tests for new functions** - Every exported function should have tests
2. **Test edge cases** - Empty inputs, null values, malformed data
3. **Test error handling** - Ensure errors are caught and handled gracefully
4. **Test security** - Input validation, sanitization, size limits

Example test structure:

```typescript
import { describe, it, expect } from "vitest";
import { myFunction } from "./myModule";

describe("myModule", () => {
  describe("myFunction", () => {
    it("should handle normal input", () => {
      expect(myFunction("input")).toBe("expected");
    });

    it("should handle edge cases", () => {
      expect(myFunction("")).toBe("default");
    });

    it("should reject invalid input", () => {
      expect(() => myFunction(null)).toThrow();
    });
  });
});
```

## Coverage Goals

- **Minimum coverage**: 80% for all modules
- **Critical paths**: 100% coverage (parsing, validation, security)
- **UI components**: Excluded (require Obsidian runtime)

## Continuous Integration

Tests run automatically on:
- Pre-commit hooks (recommended)
- Pull requests
- Before releases

## Mocking

The test suite includes mocks for:
- **Obsidian API** (`src/__mocks__/obsidian.ts`) - Mock Obsidian classes
- **DOM APIs** - Mock `document.createElement` for HTML parsing tests
- **Fetch API** - Mock HTTP requests for LLM integration tests

## Known Limitations

- **Obsidian Plugin Runtime**: Main plugin class (`main.ts`) and UI components (`settings.ts`, `modal.ts`) are excluded from coverage as they require the full Obsidian runtime
- **Integration Tests**: Current tests are unit tests. Full integration tests would require an Obsidian test environment

## Troubleshooting

**Tests fail with "document is not defined"**
- Ensure DOM mocks are properly set up in the test file
- Check that `global.document` is mocked before importing modules that use it

**Tests fail with "obsidian module not found"**
- Verify `vitest.config.ts` has the correct alias configuration
- Check that `src/__mocks__/obsidian.ts` exists

**Coverage is lower than expected**
- Check `vitest.config.ts` exclude patterns
- Ensure all test files are in the correct location
- Verify tests are actually running (check test output)
