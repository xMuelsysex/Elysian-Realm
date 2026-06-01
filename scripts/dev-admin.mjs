import { spawn } from "node:child_process";

const processes = [];

function run(name, command, args) {
  const child = spawn(command, args, { stdio: "inherit", shell: process.platform === "win32" });
  processes.push(child);
  child.on("exit", (code, signal) => {
    if (signal) return;
    if (code && code !== 0) {
      console.error(`${name} exited with code ${code}`);
      shutdown(code);
    }
  });
  return child;
}

function runOnce(name, command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", shell: process.platform === "win32" });
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${name} exited from signal ${signal}`));
        return;
      }
      if (code && code !== 0) {
        reject(new Error(`${name} exited with code ${code}`));
        return;
      }
      resolve();
    });
  });
}

function shutdown(code = 0) {
  for (const child of processes) {
    if (!child.killed) child.kill();
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

try {
  await runOnce("initial server build", "npm", ["run", "build:server"]);
  run("server build watch", "npm", ["run", "build:server", "--", "--watch", "--preserveWatchOutput"]);
  run("admin api", "node", ["dist/src/server/admin/adminServer.js"]);
  run("vite", "npm", ["run", "dev:ui"]);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Failed to start admin dev environment");
  shutdown(1);
}
