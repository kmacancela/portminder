import { Command } from "commander";
import { formatExplain } from "../core/format.js";
import { resolveOneTarget, scanForCommand, withCommonOptions, write, writeJson } from "./shared.js";

export function registerExplainCommand(program: Command): void {
  const command = withCommonOptions(
    new Command("explain")
      .description("explain what is using a port or process")
      .argument("<target>", "port, pid:<pid>, process name, command, or project")
      .option("--json", "emit JSON"),
  );

  command.action(async (target: string, options: { json?: boolean }, actionCommand: Command) => {
    const { ports } = await scanForCommand(actionCommand);
    const match = await resolveOneTarget(ports, target, { json: options.json, purpose: "explain" });
    if (!match) {
      return;
    }
    if (options.json) {
      writeJson({ port: match });
      return;
    }
    write(formatExplain(match));
  });

  program.addCommand(command);
}
