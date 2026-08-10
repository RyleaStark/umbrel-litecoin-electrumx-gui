import { describe, expect, it } from "vitest";
import { createConnectionDetails } from "./connections.js";

describe("createConnectionDetails", () => {
  it("creates distinct Litecoin LAN and Tor connection records", () => {
    expect(createConnectionDetails({ localHost: "umbrel.local", torHost: "electrumx.example.onion", port: "51003" })).toEqual({
      local: { address: "umbrel.local", port: 51003, connectionString: "umbrel.local:51003:t", transport: "tcp" },
      tor: { address: "electrumx.example.onion", port: 51003, connectionString: "electrumx.example.onion:51003:t", transport: "tcp" }
    });
  });

  it("rejects invalid public ports", () => {
    expect(() => createConnectionDetails({ localHost: "umbrel.local", torHost: "example.onion", port: "0" })).toThrow("Invalid Electrum port");
  });
});
