import { Command } from "commander";
import { CodexSkillInstallError, installCodexSkill } from "../core/codexSkill.js";
import { write, writeJson } from "./shared.js";

export function registerSetupCodexCommand(program: Command): void {
  const command = new Command("setup-codex")
    .description("install the PortMinder Codex skill for use from any project")
    .option("--force", "replace an existing PortMinder skill install")
    .option("--codex-home <path>", "override the Codex home directory")
    .option("--json", "emit JSON");

  command.action(async (options: SetupCodexOptions) => {
    try {
      const result = await installCodexSkill({
        codexHome: options.codexHome,
        force: options.force,
      });

      if (options.json) {
        writeJson({ ok: true, ...result });
        return;
      }

      write(formatSuccess(result.status, result.targetDir));
    } catch (error) {
      process.exitCode = 1;
      const message = error instanceof Error ? error.message : String(error);
      if (options.json) {
        writeJson({
          ok: false,
          error: message,
          targetDir: error instanceof CodexSkillInstallError ? error.targetDir : undefined,
        });
        return;
      }
      process.stderr.write(`${message}\n`);
    }
  });

  program.addCommand(command);
}

interface SetupCodexOptions {
  force?: boolean | undefined;
  codexHome?: string | undefined;
  json?: boolean | undefined;
}

function formatSuccess(status: string, targetDir: string): string {
  if (status === "already-installed") {
    return `PortMinder skill is already installed at ${targetDir}.\nCodex can use PortMinder from any project.\n`;
  }

  if (status === "repaired") {
    return `PortMinder skill repaired at ${targetDir}.\nCodex can now use PortMinder from any project.\n`;
  }

  return `PortMinder skill installed at ${targetDir}.\nCodex can now use PortMinder from any project.\n`;
}
