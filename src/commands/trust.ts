import { Command } from "commander";
import { addTrustedTarget, getConfigPath, loadConfig, saveConfig } from "../core/config.js";
import { withCommonOptions, write, writeJson } from "./shared.js";

export function registerTrustCommand(program: Command): void {
  const command = withCommonOptions(
    new Command("trust")
      .description("mark a command or project as safe to stop during cleanup")
      .argument("<target>", "command or project path")
      .option("--json", "emit JSON"),
  );

  command.action(async (target: string, options: { json?: boolean }) => {
    const configPath = getConfigPath();
    const config = addTrustedTarget(await loadConfig(configPath), target);
    await saveConfig(config, configPath);
    if (options.json) {
      writeJson({ ok: true, configPath, safe_to_stop: config.safe_to_stop });
      return;
    }
    write(`Trusted ${target}. Updated ${configPath}\n`);
  });

  program.addCommand(command);
}
