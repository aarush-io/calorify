import { useState } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { useAppStore, DraftFoodItem } from "../../store/appStore";
import { FoodItem } from "../../services/firebase";
import DraftFoodRow from "./DraftFoodRow";
import FoodItemRow from "./FoodItemRow";
import AddFoodModal from "./AddFoodModal";

interface Props {
  isEditing:       boolean;
  draftFoods:      DraftFoodItem[];
  committing:      boolean;
  onStartEdit:     () => void;
  onDone:          () => Promise<void>;
  onCancel:        () => void;
  onMarkDelete:    (id: string) => void;
  onAddToDraft:    (food: Omit<FoodItem, "id" | "createdAt" | "order">) => void;
  onUpdateInDraft: (id: string, updates: Partial<FoodItem>) => void;
  onReorderDraft:  (reordered: DraftFoodItem[]) => void;
}

export default function FoodChecklist({
  isEditing, draftFoods, committing,
  onStartEdit, onDone, onCancel,
  onMarkDelete, onAddToDraft, onUpdateInDraft, onReorderDraft,
}: Props) {
  const { foods, foodsLoading } = useAppStore();
  const [showAddModal, setShowAddModal] = useState(false);

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
      {/* ── Section header ── */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-base text-white/80">
          {isEditing ? "Editing Foods" : "Today's Checklist"}
        </h2>

        <div className="flex gap-2">
          {isEditing && (
            <>
              {/* Add button */}
              <button
                onClick={() => setShowAddModal(true)}
                disabled={committing}
                className="glass text-xs px-3 py-1.5 rounded-xl text-violet-400 font-body font-medium flex items-center gap-1 disabled:opacity-40"
              >
                + Add
              </button>
              {/* Cancel button */}
              <button
                onClick={onCancel}
                disabled={committing}
                className="glass text-xs px-3 py-1.5 rounded-xl text-white/40 font-body font-medium disabled:opacity-40"
              >
                Cancel
              </button>
            </>
          )}

          {/* Edit / Done toggle */}
          <button
            onClick={isEditing ? onDone : onStartEdit}
            disabled={committing}
            className={`text-xs px-3 py-1.5 rounded-xl font-body font-medium transition-all disabled:opacity-60 ${
              isEditing ? "bg-violet-600 text-white" : "glass text-white/40"
            }`}
          >
            {committing ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving…
              </span>
            ) : isEditing ? "Done" : "Edit"}
          </button>
        </div>
      </div>

      {/* ── Food list ── */}
      <AnimatePresence>
        {isEditing ? (
          // Draft list — Reorder.Group only contains non-pendingDelete items
          // so that deleted items don't affect drag positions
          <Reorder.Group
            axis="y"
            values={draftFoods}
            onReorder={onReorderDraft}
            className="space-y-2"
          >
            {draftFoods.map((food) => (
              <Reorder.Item
                key={food.id}
                value={food}
                // Disable drag for pendingDelete items
                dragListener={!food.pendingDelete}
              >
                <DraftFoodRow
                  food={food}
                  onMarkDelete={onMarkDelete}
                  onUpdate={onUpdateInDraft}
                />
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

      {/* Empty state */}
      {!isEditing && foods.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <div className="text-4xl mb-3">🍽️</div>
          <p className="text-white/40 font-body text-sm">No foods yet.</p>
          <button
            onClick={() => { onStartEdit(); setShowAddModal(true); }}
            className="mt-3 text-violet-400 text-sm font-medium"
          >
            Add your first food →
          </button>
        </motion.div>
      )}

      {/* Add food modal — calls onAddToDraft instead of the store directly */}
      <AddFoodModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={onAddToDraft}
        draftMode={isEditing}
      />
    </div>
  );
}
