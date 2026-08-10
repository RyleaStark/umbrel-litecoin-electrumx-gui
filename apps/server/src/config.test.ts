// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readConfig } from "./config.js";

describe("server config", () => {
  it("accepts the inherited ElectrumX environment contract", () => {
    expect(readConfig({
      PORT: "3008",
      ELECTRUM_HOST: "electrumx_server_1",
      ELECTRUM_RPC_PORT: "8000",
      ELECTRUM_PUBLIC_CONNECTION_PORT: "51003",
      ELECTRUM_LOCAL_SERVICE: "umbrel.local",
      ELECTRUM_HIDDEN_SERVICE: "example.onion",
      LITECOIN_HOST: "litecoin_server_1",
      RPC_PORT: "9332",
      RPC_USER: "umbrel",
      RPC_PASSWORD: "secret"
    })).toEqual({
      port: 3008,
      electrumx: { host: "electrumx_server_1", port: 8000 },
      connections: { localHost: "umbrel.local", torHost: "example.onion", port: 51003 },
      core: { host: "litecoin_server_1", port: 9332, username: "umbrel", password: "secret" }
    });
  });

  it("retains non-secret defaults but requires the RPC password", () => {
    expect(() => readConfig({})).toThrow("Invalid ElectrumX GUI configuration");
    expect(readConfig({ RPC_PASSWORD: "secret" })).toMatchObject({
      port: 3008,
      electrumx: { host: "0.0.0.0", port: 8000 },
      connections: { port: 51003 },
      core: { host: "127.0.0.1", port: 9332, username: "umbrel" }
    });
  });

  it("rejects invalid ports without exposing the environment", () => {
    expect(() => readConfig({ RPC_PASSWORD: "secret", ELECTRUM_RPC_PORT: "nope" })).toThrow("Invalid ElectrumX GUI configuration");
  });
});
