import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";

import { useAppStore, DraftFoodItem } from "../store/appStore";
import { FoodItem } from "../services/firebase";

import ProgressCard from "../components/checklist/ProgressCard";
import FoodChecklist from "../components/checklist/FoodChecklist";

// ✅ AI (self-contained)
import ScanButton from "../components/ai/ScanButton";
import { useAiScan } from "../hooks/useAiScan";

export default function TodayPage() {
  const today = format(new Date(), "EEEE, MMMM d");

  const { foods, commitEditDraft } = useAppStore();

  // ✅ initialize AI system (no destructuring → no type issues)
  useAiScan();

  const [isEditing, setIsEditing]   = useState(false);
  const [draftFoods, setDraftFoods] = useState<DraftFoodItem[]>([]);
  const [committing, setCommitting] = useState(false);

  const handleStartEdit = useCallback(() => {
    setDraftFoods(foods.map((f) => ({ ...f })));
    setIsEditing(true);
  }, [foods]);

  const handleCancel = useCallback(() => {
    setDraftFoods([]);
    setIsEditing(false);
  }, []);

  const handleDone = useCallback(async () => {
    setCommitting(true);
    try {
      await commitEditDraft(draftFoods);
    } finally {
      setDraftFoods([]);
      setIsEditing(false);
      setCommitting(false);
    }
  }, [draftFoods, commitEditDraft]);

  const markDelete = useCallback((id: string) => {
    setDraftFoods((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, pendingDelete: !f.pendingDelete } : f
      )
    );
  }, []);

  const addToDraft = useCallback(
    (food: Omit<FoodItem, "id" | "createdAt" | "order">) => {
      const tempId = `draft_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2)}`;

      setDraftFoods((prev) => [
        ...prev,
        {
          ...food,
          id: tempId,
          order: prev.length,
          pendingAdd: true,
          pendingDelete: false,
        } as DraftFoodItem,
      ]);
    },
    []
  );

  const updateInDraft = useCallback(
    (id: string, updates: Partial<FoodItem>) => {
      setDraftFoods((prev) =>
        prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
      );
    },
    []
  );

  const reorderDraft = useCallback((reordered: DraftFoodItem[]) => {
    setDraftFoods(reordered);
  }, []);

  const activeFoods: FoodItem[] = isEditing
    ? (draftFoods.filter((f) => !f.pendingDelete) as FoodItem[])
    : foods;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="mb-5">
        <p className="text-white/30 text-xs font-body uppercase tracking-widest">
          {today}
        </p>
        <h2 className="font-display font-bold text-2xl text-white mt-0.5">
          Good day! 👋
        </h2>
      </div>

      <ProgressCard activeFoods={activeFoods} />

      {/* ✅ AI BUTTON (safe mount) */}
      {!isEditing && (
        <div className="mt-4 mb-2">
          <ScanButton />
        </div>
      )}

      <FoodChecklist
        isEditing={isEditing}
        draftFoods={draftFoods}
        committing={committing}
        onStartEdit={handleStartEdit}
        onDone={handleDone}
        onCancel={handleCancel}
        onMarkDelete={markDelete}
        onAddToDraft={addToDraft}
        onUpdateInDraft={updateInDraft}
        onReorderDraft={reorderDraft}
      />
    </motion.div>
  );
}
