import { spawn, type ChildProcess } from "node:child_process";
import { loadConfig } from "../config.js";
import { createPool } from "../db.js";
import { resetDatabase } from "./reset.js";

function stop(child: ChildProcess): void {
  if (child.exitCode === null && !child.killed) child.kill("SIGTERM");
}

async function waitForHealth(port: number, logs: () => string): Promise<void> {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok) return;
    } catch {
      // process is still binding
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`server did not start\n${logs()}`);
}

export async function withDemo(
  port: number,
  run: (base: string) => Promise<void>,
): Promise<void> {
  const config = await loadConfig();
  const pool = createPool(config);
  let child: ChildProcess | undefined;
  const kill = () => {
    if (child) stop(child);
  };
  process.once("exit", kill);
  process.once("SIGINT", () => {
    kill();
    process.exit(130);
  });
  try {
    await resetDatabase(pool);
    let logs = "";
    child = spawn(process.execPath, ["dist/main.js"], {
      env: { ...process.env, PORT: String(port) },
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout?.on("data", (chunk: Buffer) => {
      logs += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      logs += chunk.toString();
    });
    await waitForHealth(port, () => logs);
    await run(`http://127.0.0.1:${port}`);
  } finally {
    kill();
    if (child) {
      await new Promise((resolve) => child?.once("exit", resolve));
    }
    await pool.end();
  }
}
