import type { ConnectionDetails } from "../../../packages/contracts/src/connections.js";
import { deriveIndexerStatus, type IndexerStatus } from "../../../packages/contracts/src/status.js";
import type { ElectrumXGuiService } from "./app.js";

// Pinned runtime v2.0.0-umbrel.1 leaves Litecoin.REQUIRED_DAEMON_INDEXES empty.
// Core is therefore chain context only here; Bitcoin-only txindex requirements must not be imported.
export interface LitecoinCoreClient {
  getBlockchainInfo(): Promise<{ blocks: number; initialblockdownload: boolean }>;
}

export interface ElectrumXInfo { version: string; dbHeight: number; daemonHeight: number }
export interface ElectrumXClient { getInfo(): Promise<ElectrumXInfo> }
export interface ElectrumXPublicClient { isReady(): Promise<boolean> }

function connectingStatus(coreHeight: number): IndexerStatus {
  return deriveIndexerStatus({ coreHeight, indexedHeight: null, initialBlockDownload: false, version: null });
}

function validHeights(info: ElectrumXInfo) {
  return info.dbHeight >= -1 && info.daemonHeight >= 0 && info.dbHeight <= info.daemonHeight;
}

export function createElectrumXGuiService({ core, electrumx, publicElectrum, connections }: {
  core: LitecoinCoreClient;
  electrumx: ElectrumXClient;
  publicElectrum: ElectrumXPublicClient;
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
        if (!validHeights(info)) return -2;
        if (info.dbHeight === -1) return 0;
        if (info.daemonHeight === 0) return 0;
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
        if (!validHeights(info)) return connectingStatus(coreInfo.blocks);
        if (info.dbHeight === -1) {
          return {
            state: "indexing",
            version: info.version,
            coreHeight: coreInfo.blocks,
            indexedHeight: null,
            percent: 0,
            message: "Preparing ElectrumX database",
          };
        }

        const percent = info.daemonHeight === 0
          ? 0
          : Math.min(100, Math.max(0, Number(((info.dbHeight / info.daemonHeight) * 100).toFixed(2))));
        const databaseCaughtUp = info.dbHeight >= info.daemonHeight;
        const listenerReady = databaseCaughtUp
          ? await publicElectrum.isReady().catch(() => false)
          : false;

        return {
          state: listenerReady ? "ready" : "indexing",
          version: info.version,
          coreHeight: coreInfo.blocks,
          indexedHeight: info.dbHeight,
          percent: listenerReady ? 100 : percent,
          message: listenerReady
            ? "ElectrumX is synchronized"
            : databaseCaughtUp
              ? "ElectrumX is finalizing synchronization"
              : "Indexing Litecoin transaction history",
        };
      } catch {
        return connectingStatus(coreInfo.blocks);
      }
    },
  };
}
