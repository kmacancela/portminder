import { Command } from "commander";
import { scanForCommand, withCommonOptions, write, writeJson } from "./shared.js";
import { formatPortTable as table } from "../core/format.js";

export function registerListCommand(program: Command): void {
  const command = withCommonOptions(
    new Command("list")
      .description("show active local listening ports")
      .option("--json", "emit JSON")
      .option("--all", "show all listening ports")
      .option("--dev-only", "show only safe development servers")
      .option("--protected", "show only protected or blocked services")
      .option("--watch", "refresh every two seconds"),
  );

  command.action(
    async (
      options: {
        json?: boolean;
        all?: boolean;
        devOnly?: boolean;
        protected?: boolean;
        watch?: boolean;
      },
      actionCommand: Command,
    ) => {
      const run = async () => {
        const { ports } = await scanForCommand(actionCommand);
        const filtered = filterPorts(ports, options);
        if (options.json) {
          writeJson({ ports: filtered });
        } else {
          write(table(filtered));
        }
      };

      if (!options.watch) {
        await run();
        return;
      }

      await run();
      setInterval(() => {
        run().catch((error) => {
          process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
        });
      }, 2000);
    },
  );

  program.addCommand(command);
}

export async function runDefaultList(program: Command): Promise<void> {
  const { ports } = await scanForCommand(program);
  write(table(ports));
}

function filterPorts(
  ports: Awaited<ReturnType<typeof scanForCommand>>["ports"],
  options: { all?: boolean; devOnly?: boolean; protected?: boolean },
) {
  if (options.all) {
    return ports;
  }
  if (options.devOnly) {
    return ports.filter((port) => port.safety.status === "safe");
  }
  if (options.protected) {
    return ports.filter(
      (port) => port.safety.status === "protected" || port.safety.status === "blocked",
    );
  }
  return ports;
}
