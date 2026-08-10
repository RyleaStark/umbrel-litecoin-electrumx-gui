import { connect } from "node:net";
import { z } from "zod";
import type { ElectrumXClient } from "./electrumx-gui-service.js";

const responseSchema = z.object({ id: z.number(), result: z.unknown(), error: z.unknown().optional() });
const infoSchema = z.object({
  version: z.string().min(1),
  "db height": z.number().int().nonnegative(),
  "daemon height": z.number().int().nonnegative(),
});

export function createElectrumXClient({ host, port, timeoutMs = 5_000 }: { host: string; port: number; timeoutMs?: number }): ElectrumXClient {
  let requestId = 0;

  async function request(method: string, params: unknown[]): Promise<unknown> {
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
      socket.on("timeout", () => finish(new Error("ElectrumX admin request timed out")));
      socket.on("error", () => finish(new Error("ElectrumX admin request failed")));
      socket.on("connect", () => socket.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`));
      socket.on("data", (chunk) => {
        buffer += chunk;
        if (buffer.length > 65_536) return finish(new Error("ElectrumX admin response was too large"));
        const newline = buffer.indexOf("\n");
        if (newline === -1) return;
        try {
          const response = responseSchema.parse(JSON.parse(buffer.slice(0, newline)));
          if (response.id !== id || response.error) throw new Error("invalid response");
          finish(undefined, response.result);
        } catch {
          finish(new Error("ElectrumX admin response was invalid"));
        }
      });
    });
  }

  return {
    async getInfo() {
      const info = infoSchema.parse(await request("getinfo", []));
      const version = info.version.split(" ")[1] || "unknown";
      return {
        version,
        dbHeight: info["db height"],
        daemonHeight: info["daemon height"],
      };
    },
  };
}
