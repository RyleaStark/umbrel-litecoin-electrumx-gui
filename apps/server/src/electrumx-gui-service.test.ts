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
      publicElectrum: { isReady: vi.fn() },
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
      publicElectrum: { isReady: async () => true },
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
      publicElectrum: { isReady: vi.fn() },
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
      publicElectrum: { isReady: vi.fn() },
      connections
    });

    expect(await service.getStatus()).toMatchObject({ state: "connecting", coreHeight: 110, indexedHeight: null, percent: null });
    expect(await service.getLegacySyncPercent()).toBe(-2);
  });

  it("preserves the legacy rounded-up synchronization percentage", async () => {
    const service = createElectrumXGuiService({
      core: { getBlockchainInfo: async () => ({ blocks: 101, initialblockdownload: false }) },
      electrumx: { getInfo: async () => ({ version: "2.0.0", dbHeight: 99, daemonHeight: 101 }) },
      publicElectrum: { isReady: async () => false },
      connections
    });

    expect(await service.getLegacySyncPercent()).toBe(99);
  });

  it("uses ElectrumX's daemon height for its own DB-index percentage", async () => {
    const service = createElectrumXGuiService({
      core: { getBlockchainInfo: async () => ({ blocks: 200, initialblockdownload: false }) },
      electrumx: { getInfo: async () => ({ version: "2.0.0", dbHeight: 25, daemonHeight: 100 }) },
      publicElectrum: { isReady: async () => false },
      connections
    });

    expect(await service.getStatus()).toEqual({
      state: "indexing",
      version: "2.0.0",
      coreHeight: 200,
      indexedHeight: 25,
      percent: 25,
      message: "Indexing Litecoin transaction history"
    });
  });

  it("keeps reporting provider work instead of Connecting while the DB is caught up but the public listener is not ready", async () => {
    const service = createElectrumXGuiService({
      core: { getBlockchainInfo: async () => ({ blocks: 100, initialblockdownload: false }) },
      electrumx: { getInfo: async () => ({ version: "2.0.0", dbHeight: 100, daemonHeight: 100 }) },
      publicElectrum: { isReady: async () => false },
      connections
    });

    expect(await service.getStatus()).toEqual({
      state: "indexing",
      version: "2.0.0",
      coreHeight: 100,
      indexedHeight: 100,
      percent: 100,
      message: "ElectrumX is finalizing synchronization"
    });
  });

  it("fails closed for an impossible non-empty DB with a zero daemon height", async () => {
    const service = createElectrumXGuiService({
      core: { getBlockchainInfo: async () => ({ blocks: 100, initialblockdownload: false }) },
      electrumx: { getInfo: async () => ({ version: "2.0.0", dbHeight: 1, daemonHeight: 0 }) },
      publicElectrum: { isReady: async () => false },
      connections
    });

    expect(await service.getStatus()).toMatchObject({ state: "connecting", percent: null, indexedHeight: null });
    expect(await service.getLegacySyncPercent()).toBe(-2);
  });

  it("reports the legitimate empty-database sentinel as provider preparation", async () => {
    const publicReady = vi.fn();
    const service = createElectrumXGuiService({
      core: { getBlockchainInfo: async () => ({ blocks: 0, initialblockdownload: false }) },
      electrumx: { getInfo: async () => ({ version: "2.0.0", dbHeight: -1, daemonHeight: 0 }) },
      publicElectrum: { isReady: publicReady },
      connections,
    });

    expect(await service.getStatus()).toMatchObject({
      state: "indexing",
      indexedHeight: null,
      percent: 0,
      message: "Preparing ElectrumX database",
    });
    expect(publicReady).not.toHaveBeenCalled();
    expect(await service.getLegacySyncPercent()).toBe(0);
  });

  it("fails closed when the provider DB height is ahead of its daemon target", async () => {
    const publicReady = vi.fn(async () => true);
    const service = createElectrumXGuiService({
      core: { getBlockchainInfo: async () => ({ blocks: 110, initialblockdownload: false }) },
      electrumx: { getInfo: async () => ({ version: "2.0.0", dbHeight: 111, daemonHeight: 110 }) },
      publicElectrum: { isReady: publicReady },
      connections,
    });

    expect(await service.getStatus()).toMatchObject({ state: "connecting", indexedHeight: null, percent: null });
    expect(publicReady).not.toHaveBeenCalled();
    expect(await service.getLegacySyncPercent()).toBe(-2);
  });
});
