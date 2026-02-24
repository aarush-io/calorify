import { useState } from "react";
import { motion } from "framer-motion";
import { FoodItem } from "../../services/firebase";
import { useAppStore } from "../../store/appStore";
import EditFoodModal from "./EditFoodModal";

interface Props {
  food: FoodItem;
  editMode: boolean;
}

// Drag handle icon
const DragHandle = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-white/20">
    <circle cx="9" cy="5" r="1" fill="currentColor" /><circle cx="9" cy="12" r="1" fill="currentColor" />
    <circle cx="9" cy="19" r="1" fill="currentColor" /><circle cx="15" cy="5" r="1" fill="currentColor" />
    <circle cx="15" cy="12" r="1" fill="currentColor" /><circle cx="15" cy="19" r="1" fill="currentColor" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-4 h-4">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
  </svg>
);

const EditIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-4 h-4">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

export default function FoodItemRow({ food, editMode }: Props) {
  const { todayLog, toggleFood, deleteFoodItem } = useAppStore();
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isChecked = todayLog?.checkedFoods.includes(food.id) ?? false;

  const handleToggle = () => {
    if (!editMode) toggleFood(food.id);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await deleteFoodItem(food.id);
    setDeleting(false);
  };

  return (
    <>
      <motion.div
        layout
        className={`food-row cursor-pointer select-none ${isChecked ? "checked-row" : ""}`}
        onClick={handleToggle}
        style={{ opacity: deleting ? 0.4 : 1 }}
      >
        {/* Drag handle (edit mode) */}
        {editMode && (
          <div className="cursor-grab active:cursor-grabbing touch-none">
            <DragHandle />
          </div>
        )}

        {/* Checkbox (checklist mode) */}
        {!editMode && (
          <div className={`food-checkbox ${isChecked ? "checked" : ""}`}>
            {isChecked && (
              <motion.svg
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                viewBox="0 0 12 10"
                fill="none"
                className="w-3 h-3"
              >
                <polyline points="1,5 4,8 11,1" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </motion.svg>
            )}
          </div>
        )}

        {/* Emoji */}
        <span className="text-2xl flex-shrink-0 leading-none">{food.emoji}</span>

        {/* Name + category */}
        <div className="flex-1 min-w-0">
          <p
            className="font-body font-medium text-sm leading-tight truncate transition-colors"
            style={{ color: isChecked ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.9)" }}
          >
            {isChecked && !editMode ? (
              <span className="line-through">{food.name}</span>
            ) : (
              food.name
            )}
          </p>
          <p className="text-xs text-white/25 font-body mt-0.5">{food.category}</p>
        </div>

        {/* Calories */}
        <div className="flex-shrink-0 text-right">
          <span
            className="calorie-number font-semibold text-sm"
            style={{ color: isChecked ? "var(--success)" : "var(--primary-light)" }}
          >
            {food.calories}
          </span>
          <span className="text-xs text-white/30 ml-0.5">{APP_CONFIG_UNIT}</span>
        </div>

        {/* Edit actions */}
        {editMode && (
          <div className="flex gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowEditModal(true)}
              className="glass w-8 h-8 rounded-xl flex items-center justify-center text-white/40 hover:text-violet-400 transition-colors"
            >
              <EditIcon />
            </button>
            <button
              onClick={handleDelete}
              className="glass w-8 h-8 rounded-xl flex items-center justify-center text-white/40 hover:text-red-400 transition-colors"
              disabled={deleting}
            >
              <TrashIcon />
            </button>
          </div>
        )}
      </motion.div>

      <EditFoodModal food={food} open={showEditModal} onClose={() => setShowEditModal(false)} />
    </>
  );
}

// Tiny helper to avoid importing full config here
const APP_CONFIG_UNIT = "kcal";
