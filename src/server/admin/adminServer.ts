import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { URL } from "node:url";
import { createAdminController, type AdminController } from "./adminController.js";
import type { AdminErrorResponse } from "./adminContracts.js";

export interface AdminServerOptions {
  host?: string;
  port?: number;
  controller?: AdminController;
}

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 4317;
const MAX_BODY_BYTES = 128 * 1024;

export function createAdminServer(options: AdminServerOptions = {}) {
  const controller = options.controller ?? createAdminController();

  return createServer(async (request, response) => {
    try {
      await handleRequest(request, response, controller);
    } catch (error) {
      writeJson(response, 500, {
        error: {
          code: "ADMIN_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Unknown admin server error",
        },
      });
    }
  });
}

export function startAdminServer(options: AdminServerOptions = {}) {
  const host = options.host ?? process.env.ADMIN_HOST ?? DEFAULT_HOST;
  const port = options.port ?? readPort(process.env.ADMIN_PORT) ?? DEFAULT_PORT;
  const server = createAdminServer(options);
  server.listen(port, host, () => {
    console.log(`Elysian Realm admin API listening at http://${host}:${port}`);
  });
  return server;
}

async function handleRequest(request: IncomingMessage, response: ServerResponse, controller: AdminController): Promise<void> {
  if (!request.url || !request.method) {
    writeError(response, 400, "BAD_REQUEST", "Request URL and method are required.");
    return;
  }

  const url = new URL(request.url, "http://localhost");
  if (!url.pathname.startsWith("/api/admin")) {
    writeError(response, 404, "NOT_FOUND", "Route not found.");
    return;
  }

  if (request.method === "OPTIONS") {
    writeNoContent(response);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/admin/state") {
    writeJson(response, 200, controller.getState());
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/admin/step") {
    writeJson(response, 200, controller.step());
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/admin/reset") {
    writeJson(response, 200, controller.reset());
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/admin/input") {
    const body = await readJsonBody(request);
    if (!body.ok) {
      writeError(response, 400, "INVALID_JSON", body.message);
      return;
    }
    const result = controller.submitInput(body.value);
    writeJson(response, result.status, result.body);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/admin/llm/test") {
    const body = await readJsonBody(request);
    if (!body.ok) {
      writeError(response, 400, "INVALID_JSON", body.message);
      return;
    }
    const result = await controller.testLlmRuntimeConfig(body.value);
    writeJson(response, result.status, result.body);
    return;
  }

  writeError(response, 404, "NOT_FOUND", "Route not found.");
}

function writeJson(response: ServerResponse, status: number, body: unknown): void {
  const json = JSON.stringify(body);
  response.writeHead(status, {
    "Access-Control-Allow-Origin": "http://localhost:5173",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(json),
  });
  response.end(json);
}

function writeError(response: ServerResponse, status: number, code: string, message: string): void {
  writeJson(response, status, { error: { code, message } } satisfies AdminErrorResponse);
}

function writeNoContent(response: ServerResponse): void {
  response.writeHead(204, {
    "Access-Control-Allow-Origin": "http://localhost:5173",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  response.end();
}

async function readJsonBody(request: IncomingMessage): Promise<{ ok: true; value: unknown } | { ok: false; message: string }> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.byteLength;
    if (totalBytes > MAX_BODY_BYTES) {
      return { ok: false, message: "Request body is too large." };
    }
    chunks.push(buffer);
  }

  if (chunks.length === 0) {
    return { ok: true, value: {} };
  }

  try {
    return { ok: true, value: JSON.parse(Buffer.concat(chunks).toString("utf8")) };
  } catch {
    return { ok: false, message: "Request body must be valid JSON." };
  }
}

function readPort(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const port = Number(value);
  return Number.isInteger(port) && port > 0 ? port : undefined;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startAdminServer();
}
