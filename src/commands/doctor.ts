import { Command } from "commander";
import { formatDoctor } from "../core/format.js";
import { resolveTarget } from "../core/resolve.js";
import { scanForCommand, withCommonOptions, write, writeJson } from "./shared.js";

export function registerDoctorCommand(program: Command): void {
  const command = withCommonOptions(
    new Command("doctor")
      .description("diagnose local development port problems without stopping anything")
      .argument("[target]", "optional port, pid:<pid>, process name, command, or project")
      .option("--json", "emit JSON"),
  );

  command.action(
    async (target: string | undefined, options: { json?: boolean }, actionCommand: Command) => {
      const { ports } = await scanForCommand(actionCommand);
      const matches = target ? resolveTarget(ports, target) : ports;
      if (options.json) {
        writeJson({ ports: matches });
        return;
      }
      write(formatDoctor(matches, target));
    },
  );

  program.addCommand(command);
}
