/**
 * src/hooks/useAiScan.ts
 *
 * Central hook for the AI food scan feature.
 * Handles: auth guard → quota guard → call → increment → return result.
 * Components just call `scan(description)` and react to the returned state.
 */

import { useState, useCallback } from "react";
import { useAppStore } from "../store/appStore";
import { scanFoodAI, ScanFoodResult } from "../services/ai";

export type ScanStatus =
  | "idle"
  | "scanning"
  | "success"
  | "error"
  | "auth_required"   // anonymous user
  | "limit_reached";  // free quota exhausted

export interface UseAiScanReturn {
  status:       ScanStatus;
  result:       ScanFoodResult | null;
  errorMessage: string;
  scan:         (description: string) => Promise<ScanFoodResult | null>;
  reset:        () => void;

  // Convenience flags for UI decisions
  isAnonymous:    boolean;
  isPro:          boolean;
  scansUsed:      number;
  scansLimit:     number;
  scansRemaining: number;
  canScan:        boolean;
}

export function useAiScan(): UseAiScanReturn {
  const { user, canUseAiScan, aiScansUsed, aiScansLimit, isPro } = useAppStore();

  const [status, setStatus]             = useState<ScanStatus>("idle");
  const [result, setResult]             = useState<ScanFoodResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const isAnonymous = !user || user.isAnonymous;
  const canScan     = canUseAiScan();
  const scansRemaining = isPro
    ? Infinity
    : Math.max(0, aiScansLimit - aiScansUsed);

  const scan = useCallback(
    async (description: string): Promise<ScanFoodResult | null> => {
      // ── Guard: anonymous user ──────────────────────────────────────────────
      if (isAnonymous) {
        setStatus("auth_required");
        return null;
      }

      // ── Guard: free quota exhausted ────────────────────────────────────────
      if (!canScan) {
        setStatus("limit_reached");
        return null;
      }

      // ── Guard: offline ─────────────────────────────────────────────────────
      if (!navigator.onLine) {
        setStatus("error");
        setErrorMessage("You're offline. Connect to the internet to scan.");
        return null;
      }

      setStatus("scanning");
      setResult(null);
      setErrorMessage("");

      try {
        const data = await scanFoodAI(description);
        setResult(data);
        setStatus("success");
        // Note: the scan count increment happens server-side inside the
        // Firebase Function, and the onSnapshot profile listener in the store
        // picks up the new aiScansUsed value automatically — no manual increment needed.
        return data;
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Scan failed. Please try again.";

        // Distinguish quota error from generic error
        if (msg.includes("resource-exhausted") || msg.includes("free AI scans")) {
          setStatus("limit_reached");
        } else {
          setStatus("error");
          setErrorMessage(msg);
        }
        return null;
      }
    },
    [isAnonymous, canScan]
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setResult(null);
    setErrorMessage("");
  }, []);

  return {
    status,
    result,
    errorMessage,
    scan,
    reset,
    isAnonymous,
    isPro,
    scansUsed:      aiScansUsed,
    scansLimit:     aiScansLimit,
    scansRemaining,
    canScan,
  };
}
