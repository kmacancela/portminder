import { describe, expect, it } from "vitest";
import { classifyProcess } from "../../src/core/classify.js";
import { DEFAULT_CONFIG } from "../../src/core/config.js";
import { createDetectedPort } from "../../src/core/detectedPort.js";

describe("classifyProcess", () => {
  it("classifies Next.js as a frontend dev server", () => {
    const result = classifyProcess(
      createDetectedPort({ port: 3000, processName: "node", command: "next dev" }),
      DEFAULT_CONFIG,
    );

    expect(result).toMatchObject({ type: "frontend-dev-server", framework: "Next.js" });
  });

  it("classifies Uvicorn as a backend dev server", () => {
    const result = classifyProcess(
      createDetectedPort({
        port: 8000,
        processName: "python",
        command: "uvicorn app:app --reload",
      }),
      DEFAULT_CONFIG,
    );

    expect(result).toMatchObject({ type: "backend-dev-server", framework: "Uvicorn/FastAPI" });
  });

  it("classifies Postgres as protected database", () => {
    const result = classifyProcess(
      createDetectedPort({ port: 5432, processName: "postgres", command: "postgres -D data" }),
      DEFAULT_CONFIG,
    );

    expect(result).toMatchObject({ type: "database", framework: "Postgres" });
  });
});
