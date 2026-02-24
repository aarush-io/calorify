import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "../../store/appStore";
import toast from "react-hot-toast";

const EMOJIS = ["🥗","🍗","🥩","🐟","🥚","🥛","🧀","🍳","🥞","🥣","🍌","🍎","🍇","🥦","🥕","🍠","🍚","🍞","🥜","🫘","🍵","☕"];
const CATEGORIES = ["Breakfast", "Lunch", "Dinner", "Snack", "Drink", "Supplement"];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AddFoodModal({ open, onClose }: Props) {
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

    setSaving(true);
    try {
      await addFoodItem({ name: name.trim(), calories: cal, emoji, category, defaultChecked: false });
      toast.success("Food added!");
      reset();
      onClose();
    } catch {
      toast.error("Failed to add food");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 inset-x-0 z-50 max-w-lg mx-auto p-4 pb-safe"
          >
            <div className="glass-strong rounded-3xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-lg">Add Food</h3>
                <button onClick={onClose} className="text-white/30 hover:text-white/70 text-2xl leading-none">×</button>
              </div>

              {/* Emoji picker */}
              <div>
                <label className="text-xs text-white/40 font-body uppercase tracking-wider mb-2 block">Icon</label>
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
                <label className="text-xs text-white/40 font-body uppercase tracking-wider mb-2 block">Name</label>
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
                <label className="text-xs text-white/40 font-body uppercase tracking-wider mb-2 block">Calories (kcal)</label>
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
                <label className="text-xs text-white/40 font-body uppercase tracking-wider mb-2 block">Category</label>
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
