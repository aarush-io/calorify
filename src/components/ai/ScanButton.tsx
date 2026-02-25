/**
 * src/components/ai/ScanButton.tsx
 *
 * Drop-in AI scan button.  Handles every state:
 *   – anonymous  → taps open AuthScreen prompt
 *   – free + quota left  → scan food description
 *   – free + limit hit   → opens PaywallModal
 *   – pro  → unlimited scans
 *
 * Usage (e.g. in TodayPage or FoodChecklist):
 *
 *   import ScanButton from "../components/ai/ScanButton";
 *   ...
 *   <ScanButton onResult={(result) => addToDraft(result)} />
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAiScan } from "../../hooks/useAiScan";
import PaywallModal from "../paywall/PaywallModal";
import toast from "react-hot-toast";
import { ScanFoodResult } from "../../services/ai";

// Inline SVG icons — keeps bundle lean
const ScanIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-4 h-4">
    <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"/>
    <rect x="7" y="7" width="10" height="10" rx="1"/>
  </svg>
);

const SparkleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-4 h-4">
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/>
    <path d="M19 16l.75 2.25L22 19l-2.25.75L19 22l-.75-2.25L16 19l2.25-.75L19 16z"/>
  </svg>
);

interface Props {
  /** Called when a scan completes successfully — add the result to your food list. */
  onResult?: (result: ScanFoodResult) => void;
  /** Optional: override button label */
  label?: string;
  className?: string;
}

export default function ScanButton({ onResult, label, className = "" }: Props) {
  const {
    status, result, errorMessage,
    scan, reset,
    isAnonymous, isPro,
    scansUsed, scansLimit, scansRemaining, canScan,
  } = useAiScan();

  const [showPaywall,      setShowPaywall]      = useState(false);
  const [showInputSheet,   setShowInputSheet]   = useState(false);
  const [description,      setDescription]      = useState("");

  // ── Determine button text and state ────────────────────────────────────────
  const isScanning = status === "scanning";

  let buttonLabel: string;
  let buttonDisabled = false;

  if (isAnonymous) {
    buttonLabel = label ?? "Login to use AI scan";
  } else if (!canScan && !isPro) {
    buttonLabel = "Upgrade to continue";
  } else if (isPro) {
    buttonLabel = label ?? "Scan Food ✨";
  } else {
    const left = scansLimit - scansUsed;
    buttonLabel = label ?? `Scan Food (${left} left)`;
  }

  if (isScanning) {
    buttonLabel = "Scanning…";
    buttonDisabled = true;
  }

  // ── Tap handler ────────────────────────────────────────────────────────────
  const handleTap = () => {
    if (isAnonymous) {
      toast("Sign in with Google to use AI food scan 🤖", { icon: "🔒" });
      return;
    }
    if (!canScan && !isPro) {
      setShowPaywall(true);
      return;
    }
    reset();
    setDescription("");
    setShowInputSheet(true);
  };

  // ── Run the actual scan ────────────────────────────────────────────────────
  const handleScan = async () => {
    if (!description.trim()) {
      toast.error("Describe the food first");
      return;
    }
    const data = await scan(description.trim());
    if (data) {
      setShowInputSheet(false);
      onResult?.(data);
      toast.success(`Found: ${data.foodName} — ${data.calories} kcal`);
    }
    if (status === "limit_reached") {
      setShowInputSheet(false);
      setShowPaywall(true);
    }
  };

  return (
    <>
      {/* ── Main button ── */}
      <button
        onClick={handleTap}
        disabled={buttonDisabled}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-body font-semibold text-sm transition-all disabled:opacity-60 ${className}`}
        style={
          canScan || isPro
            ? {
                background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(167,139,250,0.15))",
                border: "1px solid rgba(124,58,237,0.4)",
                color: "#A78BFA",
                boxShadow: "0 0 16px rgba(124,58,237,0.15)",
              }
            : {
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: isAnonymous ? "rgba(255,255,255,0.4)" : "#F59E0B",
              }
        }
      >
        {isScanning ? (
          <span className="w-4 h-4 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
        ) : canScan || isPro ? (
          <SparkleIcon />
        ) : (
          <ScanIcon />
        )}
        {buttonLabel}
      </button>

      {/* ── Input sheet — describe the food ── */}
      <AnimatePresence>
        {showInputSheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setShowInputSheet(false); reset(); }}
              style={{
                position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
                backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", zIndex: 110,
              }}
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              style={{
                position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 111,
                maxWidth: "512px", margin: "0 auto",
                display: "flex", flexDirection: "column",
                borderRadius: "24px 24px 0 0", overflow: "hidden",
                background: "rgba(14,10,26,0.98)",
                border: "1px solid rgba(255,255,255,0.1)",
                backdropFilter: "blur(30px)", WebkitBackdropFilter: "blur(30px)",
              }}
            >
              {/* Header */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "20px 24px 16px", flexShrink: 0,
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div>
                  <h3 className="font-display font-bold text-lg flex items-center gap-2">
                    <span>🤖</span> AI Food Scan
                  </h3>
                  {!isPro && (
                    <p className="text-xs text-white/30 font-body mt-0.5">
                      {scansLimit - scansUsed} of {scansLimit} free scans remaining
                    </p>
                  )}
                </div>
                <button
                  onClick={() => { setShowInputSheet(false); reset(); }}
                  style={{ color: "rgba(255,255,255,0.4)", fontSize: 24, background: "none", border: "none", cursor: "pointer", padding: "4px", lineHeight: 1 }}
                >
                  ×
                </button>
              </div>

              {/* Content */}
              <div style={{ padding: "20px 24px 8px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label className="text-xs text-white/40 font-body uppercase tracking-wider mb-2 block">
                    Describe the food
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleScan(); } }}
                    placeholder="e.g. A bowl of oatmeal with blueberries and honey"
                    rows={3}
                    className="w-full glass rounded-2xl px-4 py-3 text-sm font-body text-white placeholder-white/20 outline-none focus:border-violet-500/50 border border-transparent transition-colors resize-none"
                    autoFocus
                  />
                </div>

                {/* Result preview */}
                <AnimatePresence>
                  {status === "success" && result && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="glass rounded-2xl p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-body font-semibold text-white/90 text-sm">{result.foodName}</span>
                        <span className="calorie-number font-bold text-sm" style={{ color: "#A78BFA" }}>
                          {result.calories} kcal
                        </span>
                      </div>
                      {(result.protein != null || result.carbs != null || result.fats != null) && (
                        <div className="flex gap-4 text-xs text-white/40 font-body">
                          {result.protein != null && <span>P: {result.protein}g</span>}
                          {result.carbs   != null && <span>C: {result.carbs}g</span>}
                          {result.fats    != null && <span>F: {result.fats}g</span>}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {status === "error" && (
                    <motion.p
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="text-xs text-red-400 font-body"
                    >
                      {errorMessage}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* CTA */}
              <div style={{
                flexShrink: 0, padding: "12px 24px",
                paddingBottom: "max(20px, env(safe-area-inset-bottom, 20px))",
                borderTop: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(14,10,26,0.98)",
              }}>
                <button
                  onClick={handleScan}
                  disabled={isScanning || !description.trim()}
                  className="w-full btn-primary py-4 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isScanning ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Scanning…</>
                  ) : (
                    <><SparkleIcon /> Scan with AI</>
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Paywall ── */}
      <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} />
    </>
  );
}
