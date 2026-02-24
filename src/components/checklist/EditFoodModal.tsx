import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FoodItem } from "../../services/firebase";
import { useAppStore } from "../../store/appStore";
import toast from "react-hot-toast";

const EMOJIS = ["🥗","🍗","🥩","🐟","🥚","🥛","🧀","🍳","🥞","🥣","🍌","🍎","🍇","🥦","🥕","🍠","🍚","🍞","🥜","🫘","🍵","☕"];
const CATEGORIES = ["Breakfast", "Lunch", "Dinner", "Snack", "Drink", "Supplement"];

interface Props {
  food: FoodItem;
  open: boolean;
  onClose: () => void;
}

export default function EditFoodModal({ food, open, onClose }: Props) {
  const { updateFoodItem } = useAppStore();
  const [name, setName] = useState(food.name);
  const [calories, setCalories] = useState(String(food.calories));
  const [emoji, setEmoji] = useState(food.emoji);
  const [category, setCategory] = useState(food.category);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(food.name);
      setCalories(String(food.calories));
      setEmoji(food.emoji);
      setCategory(food.category);
    }
  }, [open, food]);

  const handleSave = async () => {
    if (!name.trim()) return toast.error("Enter a food name");
    const cal = parseInt(calories);
    if (isNaN(cal) || cal < 0) return toast.error("Enter valid calories");

    setSaving(true);
    try {
      await updateFoodItem(food.id, { name: name.trim(), calories: cal, emoji, category });
      toast.success("Food updated!");
      onClose();
    } catch {
      toast.error("Failed to update");
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
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 inset-x-0 z-50 max-w-lg mx-auto px-4"
            style={{ maxHeight: "90dvh" }}
          >
            <div
              className="glass-strong rounded-3xl flex flex-col"
              style={{ maxHeight: "90dvh" }}
            >
              {/* ── Fixed header ── */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
                <h3 className="font-display font-bold text-lg">Edit Food</h3>
                <button
                  onClick={onClose}
                  className="text-white/30 hover:text-white/70 text-2xl leading-none"
                >
                  ×
                </button>
              </div>

              {/* ── Scrollable content ── */}
              <div className="flex-1 overflow-y-auto px-6 space-y-5 pb-2">
                {/* Emoji picker */}
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

                {/* Name */}
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Food name"
                  className="w-full glass rounded-2xl px-4 py-3 text-sm font-body text-white placeholder-white/20 outline-none border border-transparent focus:border-violet-500/50 transition-colors"
                />

                {/* Calories */}
                <input
                  type="number"
                  inputMode="numeric"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  placeholder="Calories"
                  className="w-full glass rounded-2xl px-4 py-3 text-sm font-body text-white placeholder-white/20 outline-none border border-transparent focus:border-violet-500/50 transition-colors"
                />

                {/* Category */}
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

              {/* ── Sticky action bar ── */}
              <div
                className="flex-shrink-0 px-6 pt-3"
                style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}
              >
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full btn-primary py-4 text-sm font-semibold"
                >
                  {saving && (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  Save Changes
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
