#!/usr/bin/env bash
set -euo pipefail

# This script bootstraps a local Polygon Edge IBFT devnet.
# It assumes polygon-edge is installed and available on PATH.

POLYGON_EDGE_BIN="${POLYGON_EDGE_BIN:-polygon-edge}"
DEVNET_DIR="${DEVNET_DIR:-./.devnet-ibft4}"
GENESIS_JSON="${GENESIS_JSON:-$DEVNET_DIR/genesis.json}"

mkdir -p "$DEVNET_DIR"

build_genesis() {
  echo "[devnet-ibft4] Building genesis: $GENESIS_JSON"
  "$POLYGON_EDGE_BIN" genesis \
    --consensus ibft \
    --bootnode /ip4/127.0.0.1/tcp/1478/p2p/16Uiu2HAmP8VZ3rjdnxw18q92P6imfE6aPD58x35H5TADaBrZEcD3 \
    --premine 0x0000000000000000000000000000000000000001:0x3635C9ADC5DEA00000 \
    --chain-id 51001 \
    --name ibft4-devnet \
    --dir "$GENESIS_JSON"
}

normalize_and_filter_forks() {
  local tmp
  tmp="$(mktemp)"

  echo "[devnet-ibft4] Normalizing and filtering forks in $GENESIS_JSON"
  jq '
    .params.forks = (
      ((.params.forks // {})
        | with_entries(
            .value = (
              if (.value | type) == "number" then
                {"block": .value}
              else
                .value
              end
            )
          )) as $normalized
      | reduce [
          "homestead",
          "byzantium",
          "constantinople",
          "petersburg",
          "istanbul",
          "london",
          "eip150",
          "eip155",
          "eip158",
          "quorumCalcAlignment",
          "txHashWithType"
        ][] as $k
        ({}; if $normalized[$k] != null then . + {($k): $normalized[$k]} else . end)
    )
  ' "$GENESIS_JSON" > "$tmp"

  mv "$tmp" "$GENESIS_JSON"

  echo "[devnet-ibft4] Final fork keys: $(jq -r '.params.forks | keys | join(",")' "$GENESIS_JSON")"
}

start_nodes() {
  echo "[devnet-ibft4] Starting node-1"
  "$POLYGON_EDGE_BIN" server \
    --data-dir "$DEVNET_DIR/node-1" \
    --chain "$GENESIS_JSON" \
    --grpc-address 127.0.0.1:9632 \
    --jsonrpc 127.0.0.1:8545 \
    --libp2p 127.0.0.1:1478
}

build_genesis
normalize_and_filter_forks
start_nodes
