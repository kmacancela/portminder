import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { installCodexSkill } from "../../src/core/codexSkill.js";

describe("installCodexSkill", () => {
  let tempRoot: string;
  let sourceDir: string;
  let codexHome: string;

  beforeEach(async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), "portminder-skill-test-"));
    sourceDir = path.join(tempRoot, "source-skill");
    codexHome = path.join(tempRoot, "codex-home");
    await mkdir(sourceDir, { recursive: true });
    await writeFile(path.join(sourceDir, "SKILL.md"), skillBody("source"));
  });

  afterEach(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  it("copies the bundled skill into Codex home", async () => {
    const result = await installCodexSkill({ codexHome, sourceDir });
    const installed = await readFile(
      path.join(codexHome, "skills", "portminder", "SKILL.md"),
      "utf8",
    );

    expect(result.status).toBe("installed");
    expect(installed).toContain("source");
  });

  it("is safe to rerun when the installed skill matches", async () => {
    await installCodexSkill({ codexHome, sourceDir });
    const result = await installCodexSkill({ codexHome, sourceDir });

    expect(result.status).toBe("already-installed");
  });

  it("refuses to overwrite a different existing skill without force", async () => {
    await installCodexSkill({ codexHome, sourceDir });
    await writeFile(
      path.join(codexHome, "skills", "portminder", "SKILL.md"),
      skillBody("different"),
    );

    await expect(installCodexSkill({ codexHome, sourceDir })).rejects.toThrow(
      /A different skill already exists/,
    );
  });

  it("repairs a different existing skill with force", async () => {
    await installCodexSkill({ codexHome, sourceDir });
    await writeFile(
      path.join(codexHome, "skills", "portminder", "SKILL.md"),
      skillBody("different"),
    );

    const result = await installCodexSkill({ codexHome, sourceDir, force: true });
    const installed = await readFile(
      path.join(codexHome, "skills", "portminder", "SKILL.md"),
      "utf8",
    );

    expect(result.status).toBe("repaired");
    expect(installed).toContain("source");
  });
});

function skillBody(marker: string): string {
  return `---
name: portminder
description: ${marker}
---

# PortMinder
`;
}
