import { z } from "zod";

const port = z.coerce.number().int().min(1).max(65535);
const nonempty = z.string().trim().min(1);

const environmentSchema = z.object({
  PORT: port.default(3008),
  ELECTRUM_HOST: nonempty.default("0.0.0.0"),
  ELECTRUM_RPC_PORT: port.default(8000),
  ELECTRUM_PUBLIC_CONNECTION_PORT: port.default(51003),
  ELECTRUM_LOCAL_SERVICE: nonempty.default("umbrel.local"),
  ELECTRUM_HIDDEN_SERVICE: nonempty.default("/var/lib/tor/electrum/hostname"),
  LITECOIN_HOST: nonempty.default("127.0.0.1"),
  RPC_PORT: port.default(9332),
  RPC_USER: nonempty.default("umbrel"),
  RPC_PASSWORD: nonempty,
});

export type ServerConfig = ReturnType<typeof readConfig>;

export function readConfig(environment: NodeJS.ProcessEnv | Record<string, string | undefined>) {
  const parsed = environmentSchema.safeParse(environment);
  if (!parsed.success) throw new Error("Invalid ElectrumX GUI configuration");

  return {
    port: parsed.data.PORT,
    electrumx: { host: parsed.data.ELECTRUM_HOST, port: parsed.data.ELECTRUM_RPC_PORT },
    connections: {
      localHost: parsed.data.ELECTRUM_LOCAL_SERVICE,
      torHost: parsed.data.ELECTRUM_HIDDEN_SERVICE,
      port: parsed.data.ELECTRUM_PUBLIC_CONNECTION_PORT,
    },
    core: {
      host: parsed.data.LITECOIN_HOST,
      port: parsed.data.RPC_PORT,
      username: parsed.data.RPC_USER,
      password: parsed.data.RPC_PASSWORD,
    },
  };
}
