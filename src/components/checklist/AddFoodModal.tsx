import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "../../store/appStore";
import toast from "react-hot-toast";

const EMOJIS = ["🥗","🍗","🥩","🐟","🥚","🥛","🧀","🍳","🥞","🥣","🍌","🍎","🍇","🥦","🥕","🍠","🍚","🍞","🥜","🫘","🍵","☕"];
const CATEGORIES = ["Breakfast", "Lunch", "Dinner", "Snack", "Drink", "Supplement"];

interface Props {
  open:      boolean;
  onClose:   () => void;
  // When provided, food goes into the draft instead of Firestore directly.
  // When absent (e.g. called outside edit mode), falls back to store action.
  onAdd?:    (food: Omit<import("../../services/firebase").FoodItem, "id" | "createdAt" | "order">) => void;
  draftMode?: boolean;
}

export default function AddFoodModal({ open, onClose, onAdd, draftMode }: Props) {
  const { addFoodItem } = useAppStore();
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [emoji, setEmoji] = useState("🥗");
  const [category, setCategory] = useState("Lunch");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName(""); setCalories(""); setEmoji("🥗"); setCategory("Lunch");
  };

  const handleSave = async () => {
    if (!name.trim()) return toast.error("Enter a food name");
    const cal = parseInt(calories);
    if (isNaN(cal) || cal < 0) return toast.error("Enter valid calories");

    const foodData = { name: name.trim(), calories: cal, emoji, category, defaultChecked: false as const };

    if (draftMode && onAdd) {
      // Draft mode — instant local state update, no network call
      onAdd(foodData);
      toast.success("Added to draft — save when done");
      reset();
      onClose();
    } else {
      // Live mode — write directly to Firestore
      setSaving(true);
      try {
        await addFoodItem(foodData);
        toast.success("Food added!");
        reset();
        onClose();
      } catch {
        toast.error("Failed to add food");
      } finally {
        setSaving(false);
      }
    }
  };

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
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.7)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              zIndex: 100,
            }}
          />

          {/*
           * The sheet IS the card — one element.
           * position:fixed + bottom:0 anchors it to the viewport bottom.
           * display:flex + flexDirection:column lets header/scroll/footer
           * each own their slice.
           * maxHeight:90dvh hard-caps the total height.
           * overflow:hidden clips child corners against borderRadius.
           *
           * NOT using Tailwind classes for the critical layout properties
           * because Tailwind's JIT sometimes fails to emit these for
           * dynamically-rendered portals in production builds on mobile.
           */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 101,
              maxWidth: "512px",
              margin: "0 auto",
              maxHeight: "90dvh",
              display: "flex",
              flexDirection: "column",
              borderRadius: "24px 24px 0 0",
              overflow: "hidden",
              background: "rgba(18, 18, 28, 0.97)",
              border: "1px solid rgba(255,255,255,0.1)",
              backdropFilter: "blur(30px)",
              WebkitBackdropFilter: "blur(30px)",
            }}
          >
            {/* ── Header (never scrolls) ── */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "20px 24px 16px",
              flexShrink: 0,
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}>
              <h3 className="font-display font-bold text-lg">Add Food</h3>
              <button
                onClick={onClose}
                style={{ color: "rgba(255,255,255,0.4)", fontSize: 24, lineHeight: 1, background: "none", border: "none", cursor: "pointer", padding: "4px" }}
              >
                ×
              </button>
            </div>

            {/* ── Scrollable content ── */}
            <div style={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              padding: "20px 24px 8px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              // Momentum scrolling on iOS
              WebkitOverflowScrolling: "touch",
            }}>
              {/* Emoji picker */}
              <div>
                <label className="text-xs text-white/40 font-body uppercase tracking-wider mb-2 block">
                  Icon
                </label>
                <div className="flex flex-wrap gap-2">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      onClick={() => setEmoji(e)}
                      className={`w-9 h-9 rounded-xl text-lg transition-all ${
                        emoji === e ? "bg-violet-600" : "glass"
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="text-xs text-white/40 font-body uppercase tracking-wider mb-2 block">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Grilled chicken"
                  className="w-full glass rounded-2xl px-4 py-3 text-sm font-body text-white placeholder-white/20 outline-none focus:border-violet-500/50 border border-transparent transition-colors"
                />
              </div>

              {/* Calories */}
              <div>
                <label className="text-xs text-white/40 font-body uppercase tracking-wider mb-2 block">
                  Calories (kcal)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  placeholder="0"
                  min="0"
                  max="9999"
                  className="w-full glass rounded-2xl px-4 py-3 text-sm font-body text-white placeholder-white/20 outline-none focus:border-violet-500/50 border border-transparent transition-colors"
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-xs text-white/40 font-body uppercase tracking-wider mb-2 block">
                  Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCategory(c)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-body font-medium transition-all ${
                        category === c ? "bg-violet-600 text-white" : "glass text-white/40"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Save button (pinned to bottom, never scrolls) ── */}
            <div style={{
              flexShrink: 0,
              padding: "12px 24px",
              paddingBottom: "max(20px, env(safe-area-inset-bottom, 20px))",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(18, 18, 28, 0.97)",
            }}>
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full btn-primary py-4 text-sm font-semibold"
              >
                {saving ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : null}
                Add {emoji} {name || "Food"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
