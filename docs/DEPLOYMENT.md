# Linkora Deployment Guide

This guide covers how to deploy the full Linkora stack — smart contracts, indexer, web app, and mobile app — from scratch on Stellar Testnet or Mainnet.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Contract Deployment to Testnet](#contract-deployment-to-testnet)
3. [Contract Upgrade Procedure](#contract-upgrade-procedure)
4. [Indexer Deployment](#indexer-deployment)
5. [Web App Deployment](#web-app-deployment)
6. [Mobile App Release](#mobile-app-release)
7. [Environment Variable Reference](#environment-variable-reference)

---

## Prerequisites

| Tool | Minimum version | Install |
|------|----------------|---------|
| Rust toolchain | stable | https://rustup.rs |
| stellar-cli | 22.8.1 | `cargo install --locked stellar-cli --version 22.8.1` |
| Node.js | 18 | https://nodejs.org |
| pnpm | 9 | `npm install -g pnpm@9` |
| Docker + Compose | 24 / v2 | https://docs.docker.com/get-docker/ |
| EAS CLI | latest | `npm install -g eas-cli` |

Verify your stellar-cli version before deploying:

```bash
stellar --version
# Expected: stellar 22.8.1
```

---

## Contract Deployment to Testnet

### 1. Fund a deployer account

The deployer account pays XLM fees. Fund it via Friendbot (Testnet only):

```bash
curl "https://friendbot.stellar.org?addr=<YOUR_PUBLIC_KEY>"
```

### 2. Set environment variables

```bash
export ADMIN_SECRET="S..."          # Secret key of the deployer / admin account
export TREASURY_ADDRESS="G..."      # Public address that receives protocol fees
export FEE_BPS=250                  # Protocol fee: 250 = 2.5%
export NETWORK=testnet              # or "mainnet"
```

### 3. Validate inputs without deploying (dry run)

```bash
./scripts/deploy_testnet.sh --dry-run
```

This checks that all required variables are set and that the required tools are installed, without touching the network.

### 4. Deploy and initialize

```bash
./scripts/deploy_testnet.sh
```

On success the script prints a deployment summary:

```
╔══════════════════════════════════════════════════════════════╗
║               Deployment Summary                            ║
╠══════════════════════════════════════════════════════════════╣
║  network:              testnet                              ║
║  contract_id:          CABC...XYZ                           ║
║  admin:                GABC...XYZ                           ║
║  treasury:             GTRE...XYZ                           ║
║  fee_bps:              250                                   ║
╚══════════════════════════════════════════════════════════════╝
```

Save `contract_id` — you will need it for the indexer and web app.

### 5. Redeploy to an existing contract (skip build + deploy)

If you have already deployed the contract and only need to re-initialize (e.g. after a reset):

```bash
CONTRACT_ID=CABC...XYZ \
ADMIN_SECRET=S... \
TREASURY_ADDRESS=G... \
FEE_BPS=250 \
./scripts/deploy_testnet.sh
```

Setting `CONTRACT_ID` skips the build and `stellar contract deploy` steps.

---

## Contract Upgrade Procedure

Upgrading the Linkora contract replaces the on-chain WASM without changing the contract ID or the existing persistent state layout.

The contract keeps a small admin-controlled metadata record in instance storage:

- `version` tracks the active contract state version for migration planning.
- `implementation_wasm_hash` records the last successful WASM hash.

Future releases must preserve the existing `StorageKey` variants and only append new storage fields or keys so older state can still be read safely.

### 1. Build the new WASM

```bash
pnpm build:contracts
```

The artifact is at `packages/contracts/contracts/linkora-contracts/target/wasm32v1-none/release/linkora_contracts.wasm`.

### 2. Upload the new WASM

```bash
stellar contract upload \
  --network testnet \
  --source-account <DEPLOYER_ALIAS> \
  --wasm packages/contracts/contracts/linkora-contracts/target/wasm32v1-none/release/linkora_contracts.wasm
```

Note the printed `wasm_hash`.

### 3. Invoke the upgrade function

Only the contract admin can call `upgrade`:

```bash
stellar contract invoke \
  --network testnet \
  --source-account <ADMIN_ALIAS> \
  --id <CONTRACT_ID> \
  -- upgrade \
  --new-wasm-hash <WASM_HASH>
```

The contract uses `Env::deployer().update_current_contract_wasm(...)` internally, so the uploaded hash must already exist on-chain. A successful upgrade increments the stored `version` and writes the new implementation hash to instance storage.

### 4. Verify

```bash
stellar contract invoke \
  --network testnet \
  --id <CONTRACT_ID> \
  -- get_fee_bps
```

If the call succeeds, the new WASM is active. For a fuller smoke test, also re-run the app flows that exercise profile creation, posts, follows, and pool operations against the upgraded contract ID.

> After an upgrade the indexer receives a `ContractUpgraded` event. If you added new event types, redeploy the indexer before the new events start arriving.

---

## Indexer Deployment

The indexer is a standalone service that listens to Soroban contract events and exposes a REST API. See [docs/indexer/INDEXER_DESIGN.md](indexer/INDEXER_DESIGN.md) for architecture details and [docs/indexer/API.md](indexer/API.md) for the full API reference.

### Docker Compose (recommended)

```bash
cp .env.indexer.example .env.indexer
```

Edit `.env.indexer`:

```env
CONTRACT_ID=CABC...XYZ
RPC_URL=https://soroban-testnet.stellar.org
NETWORK_PASSPHRASE=Test SDF Network ; September 2015
DATABASE_URL=postgres://linkora:linkora@db:5432/linkora_index
POLL_INTERVAL_MS=5000
BATCH_SIZE=100
API_PORT=3001
```

Start the stack:

```bash
docker compose --env-file .env.indexer up -d
```

Verify:

```bash
curl http://localhost:3001/health
# {"status":"ok","ledger":12345678}
```

### Self-hosted (without Docker)

1. Provision a PostgreSQL 16 database and note the connection string.
2. Run the indexer binary (or `node` process) with the environment variables above.
3. Point a reverse proxy (nginx, Caddy) at the API port.

### Environment variables

See [Environment Variable Reference](#environment-variable-reference) for the full list.

---

## Web App Deployment

The web app lives in `apps/web` and is a Next.js 15 application.

### Vercel (recommended)

1. Import the repository into [Vercel](https://vercel.com).
2. Set the **root directory** to `apps/web`.
3. Add the required environment variables in Vercel's project settings (see [Environment Variable Reference](#environment-variable-reference)).
4. Deploy. Vercel will run `next build` automatically on every push to `main`.

### Self-hosted

```bash
pnpm install
pnpm build           # builds all packages via Turborepo
```

Then serve `apps/web/.next` with any Node.js host:

```bash
cd apps/web
node .next/standalone/server.js
```

Or use `next start`:

```bash
cd apps/web
pnpm start
```

Point your reverse proxy at port `3000`.

### Required environment variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_CONTRACT_ID` | Deployed Linkora contract address |
| `NEXT_PUBLIC_RPC_URL` | Soroban RPC endpoint |
| `NEXT_PUBLIC_NETWORK_PASSPHRASE` | Stellar network passphrase |
| `NEXT_PUBLIC_INDEXER_URL` | Base URL of the indexer REST API |

---

## Mobile App Release

The Linkora mobile app uses [EAS Build](https://docs.expo.dev/build/introduction/) for cloud-based native builds and [EAS Submit](https://docs.expo.dev/submit/introduction/) for store submission.

> See [docs/mobile/DEVELOPER_GUIDE.md](mobile/DEVELOPER_GUIDE.md) for local development setup.

### First-time setup

```bash
npm install -g eas-cli
eas login
cd apps/mobile
eas build:configure   # creates / updates eas.json
```

### Android build (Google Play)

```bash
cd apps/mobile
eas build --platform android --profile production
```

This produces a signed `.aab` (Android App Bundle).

Submit to Google Play:

```bash
eas submit --platform android
```

### iOS build (App Store)

```bash
cd apps/mobile
eas build --platform ios --profile production
```

This produces a signed `.ipa`.

Submit to the App Store:

```bash
eas submit --platform ios
```

### EAS environment variables

Store secrets in EAS rather than in the repository:

```bash
eas env:create --scope project --name CONTRACT_ID --value CABC...XYZ
eas env:create --scope project --name RPC_URL     --value https://soroban-testnet.stellar.org
```

---

## Environment Variable Reference

### Contract deployment script (`scripts/deploy_testnet.sh`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ADMIN_SECRET` | yes | — | Secret key (`S...`) of the deployer / admin account |
| `TREASURY_ADDRESS` | yes | — | Public address (`G...`) that receives protocol fees |
| `FEE_BPS` | no | `0` | Protocol fee in basis points (0–10000) |
| `NETWORK` | no | `testnet` | Stellar network (`testnet` or `mainnet`) |
| `CONTRACT_ID` | no | — | If set, skip deploy and use this existing contract ID |

### Indexer service

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CONTRACT_ID` | yes | — | Deployed Linkora contract address |
| `RPC_URL` | yes | — | Soroban RPC endpoint URL |
| `NETWORK_PASSPHRASE` | yes | — | Stellar network passphrase |
| `DATABASE_URL` | yes | — | PostgreSQL connection string |
| `POLL_INTERVAL_MS` | no | `5000` | Polling interval in milliseconds |
| `BATCH_SIZE` | no | `100` | Ledgers fetched per polling cycle |
| `API_PORT` | no | `3001` | Port the REST API listens on |

### Web app (`apps/web`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_CONTRACT_ID` | yes | Deployed Linkora contract address |
| `NEXT_PUBLIC_RPC_URL` | yes | Soroban RPC endpoint URL |
| `NEXT_PUBLIC_NETWORK_PASSPHRASE` | yes | Stellar network passphrase |
| `NEXT_PUBLIC_INDEXER_URL` | yes | Base URL of the indexer REST API |

### Mobile app (`apps/mobile`)

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_CONTRACT_ID` | yes | Deployed Linkora contract address |
| `EXPO_PUBLIC_RPC_URL` | yes | Soroban RPC endpoint URL |
| `EXPO_PUBLIC_NETWORK_PASSPHRASE` | yes | Stellar network passphrase |
