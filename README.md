# ElectrumX (LTC) for Umbrel

A modern, Litecoin-aware ElectrumX status and wallet-connection interface for Umbrel.

This GUI is paired with [`RyleaStark/umbrel-electrumx-ltc`](https://github.com/RyleaStark/umbrel-electrumx-ltc), an ElectrumX implementation configured for Litecoin. It remains a distinct product from Electrs (LTC) and Fulcrum (LTC).

## Interface

- React 19, TypeScript, Vite, Fastify 5, TanStack Query, Radix UI, and Zod;
- current Umbrel Bitcoin Node/Litecoin Node visual conventions with approved ElectrumX artwork;
- explicit waiting, connecting, indexing, synchronized, and degraded states;
- accessible local and Tor connection details, clipboard controls, and locally generated QR codes;
- no telemetry and no logging of request paths, RPC payloads, wallet information, or daemon responses;
- compatibility routes retained for existing Umbrel health and integration checks.

## Runtime contract

The Umbrel package supplies:

- `PORT` for the GUI service, normally `3008`;
- `ELECTRUM_HOST` and `ELECTRUM_RPC_PORT` for ElectrumX's private admin RPC, normally port `8000`;
- `LITECOIN_HOST`, `RPC_PORT`, `RPC_USER`, and `RPC_PASSWORD` for scoped Litecoin Core access;
- `ELECTRUM_PUBLIC_CONNECTION_PORT`, `ELECTRUM_LOCAL_SERVICE`, and `ELECTRUM_HIDDEN_SERVICE` for wallet instructions, fixed to public port `51003` in the Litecoin suite.

`RPC_PASSWORD` is required. The backend uses bounded native HTTP/TCP clients, requests only Litecoin Core `getblockchaininfo` and ElectrumX admin `getinfo`, and exposes validated minimal responses. The private admin RPC is never presented as a wallet endpoint.

## Compatibility routes

- `GET /ping`;
- `GET /v1/electrumx/electrum-connection-details`;
- `GET /v1/electrumx/version`;
- `GET /v1/electrumx/syncPercent`.

## Development

Requires Node.js 24 and npm 12.0.2.

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

`docker compose up --build` starts the unchanged ElectrumX `2.0.0-umbrel.1` daemon runtime and Litecoin Core regtest fixture for local integration work.

## Container

The production image uses digest-pinned Node 24 build stages and a Distroless Node 24 Debian 13 runtime, installs only production dependencies, runs as UID/GID `1000:1000`, and exposes only port `3008`.

Tagged `v*` releases publish multi-architecture images only after audit, lint, typecheck, tests, and production build pass.

## License

The current modernization source derives from the approved PolyForm-licensed Litecoin Electrs interface and is distributed under [`LICENSE.md`](LICENSE.md). [`LICENSE.legacy`](LICENSE.legacy) records the inherited repository's package-level ISC declaration without silently applying it to copied PolyForm source. Bundled font notices are in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
