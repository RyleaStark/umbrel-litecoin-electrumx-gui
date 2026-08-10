import type { ConnectionDetails } from "../../../packages/contracts/src/connections.js";
import { deriveIndexerStatus, type IndexerStatus } from "../../../packages/contracts/src/status.js";
import type { ElectrumXGuiService } from "./app.js";

export interface LitecoinCoreClient {
  getBlockchainInfo(): Promise<{ blocks: number; initialblockdownload: boolean }>;
}

export interface ElectrumXInfo { version: string; dbHeight: number; daemonHeight: number }
export interface ElectrumXClient { getInfo(): Promise<ElectrumXInfo> }

export function createElectrumXGuiService({ core, electrumx, connections }: {
  core: LitecoinCoreClient;
  electrumx: ElectrumXClient;
  connections: ConnectionDetails;
}): ElectrumXGuiService {
  return {
    getConnections: () => connections,
    async getLegacyVersion() { return (await electrumx.getInfo()).version; },
    async getLegacySyncPercent() {
      try {
        const coreInfo = await core.getBlockchainInfo();
        if (coreInfo.initialblockdownload) return -1;
        const info = await electrumx.getInfo();
        return Math.ceil((info.dbHeight / info.daemonHeight) * 100);
      } catch {
        return -2;
      }
    },
    async getStatus(): Promise<IndexerStatus> {
      let coreInfo: { blocks: number; initialblockdownload: boolean };
      try {
        coreInfo = await core.getBlockchainInfo();
      } catch {
        return { state: "degraded", version: null, coreHeight: null, indexedHeight: null, percent: null, message: "Litecoin Core is unavailable" };
      }
      if (coreInfo.initialblockdownload) {
        return deriveIndexerStatus({ coreHeight: coreInfo.blocks, indexedHeight: null, initialBlockDownload: true, version: null });
      }
      try {
        const info = await electrumx.getInfo();
        return deriveIndexerStatus({ coreHeight: coreInfo.blocks, indexedHeight: info.dbHeight, initialBlockDownload: false, version: info.version });
      } catch {
        return deriveIndexerStatus({ coreHeight: coreInfo.blocks, indexedHeight: null, initialBlockDownload: false, version: null });
      }
    },
  };
}
