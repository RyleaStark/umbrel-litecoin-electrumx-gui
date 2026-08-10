import { describe, expect, it } from "vitest";
import { createConnectionDetails } from "./connections.js";

describe("createConnectionDetails", () => {
  it("creates distinct Litecoin LAN and Tor connection records", () => {
    expect(createConnectionDetails({ localHost: "umbrel.local", torHost: "electrumx.example.onion", port: "51003" })).toEqual({
      local: { address: "umbrel.local", port: 51003, connectionString: "umbrel.local:51003", transport: "tcp" },
      tor: { address: "electrumx.example.onion", port: 51003, connectionString: "electrumx.example.onion:51003", transport: "tcp" }
    });
  });

  it("keeps the private administration RPC port out of wallet payloads", () => {
    const details = createConnectionDetails({ localHost: "umbrel.local", torHost: "electrumx.example.onion", port: 51003 });
    expect(JSON.stringify(details)).not.toContain("8000");
    expect(details.local.connectionString).not.toMatch(/:[ts]$/u);
    expect(details.tor.connectionString).not.toMatch(/:[ts]$/u);
  });

  it("rejects invalid public ports", () => {
    expect(() => createConnectionDetails({ localHost: "umbrel.local", torHost: "example.onion", port: "0" })).toThrow("Invalid Electrum port");
  });
});
