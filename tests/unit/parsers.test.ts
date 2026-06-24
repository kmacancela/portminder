import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseSsListening } from "../../src/adapters/linux.js";
import { parseLsofListening } from "../../src/adapters/macos.js";
import { parseNetstatListening, parsePowerShellListening } from "../../src/adapters/windows.js";

describe("platform parsers", () => {
  it("parses macOS lsof listening output", () => {
    const output = readFileSync("tests/fixtures/lsof.txt", "utf8");
    const ports = parseLsofListening(output);

    expect(ports.map((port) => port.port)).toEqual([3000, 5432]);
    expect(ports[0]).toMatchObject({ pid: 11206, processName: "node", user: "karina" });
  });

  it("parses Linux ss listening output", () => {
    const output = readFileSync("tests/fixtures/ss.txt", "utf8");
    const ports = parseSsListening(output);

    expect(ports.map((port) => port.port)).toEqual([3000, 6379]);
    expect(ports[1]).toMatchObject({ pid: 2245, processName: "redis-server" });
  });

  it("parses Windows netstat fallback output", () => {
    const output = readFileSync("tests/fixtures/netstat.txt", "utf8");
    const ports = parseNetstatListening(output);

    expect(ports.map((port) => port.port)).toEqual([3000, 5432]);
    expect(ports[0]?.pid).toBe(11206);
  });

  it("parses Windows PowerShell JSON output", () => {
    const ports = parsePowerShellListening(
      JSON.stringify([{ LocalAddress: "127.0.0.1", LocalPort: 3000, OwningProcess: 11206 }]),
    );

    expect(ports[0]).toMatchObject({ address: "127.0.0.1", port: 3000, pid: 11206 });
  });
});
