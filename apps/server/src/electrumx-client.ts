import { connect } from "node:net";
import { z } from "zod";
import type { ElectrumXClient } from "./electrumx-gui-service.js";

const responseSchema = z.object({ id: z.number(), result: z.unknown(), error: z.unknown().optional() });
const infoSchema = z.object({
  version: z.string().min(1),
  "db height": z.number().int().min(-1),
  "daemon height": z.number().int().nonnegative(),
});

type ClientOptions = { host: string; port: number; timeoutMs?: number };

function createJsonRpcClient({ host, port, timeoutMs = 5_000 }: ClientOptions, context: "admin" | "public") {
  let requestId = 0;
  return async function request(method: string, params: unknown[]): Promise<unknown> {
    requestId += 1;
    const id = requestId;
    return new Promise((resolve, reject) => {
      const socket = connect({ host, port });
      let settled = false;
      let buffer = "";
      const finish = (error?: Error, result?: unknown) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        if (error) reject(error); else resolve(result);
      };
      socket.setEncoding("utf8");
      socket.setTimeout(timeoutMs);
      socket.on("timeout", () => finish(new Error(`ElectrumX ${context} request timed out`)));
      socket.on("error", () => finish(new Error(`ElectrumX ${context} request failed`)));
      socket.on("connect", () => socket.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`));
      socket.on("data", (chunk) => {
        buffer += chunk;
        if (buffer.length > 65_536) return finish(new Error(`ElectrumX ${context} response was too large`));
        const newline = buffer.indexOf("\n");
        if (newline === -1) return;
        try {
          const response = responseSchema.parse(JSON.parse(buffer.slice(0, newline)));
          if (response.id !== id || response.error) throw new Error("invalid response");
          finish(undefined, response.result);
        } catch {
          finish(new Error(`ElectrumX ${context} response was invalid`));
        }
      });
    });
  };
}

export function createElectrumXClient(options: ClientOptions): ElectrumXClient {
  const request = createJsonRpcClient(options, "admin");
  return {
    async getInfo() {
      const info = infoSchema.parse(await request("getinfo", []));
      const version = info.version.split(" ")[1] || "unknown";
      return { version, dbHeight: info["db height"], daemonHeight: info["daemon height"] };
    },
  };
}

export function createElectrumXPublicClient(options: ClientOptions) {
  const request = createJsonRpcClient(options, "public");
  return {
    async isReady() {
      z.union([z.string(), z.tuple([z.string(), z.string()])]).parse(
        await request("server.version", ["umbrel", "1.4"]),
      );
      return true;
    },
  };
}
