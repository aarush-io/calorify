import { useState } from "react";
import { motion } from "framer-motion";
import { FoodItem } from "../../services/firebase";
import { DraftFoodItem } from "../../store/appStore";
import EditFoodModal from "./EditFoodModal";

interface Props {
  food:         DraftFoodItem;
  onMarkDelete: (id: string) => void;
  onUpdate:     (id: string, updates: Partial<FoodItem>) => void;
}

const DragHandle = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-white/20">
    <circle cx="9"  cy="5"  r="1" fill="currentColor" />
    <circle cx="9"  cy="12" r="1" fill="currentColor" />
    <circle cx="9"  cy="19" r="1" fill="currentColor" />
    <circle cx="15" cy="5"  r="1" fill="currentColor" />
    <circle cx="15" cy="12" r="1" fill="currentColor" />
    <circle cx="15" cy="19" r="1" fill="currentColor" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-4 h-4">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/>
    <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
  </svg>
);

const UndoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-4 h-4">
    <path d="M3 10h10a4 4 0 010 8H7"/>
    <polyline points="3 6 3 10 7 10"/>
  </svg>
);

const EditIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-4 h-4">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

export default function DraftFoodRow({ food, onMarkDelete, onUpdate }: Props) {
  const [showEditModal, setShowEditModal] = useState(false);

  const isPendingDelete = !!food.pendingDelete;
  const isPendingAdd    = !!food.pendingAdd;

  return (
    <>
      <motion.div
        layout
        animate={{ opacity: isPendingDelete ? 0.35 : 1 }}
        transition={{ duration: 0.2 }}
        className="food-row select-none"
        style={{
          // Pending-add glow to signal "not yet saved"
          boxShadow: isPendingAdd && !isPendingDelete
            ? "0 0 0 1px rgba(167,139,250,0.5), 0 0 12px rgba(124,58,237,0.2)"
            : undefined,
          // Disable pointer events for items marked for deletion
          pointerEvents: isPendingDelete ? "none" : undefined,
        }}
      >
        {/* Drag handle — only when not pendingDelete */}
        <div className={`cursor-grab active:cursor-grabbing touch-none ${isPendingDelete ? "invisible" : ""}`}>
          <DragHandle />
        </div>

        {/* Emoji */}
        <span className="text-2xl flex-shrink-0 leading-none" style={{ filter: isPendingDelete ? "grayscale(1)" : undefined }}>
          {food.emoji}
        </span>

        {/* Name + badges */}
        <div className="flex-1 min-w-0">
          <p
            className="font-body font-medium text-sm leading-tight truncate"
            style={{
              color: isPendingDelete ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.9)",
              textDecoration: isPendingDelete ? "line-through" : undefined,
            }}
          >
            {food.name}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-xs text-white/25 font-body">{food.category}</p>
            {isPendingAdd && (
              <span className="text-xs font-body font-medium px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(124,58,237,0.3)", color: "rgba(167,139,250,0.9)", fontSize: "10px" }}>
                new
              </span>
            )}
            {isPendingDelete && (
              <span className="text-xs font-body font-medium px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(239,68,68,0.2)", color: "rgba(248,113,113,0.8)", fontSize: "10px" }}>
                removing
              </span>
            )}
          </div>
        </div>

        {/* Calories */}
        <div className="flex-shrink-0 text-right">
          <span
            className="calorie-number font-semibold text-sm"
            style={{ color: isPendingDelete ? "rgba(255,255,255,0.2)" : "var(--primary-light)" }}
          >
            {food.calories}
          </span>
          <span className="text-xs text-white/30 ml-0.5">kcal</span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Edit only for non-deleted items */}
          {!isPendingDelete && (
            <button
              onClick={() => setShowEditModal(true)}
              className="glass w-8 h-8 rounded-xl flex items-center justify-center text-white/40 hover:text-violet-400 transition-colors"
            >
              <EditIcon />
            </button>
          )}

          {/* Trash toggles pendingDelete; undo icon restores */}
          <button
            onClick={() => onMarkDelete(food.id)}
            className={`glass w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
              isPendingDelete
                ? "text-amber-400 hover:text-amber-300"
                : "text-white/40 hover:text-red-400"
            }`}
            title={isPendingDelete ? "Undo remove" : "Remove"}
          >
            {isPendingDelete ? <UndoIcon /> : <TrashIcon />}
          </button>
        </div>
      </motion.div>

      {/* EditFoodModal operates on draft — calls onUpdate instead of Firestore */}
      <EditFoodModal
        food={food}
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={(updates) => {
          onUpdate(food.id, updates);
          setShowEditModal(false);
        }}
      />
    </>
  );
}
