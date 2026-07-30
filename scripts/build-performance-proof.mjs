import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const environment = {
  ...process.env,
  VITE_ARENA_WS_URL: process.env.WORMIFI_PERF_ARENA_URL ?? "ws://127.0.0.1:8791",
};

for (const [entrypoint, args] of [
  ["node_modules/typescript/bin/tsc", ["-b"]],
  ["node_modules/vite/bin/vite.js", ["build"]],
]) {
  const result = spawnSync(
    process.execPath,
    [path.resolve(projectRoot, entrypoint), ...args],
    { cwd: projectRoot, env: environment, stdio: "inherit" },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
