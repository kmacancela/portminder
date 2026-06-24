import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../../src/core/config.js";
import { enrich } from "../../src/core/scan.js";
import { createDetectedPort } from "../../src/core/detectedPort.js";
import { formatPortTable } from "../../src/core/format.js";

describe("formatPortTable", () => {
  it("prints a stable table", () => {
    const port = enrich(
      createDetectedPort({
        port: 3000,
        pid: 123,
        processName: "node",
        command: "next dev",
        user: null,
        cwd: "/Users/example/work/site",
      }),
      DEFAULT_CONFIG,
    );

    const output = formatPortTable([port]);

    expect(output).toContain("Active local services");
    expect(output).toContain("3000");
    expect(output).toContain("Next.js");
    expect(output).toContain("safe");
  });
});
