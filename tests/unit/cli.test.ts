import { describe, expect, it } from "vitest";
import { createProgram } from "../../src/cli.js";

describe("CLI wiring", () => {
  it("registers the expected commands", () => {
    const program = createProgram();
    const commandNames = program.commands.map((command) => command.name());

    expect(commandNames).toEqual(
      expect.arrayContaining([
        "list",
        "explain",
        "stop",
        "free",
        "cleanup",
        "end-day",
        "doctor",
        "protect",
        "trust",
      ]),
    );
  });
});
