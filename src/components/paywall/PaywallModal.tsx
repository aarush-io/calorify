/**
 * src/components/paywall/PaywallModal.tsx
 *
 * Bottom-sheet paywall shown when a free user hits their AI scan limit.
 * Initiates Razorpay subscription and verifies payment on the backend.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "../../store/appStore";
import { createSubscription, verifyPayment } from "../../services/ai";
import toast from "react-hot-toast";

// Razorpay is loaded via <script> in index.html — declare the global type
declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  image?: string;
  prefill?: { name?: string; email?: string };
  theme?: { color?: string };
  handler: (response: RazorpayResponse) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open(): void;
}

interface Props {
  open:    boolean;
  onClose: () => void;
}

const CheckIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-400 flex-shrink-0">
    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
  </svg>
);

const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-4 h-4 text-white/30 flex-shrink-0">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0110 0v4"/>
  </svg>
);

export default function PaywallModal({ open, onClose }: Props) {
  const { user, aiScansUsed, aiScansLimit, syncAiQuota, isPro } = useAppStore();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!user || user.isAnonymous) {
      toast.error("Sign in with Google to upgrade.");
      return;
    }

    setLoading(true);

    try {
      // 1. Get subscription id from our backend
      const { subscriptionId, keyId } = await createSubscription();

      // 2. Open Razorpay checkout
      await new Promise<void>((resolve, reject) => {
        if (!window.Razorpay) {
          reject(new Error("Razorpay SDK not loaded. Check your internet connection."));
          return;
        }

        const rzp = new window.Razorpay({
          key: keyId,
          subscription_id: subscriptionId,
          name: "Calorify Pro",
          description: "Unlimited AI food scans",
          theme: { color: "#7C3AED" },
          prefill: {
            name:  user.displayName ?? undefined,
            email: user.email ?? undefined,
          },
          handler: async (response) => {
            // 3. Verify on backend — never trust frontend success claim
            try {
              const ok = await verifyPayment({
                razorpay_payment_id:      response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature:       response.razorpay_signature,
              });

              if (ok) {
                // Optimistically update local state — the onSnapshot listener
                // will confirm from Firestore within seconds
                syncAiQuota(aiScansUsed, aiScansLimit, "pro", "active");
                toast.success("🎉 Welcome to Calorify Pro!");
                onClose();
                resolve();
              } else {
                reject(new Error("Payment verification failed."));
              }
            } catch (err) {
              reject(err);
            }
          },
          modal: {
            ondismiss: () => resolve(), // user closed modal — not an error
          },
        });

        rzp.open();
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upgrade failed. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const freeFeatures = [
    "Manual food tracking",
    "Daily calorie goal",
    "History & streaks",
    `${aiScansLimit} AI food scans`,
  ];

  const proFeatures = [
    "Everything in Free",
    "Unlimited AI food scans",
    "Priority support",
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: "fixed", inset: 0,
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              zIndex: 110,
            }}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{
              position: "fixed",
              bottom: 0, left: 0, right: 0,
              zIndex: 111,
              maxWidth: "512px",
              margin: "0 auto",
              maxHeight: "92dvh",
              display: "flex",
              flexDirection: "column",
              borderRadius: "24px 24px 0 0",
              overflow: "hidden",
              background: "rgba(14, 10, 26, 0.98)",
              border: "1px solid rgba(124,58,237,0.3)",
              backdropFilter: "blur(40px)",
              WebkitBackdropFilter: "blur(40px)",
            }}
          >
            {/* Purple glow at top */}
            <div
              className="absolute top-0 inset-x-0 h-px"
              style={{ background: "linear-gradient(90deg, transparent, #7C3AED, transparent)" }}
            />

            {/* ── Header ── */}
            <div style={{
              padding: "24px 24px 0",
              flexShrink: 0,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
            }}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">✨</span>
                  <h2 className="font-display font-bold text-xl text-white">
                    Upgrade to Pro
                  </h2>
                </div>
                <p className="text-white/40 text-sm font-body">
                  You've used{" "}
                  <span className="text-violet-400 font-semibold">
                    {aiScansUsed} / {aiScansLimit}
                  </span>{" "}
                  free AI scans
                </p>
              </div>
              <button
                onClick={onClose}
                style={{ color: "rgba(255,255,255,0.3)", fontSize: 22, background: "none", border: "none", cursor: "pointer", padding: "4px", lineHeight: 1, flexShrink: 0 }}
              >
                ×
              </button>
            </div>

            {/* ── Scrollable content ── */}
            <div style={{
              flex: 1,
              overflowY: "auto",
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              WebkitOverflowScrolling: "touch",
            }}>
              {/* Progress bar */}
              <div className="glass rounded-2xl p-4">
                <div className="flex justify-between text-xs font-body mb-2">
                  <span className="text-white/50">AI scans used</span>
                  <span className="text-violet-400 font-semibold">{aiScansUsed}/{aiScansLimit}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg, #7C3AED, #A78BFA)" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((aiScansUsed / aiScansLimit) * 100, 100)}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* Plan comparison */}
              <div className="grid grid-cols-2 gap-3">
                {/* Free */}
                <div className="glass rounded-2xl p-4">
                  <div className="text-xs font-body font-semibold text-white/40 uppercase tracking-wider mb-3">
                    Free
                  </div>
                  <div className="space-y-2">
                    {freeFeatures.map((f) => (
                      <div key={f} className="flex items-start gap-2">
                        <CheckIcon />
                        <span className="text-xs text-white/60 font-body leading-tight">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pro */}
                <div
                  className="rounded-2xl p-4 relative overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, rgba(124,58,237,0.25), rgba(167,139,250,0.1))",
                    border: "1px solid rgba(124,58,237,0.5)",
                  }}
                >
                  {/* "Best" badge */}
                  <div
                    className="absolute top-0 right-0 text-[10px] font-body font-bold px-2 py-1"
                    style={{
                      background: "linear-gradient(135deg, #7C3AED, #A78BFA)",
                      borderRadius: "0 12px 0 12px",
                    }}
                  >
                    PRO
                  </div>

                  <div className="text-xs font-body font-semibold text-violet-300 uppercase tracking-wider mb-1">
                    Pro
                  </div>
                  <div className="font-display font-bold text-white mb-3">
                    ₹149
                    <span className="text-xs font-body text-white/40 font-normal">/mo</span>
                  </div>

                  <div className="space-y-2">
                    {proFeatures.map((f) => (
                      <div key={f} className="flex items-start gap-2">
                        <CheckIcon />
                        <span className="text-xs text-white/80 font-body leading-tight">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Trust signals */}
              <div className="flex items-center justify-center gap-6">
                {[
                  { icon: "🔒", label: "Secure payment" },
                  { icon: "🔄", label: "Cancel anytime" },
                  { icon: "⚡", label: "Instant access" },
                ].map((item) => (
                  <div key={item.label} className="flex flex-col items-center gap-1">
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-[10px] text-white/30 font-body">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── CTA (pinned) ── */}
            <div style={{
              flexShrink: 0,
              padding: "12px 24px",
              paddingBottom: "max(20px, env(safe-area-inset-bottom, 20px))",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(14, 10, 26, 0.98)",
            }}>
              <button
                onClick={handleUpgrade}
                disabled={loading || isPro}
                className="w-full py-4 rounded-2xl font-display font-bold text-base text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                style={{
                  background: isPro
                    ? "rgba(16,185,129,0.3)"
                    : "linear-gradient(135deg, #7C3AED, #9333EA)",
                  boxShadow: isPro ? "none" : "0 0 30px rgba(124,58,237,0.4)",
                }}
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Opening checkout…
                  </>
                ) : isPro ? (
                  "✓ You're already Pro"
                ) : (
                  "Upgrade to Pro — ₹149/month"
                )}
              </button>

              <p className="text-center text-white/20 text-[11px] font-body mt-2">
                Powered by Razorpay · Cancel anytime from your account
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
