import { useMemo, useState } from "react";
import type { Action, GameState } from "../../engine/types";
import type { ReplayBundleV1 } from "../utils/actionLog";
import { replayFromStart, applyReplayEntry } from "../utils/replay";
import { digestState } from "../utils/stateDigest";

type Reducer = (state: GameState, action: Action) => GameState;

type VerificationResult =
  | {
      status: "PASS";
      currentHash: string;
      replayHash: string;
      currentBytes: number;
      replayBytes: number;
      entryCount: number;
      mismatch: null;
      error: null;
    }
  | {
      status: "FAIL";
      currentHash: string;
      replayHash: string;
      currentBytes: number;
      replayBytes: number;
      entryCount: number;
      mismatch: { actionIndex: number; actionType: string } | null;
      error: null;
    }
  | {
      status: "ERROR";
      currentHash: string;
      replayHash: string;
      currentBytes: number;
      replayBytes: number;
      entryCount: number;
      mismatch: null;
      error: string;
    };

export function DeterminismPanel(props: {
  bundle: ReplayBundleV1 | null;
  presentState: GameState;
  reducer: Reducer;
  onReplaceState: (next: GameState, bundle: ReplayBundleV1) => void;
}) {
  const { bundle, presentState, reducer, onReplaceState } = props;
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [lastReplayedState, setLastReplayedState] = useState<GameState | null>(null);

  const canRun = !!bundle;

  const debugReport = useMemo(() => {
    if (!result || !bundle) return "";
    return JSON.stringify(
      {
        status: result.status,
        currentHash: result.currentHash,
        replayHash: result.replayHash,
        currentBytes: result.currentBytes,
        replayBytes: result.replayBytes,
        entries: bundle.entries.length,
        mismatch: result.mismatch,
        error: result.error,
        lastActions: bundle.entries.slice(-10),
      },
      null,
      2,
    );
  }, [bundle, result]);

  function findMismatchDetails(nextBundle: ReplayBundleV1, current: GameState) {
    let replayCursor = structuredClone(nextBundle.initial) as GameState;
    const checkpoint = 10;
    for (let i = 0; i < nextBundle.entries.length; i += 1) {
      replayCursor = applyReplayEntry(
        replayCursor,
        nextBundle.entries[i],
        reducer,
      );
      if ((i + 1) % checkpoint !== 0 && i !== nextBundle.entries.length - 1) continue;
      const currentDigest = digestState(current);
      const replayDigest = digestState(replayCursor);
      if (currentDigest.hash !== replayDigest.hash) {
        return {
          actionIndex: i,
          actionType: nextBundle.entries[i].type,
        };
      }
    }
    return null;
  }

  function handleVerify() {
    if (!bundle) {
      setResult({
        status: "ERROR",
        currentHash: "n/a",
        replayHash: "n/a",
        currentBytes: 0,
        replayBytes: 0,
        entryCount: 0,
        mismatch: null,
        error: "No replay bundle available.",
      });
      return;
    }

    try {
      const replayed = replayFromStart(bundle, reducer);
      const currentDigest = digestState(presentState);
      const replayDigest = digestState(replayed);
      const mismatch =
        currentDigest.hash === replayDigest.hash
          ? null
          : findMismatchDetails(bundle, presentState);
      setLastReplayedState(replayed);
      setResult({
        status: currentDigest.hash === replayDigest.hash ? "PASS" : "FAIL",
        currentHash: currentDigest.hash,
        replayHash: replayDigest.hash,
        currentBytes: currentDigest.bytes,
        replayBytes: replayDigest.bytes,
        entryCount: bundle.entries.length,
        mismatch,
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown replay error.";
      const currentDigest = digestState(presentState);
      setResult({
        status: "ERROR",
        currentHash: currentDigest.hash,
        replayHash: "n/a",
        currentBytes: currentDigest.bytes,
        replayBytes: 0,
        entryCount: bundle.entries.length,
        mismatch: null,
        error: message,
      });
      setLastReplayedState(null);
    }
  }

  async function handleCopyReport() {
    if (!debugReport) return;
    try {
      await navigator.clipboard.writeText(debugReport);
    } catch {
      // Silent: this panel should never crash gameplay on clipboard issues.
    }
  }

  return (
    <div
      style={{
        padding: 10,
        border: "1px solid #666",
        borderRadius: 10,
        background: "#fafafa",
        color: "#1f1f1f",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h3 style={{ margin: 0 }}>Determinism Inspector</h3>
        <div style={{ fontSize: 12, color: "#666" }}>Dev-only</div>
      </div>
      <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button type="button" disabled={!canRun} onClick={handleVerify}>
          Verify Replay Determinism
        </button>
        <button
          type="button"
          disabled={!bundle || !lastReplayedState}
          onClick={() => {
            if (!bundle || !lastReplayedState) return;
            onReplaceState(lastReplayedState, bundle);
          }}
        >
          Replay &amp; Replace State
        </button>
        <button type="button" disabled={!debugReport} onClick={handleCopyReport}>
          Copy Debug Report
        </button>
      </div>
      {!bundle && <div style={{ marginTop: 8, color: "#9a3412" }}>No replay bundle available.</div>}
      {result && (
        <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
          <div>
            <b>Status:</b>{" "}
            <span
              style={{
                color:
                  result.status === "PASS" ? "#166534" : result.status === "FAIL" ? "#b91c1c" : "#9a3412",
              }}
            >
              {result.status}
            </span>
          </div>
          <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>
            <div>current: {result.currentHash} ({result.currentBytes} bytes)</div>
            <div>replay: {result.replayHash} ({result.replayBytes} bytes)</div>
          </div>
          <div>entries: {result.entryCount}</div>
          {result.mismatch && (
            <div>
              First differing checkpoint near action #{result.mismatch.actionIndex + 1}: {result.mismatch.actionType}
            </div>
          )}
          {result.error && <div style={{ color: "#b91c1c" }}>Replay error: {result.error}</div>}
        </div>
      )}
    </div>
  );
}
