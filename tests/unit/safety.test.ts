import { describe, expect, it } from "vitest";
import { classifyProcess } from "../../src/core/classify.js";
import { DEFAULT_CONFIG, normalizeConfig } from "../../src/core/config.js";
import { createDetectedPort } from "../../src/core/detectedPort.js";
import { decideSafety } from "../../src/core/safety.js";

describe("decideSafety", () => {
  it("marks current-user dev servers safe", () => {
    const port = withClassification(
      createDetectedPort({ port: 3000, processName: "node", command: "vite", user: "karina" }),
    );

    expect(decideSafety(port, DEFAULT_CONFIG, "karina").status).toBe("safe");
  });

  it("marks unknown current-user processes unknown", () => {
    const port = withClassification(
      createDetectedPort({
        port: 49152,
        processName: "custom",
        command: "custom --serve",
        user: "karina",
      }),
    );

    expect(decideSafety(port, DEFAULT_CONFIG, "karina")).toMatchObject({
      status: "unknown",
      requiresConfirmation: true,
    });
  });

  it("blocks root-owned processes", () => {
    const port = withClassification(
      createDetectedPort({ port: 3000, processName: "node", command: "vite", user: "root" }),
    );

    expect(decideSafety(port, DEFAULT_CONFIG, "karina").status).toBe("blocked");
  });

  it("lets protected config override safe classification", () => {
    const config = normalizeConfig({ protected: { ports: [3000] } });
    const port = {
      ...createDetectedPort({ port: 3000, processName: "node", command: "vite", user: "karina" }),
      classification: classifyProcess(
        createDetectedPort({ port: 3000, processName: "node", command: "vite", user: "karina" }),
        config,
      ),
    };

    expect(decideSafety(port, config, "karina").status).toBe("protected");
  });

  it("lets trusted commands promote unknown processes", () => {
    const config = normalizeConfig({ safe_to_stop: { commands: ["custom --serve"] } });
    const port = {
      ...createDetectedPort({
        port: 49152,
        processName: "custom",
        command: "custom --serve",
        user: "karina",
      }),
      classification: classifyProcess(
        createDetectedPort({
          port: 49152,
          processName: "custom",
          command: "custom --serve",
          user: "karina",
        }),
        config,
      ),
    };

    expect(decideSafety(port, config, "karina").status).toBe("safe");
  });
});

function withClassification(port: ReturnType<typeof createDetectedPort>) {
  return {
    ...port,
    classification: classifyProcess(port, DEFAULT_CONFIG),
  };
}
