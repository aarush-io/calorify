import { useState } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { useAppStore } from "../../store/appStore";
import FoodItemRow from "./FoodItemRow";
import AddFoodModal from "./AddFoodModal";

export default function FoodChecklist() {
  const { foods, foodsLoading, editMode, setEditMode, reorderFoodItems } = useAppStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [localFoods, setLocalFoods] = useState(foods);

  // Sync local order from store
  if (!editMode && localFoods !== foods) setLocalFoods(foods);

  const handleReorderEnd = () => {
    reorderFoodItems(localFoods);
  };

  if (foodsLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton h-16 rounded-2xl" style={{ animationDelay: `${i * 100}ms` }} />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-base text-white/80">
          {editMode ? "Editing Foods" : "Today's Checklist"}
        </h2>
        <div className="flex gap-2">
          {editMode && (
            <button
              onClick={() => setShowAddModal(true)}
              className="glass text-xs px-3 py-1.5 rounded-xl text-violet-400 font-body font-medium flex items-center gap-1"
            >
              + Add
            </button>
          )}
          <button
            onClick={() => setEditMode(!editMode)}
            className={`text-xs px-3 py-1.5 rounded-xl font-body font-medium transition-all ${
              editMode
                ? "bg-violet-600 text-white"
                : "glass text-white/40"
            }`}
          >
            {editMode ? "Done" : "Edit"}
          </button>
        </div>
      </div>

      {/* Food list */}
      <AnimatePresence>
        {editMode ? (
          <Reorder.Group
            axis="y"
            values={localFoods}
            onReorder={setLocalFoods}
            onMouseUp={handleReorderEnd}
            onTouchEnd={handleReorderEnd}
            className="space-y-2"
          >
            {localFoods.map((food) => (
              <Reorder.Item key={food.id} value={food}>
                <FoodItemRow food={food} editMode />
              </Reorder.Item>
            ))}
          </Reorder.Group>
        ) : (
          <div className="space-y-2">
            {foods.map((food, i) => (
              <motion.div
                key={food.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <FoodItemRow food={food} editMode={false} />
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {foods.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <div className="text-4xl mb-3">🍽️</div>
          <p className="text-white/40 font-body text-sm">No foods yet.</p>
          <button
            onClick={() => { setEditMode(true); setShowAddModal(true); }}
            className="mt-3 text-violet-400 text-sm font-medium"
          >
            Add your first food →
          </button>
        </motion.div>
      )}

      <AddFoodModal open={showAddModal} onClose={() => setShowAddModal(false)} />
    </div>
  );
}
