import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { User } from "firebase/auth";
import {
  FoodItem,
  DailyLog,
  subscribeFoods,
  subscribeLog,
  saveLog,
  addFood,
  updateFood,
  deleteFood,
  reorderFoods,
  logWeight,
  getHistory,
  getStreak,
  todayKey,
} from "../services/firebase";
import { APP_CONFIG } from "../../config/app.config";
import { format } from "date-fns";

// ── Types ──────────────────────────────────────────────────────
interface AppState {
  // Auth
  user: User | null;
  authLoading: boolean;

  // Foods
  foods: FoodItem[];
  foodsLoading: boolean;

  // Today's Log
  todayLog: DailyLog | null;
  logLoading: boolean;

  // History
  history: DailyLog[];
  historyLoading: boolean;

  // Streak
  streak: number;

  // UI
  editMode: boolean;
  celebrationActive: boolean;
  activeTab: "today" | "history" | "weight" | "settings";

  // Subscriptions cleanup
  _unsubFoods: (() => void) | null;
  _unsubLog: (() => void) | null;

  // Actions
  setUser: (user: User | null) => void;
  setAuthLoading: (v: boolean) => void;
  initUserData: (uid: string) => void;
  cleanupSubscriptions: () => void;

  toggleFood: (foodId: string) => Promise<void>;
  addFoodItem: (food: Omit<FoodItem, "id" | "order" | "createdAt">) => Promise<void>;
  updateFoodItem: (fid: string, updates: Partial<FoodItem>) => Promise<void>;
  deleteFoodItem: (fid: string) => Promise<void>;
  reorderFoodItems: (foods: FoodItem[]) => Promise<void>;

  loadHistory: () => Promise<void>;
  logBodyWeight: (weight: number) => Promise<void>;

  setEditMode: (v: boolean) => void;
  setActiveTab: (tab: AppState["activeTab"]) => void;
  triggerCelebration: () => void;
}

// ── Helpers ────────────────────────────────────────────────────
function calcLog(
  foods: FoodItem[],
  checkedIds: string[],
  goal: number
): Pick<DailyLog, "totalCalories" | "completed" | "completionPercent"> {
  const totalCalories = foods
    .filter((f) => checkedIds.includes(f.id))
    .reduce((sum, f) => sum + f.calories, 0);
  const completionPercent = Math.min(totalCalories / goal, 1);
  const completed = completionPercent >= APP_CONFIG.streaks.completionThreshold;
  return { totalCalories, completed, completionPercent };
}

// ── Store ──────────────────────────────────────────────────────
export const useAppStore = create<AppState>()(
  subscribeWithSelector((set, get) => ({
    user: null,
    authLoading: true,
    foods: [],
    foodsLoading: true,
    todayLog: null,
    logLoading: true,
    history: [],
    historyLoading: false,
    streak: 0,
    editMode: false,
    celebrationActive: false,
    activeTab: "today",
    _unsubFoods: null,
    _unsubLog: null,

    setUser: (user) => set({ user }),
    setAuthLoading: (v) => set({ authLoading: v }),

    initUserData: (uid) => {
      const { _unsubFoods, _unsubLog } = get();
      _unsubFoods?.();
      _unsubLog?.();

      set({ foodsLoading: true, logLoading: true });

      const today = todayKey();

      const unsubFoods = subscribeFoods(uid, (foods) => {
        set({ foods, foodsLoading: false });
      });

      const unsubLog = subscribeLog(uid, today, (log) => {
        const prevLog = get().todayLog;
        set({ todayLog: log, logLoading: false });

        // Trigger celebration when goal first completed
        if (log?.completed && !prevLog?.completed) {
          get().triggerCelebration();
        }
      });

      // Load streak
      getStreak(uid).then((streak) => set({ streak }));

      set({ _unsubFoods: unsubFoods, _unsubLog: unsubLog });
    },

    cleanupSubscriptions: () => {
      const { _unsubFoods, _unsubLog } = get();
      _unsubFoods?.();
      _unsubLog?.();
      set({ _unsubFoods: null, _unsubLog: null });
    },

    toggleFood: async (foodId) => {
      const { user, foods, todayLog } = get();
      if (!user) return;

      const today = todayKey();
      const prevChecked = todayLog?.checkedFoods ?? [];
      const isChecked = prevChecked.includes(foodId);

      const newChecked = isChecked
        ? prevChecked.filter((id) => id !== foodId)
        : [...prevChecked, foodId];

      const goal = APP_CONFIG.diet.dailyCalorieGoal;
      const derived = calcLog(foods, newChecked, goal);

      // Optimistic update
      set({
        todayLog: {
          date: today,
          checkedFoods: newChecked,
          weight: todayLog?.weight,
          ...derived,
        },
      });

      await saveLog(user.uid, {
        date: today,
        checkedFoods: newChecked,
        ...derived,
        weight: todayLog?.weight,
      });
    },

    addFoodItem: async (food) => {
      const { user, foods } = get();
      if (!user) return;
      await addFood(user.uid, { ...food, order: foods.length });
    },

    updateFoodItem: async (fid, updates) => {
      const { user } = get();
      if (!user) return;
      await updateFood(user.uid, fid, updates);
    },

    deleteFoodItem: async (fid) => {
      const { user } = get();
      if (!user) return;
      await deleteFood(user.uid, fid);
    },

    reorderFoodItems: async (foods) => {
      const { user } = get();
      if (!user) return;
      set({ foods }); // optimistic
      await reorderFoods(user.uid, foods);
    },

    loadHistory: async () => {
      const { user } = get();
      if (!user) return;
      set({ historyLoading: true });
      const history = await getHistory(user.uid, 60);
      set({ history, historyLoading: false });
    },

    logBodyWeight: async (weight) => {
      const { user, todayLog } = get();
      if (!user) return;
      const today = todayKey();
      await logWeight(user.uid, today, weight);
      set({
        todayLog: todayLog
          ? { ...todayLog, weight }
          : {
              date: today,
              checkedFoods: [],
              totalCalories: 0,
              completed: false,
              completionPercent: 0,
              weight,
            },
      });
    },

    setEditMode: (v) => set({ editMode: v }),
    setActiveTab: (tab) => set({ activeTab: tab }),

    triggerCelebration: () => {
      set({ celebrationActive: true });
      setTimeout(() => set({ celebrationActive: false }), 3500);
    },
  }))
);
