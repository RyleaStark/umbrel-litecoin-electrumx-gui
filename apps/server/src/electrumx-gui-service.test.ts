// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createElectrumXGuiService } from "./electrumx-gui-service.js";

const connections = {
  local: { address: "umbrel.local", port: 51003, connectionString: "umbrel.local:51003", transport: "tcp" as const },
  tor: { address: "example.onion", port: 51003, connectionString: "example.onion:51003", transport: "tcp" as const }
};

describe("ElectrumXGuiService", () => {
  it("waits for Litecoin Core without querying ElectrumX during IBD", async () => {
    const getInfo = vi.fn();
    const service = createElectrumXGuiService({
      core: { getBlockchainInfo: async () => ({ blocks: 80, initialblockdownload: true }) },
      electrumx: { getInfo },
      connections
    });

    expect(await service.getStatus()).toMatchObject({ state: "waiting-for-core", coreHeight: 80 });
    expect(await service.getLegacySyncPercent()).toBe(-1);
    expect(getInfo).not.toHaveBeenCalled();
  });

  it("returns an accurate synchronized status", async () => {
    const service = createElectrumXGuiService({
      core: { getBlockchainInfo: async () => ({ blocks: 110, initialblockdownload: false }) },
      electrumx: { getInfo: async () => ({ version: "2.0.0", dbHeight: 110, daemonHeight: 110 }) },
      connections
    });

    expect(await service.getStatus()).toEqual({
      state: "ready",
      version: "2.0.0",
      coreHeight: 110,
      indexedHeight: 110,
      percent: 100,
      message: "ElectrumX is synchronized"
    });
    expect(service.getConnections()).toBe(connections);
    expect(await service.getLegacyVersion()).toBe("2.0.0");
    expect(await service.getLegacySyncPercent()).toBe(100);
  });

  it("degrades safely when Litecoin Core is unavailable", async () => {
    const service = createElectrumXGuiService({
      core: { getBlockchainInfo: async () => { throw new Error("rpcuser:secret"); } },
      electrumx: { getInfo: vi.fn() },
      connections
    });

    expect(await service.getStatus()).toEqual({
      state: "degraded",
      version: null,
      coreHeight: null,
      indexedHeight: null,
      percent: null,
      message: "Litecoin Core is unavailable"
    });
  });

  it("reports connecting and preserves the legacy unavailable sentinel", async () => {
    const service = createElectrumXGuiService({
      core: { getBlockchainInfo: async () => ({ blocks: 110, initialblockdownload: false }) },
      electrumx: { getInfo: async () => { throw new Error("not ready"); } },
      connections
    });

    expect(await service.getStatus()).toMatchObject({ state: "connecting", coreHeight: 110, indexedHeight: null, percent: null });
    expect(await service.getLegacySyncPercent()).toBe(-2);
  });

  it("preserves the legacy rounded-up synchronization percentage", async () => {
    const service = createElectrumXGuiService({
      core: { getBlockchainInfo: async () => ({ blocks: 101, initialblockdownload: false }) },
      electrumx: { getInfo: async () => ({ version: "2.0.0", dbHeight: 99, daemonHeight: 101 }) },
      connections
    });

    expect(await service.getLegacySyncPercent()).toBe(99);
  });
});
