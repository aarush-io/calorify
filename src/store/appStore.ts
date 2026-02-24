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
  fetchCalorieGoal,
  saveCalorieGoal,
  todayKey,
} from "../services/firebase";
import { APP_CONFIG } from "../../config/app.config";

// ── localStorage key for guest calorie goal ────────────────────
const GUEST_GOAL_KEY = "calorify_guest_goal";

function readGuestGoal(): number {
  try {
    const raw = localStorage.getItem(GUEST_GOAL_KEY);
    if (raw === null) return APP_CONFIG.diet.dailyCalorieGoal;
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) ? APP_CONFIG.diet.dailyCalorieGoal : parsed;
  } catch {
    return APP_CONFIG.diet.dailyCalorieGoal;
  }
}

function writeGuestGoal(goal: number): void {
  try {
    localStorage.setItem(GUEST_GOAL_KEY, String(goal));
  } catch {
    // localStorage unavailable (private browsing quota, etc.) — silently ignore
  }
}

// ── Types ──────────────────────────────────────────────────────
interface AppState {
  // Auth
  user: User | null;
  authLoading: boolean;

  // User preferences (live, user-specific)
  calorieGoal: number;

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
  initUserData: (uid: string, seedGoal: number) => void;
  cleanupSubscriptions: () => void;

  /** Save a new calorie goal. Persists to Firestore (auth) or localStorage (guest). */
  updateCalorieGoal: (goal: number) => Promise<void>;

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
    // Initialise from localStorage so guest users see their value immediately
    // before auth resolves. Will be overwritten by Firestore value for signed-in users.
    calorieGoal: readGuestGoal(),
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

    // seedGoal is the value returned by bootstrapUser — already read from / written
    // to Firestore so we don't need a second round-trip here.
    initUserData: (uid, seedGoal) => {
      const { _unsubFoods, _unsubLog } = get();
      _unsubFoods?.();
      _unsubLog?.();

      set({ foodsLoading: true, logLoading: true, calorieGoal: seedGoal });

      const today = todayKey();

      // Foods subscription — straightforward, no side-effects needed here.
      // The log subscription below re-derives calories every time it fires,
      // which already covers the case where foods arrive after the log.
      const unsubFoods = subscribeFoods(uid, (foods) => {
        set({ foods, foodsLoading: false });

        // Re-derive and patch local state (not Firestore) if the log has already
        // arrived and its stored derived values are stale relative to the food list.
        // This is a pure state correction — no Firestore write — so it's safe to
        // run on every foods snapshot without risking an infinite loop.
        const { todayLog, calorieGoal: goal } = get();
        if (todayLog && todayLog.checkedFoods.length > 0) {
          const derived = calcLog(foods, todayLog.checkedFoods, goal);
          const needsStateCorrection =
            derived.totalCalories !== todayLog.totalCalories ||
            derived.completionPercent !== todayLog.completionPercent ||
            derived.completed !== todayLog.completed;

          if (needsStateCorrection) {
            set({ todayLog: { ...todayLog, ...derived } });
          }
        }
      });

      const unsubLog = subscribeLog(uid, today, (log) => {
        if (!log) {
          // No document for today yet — clean slate
          set({ todayLog: null, logLoading: false });
          return;
        }

        // Re-derive calories from the current foods list every time the log
        // snapshot fires. This is the key fix: Firestore is the source of truth
        // for checkedFoods, but totalCalories is always computed from the live
        // food catalogue, so stale or corrupted stored values can never persist.
        const { foods, calorieGoal: goal } = get();
        const derived =
          foods.length > 0
            ? calcLog(foods, log.checkedFoods, goal)
            : // Foods not loaded yet — trust what Firestore stored for now;
              // the subscribeFoods callback above will correct state once foods arrive.
              {
                totalCalories: log.totalCalories,
                completionPercent: log.completionPercent,
                completed: log.completed,
              };

        const correctedLog: DailyLog = { ...log, ...derived };
        const prevLog = get().todayLog;
        set({ todayLog: correctedLog, logLoading: false });

        if (correctedLog.completed && !prevLog?.completed) {
          get().triggerCelebration();
        }
      });

      getStreak(uid).then((streak) => set({ streak }));

      set({ _unsubFoods: unsubFoods, _unsubLog: unsubLog });
    },

    cleanupSubscriptions: () => {
      const { _unsubFoods, _unsubLog } = get();
      _unsubFoods?.();
      _unsubLog?.();
      // When signed out, fall back to whatever is in localStorage
      set({ _unsubFoods: null, _unsubLog: null, calorieGoal: readGuestGoal() });
    },

    updateCalorieGoal: async (goal) => {
      const { user } = get();

      // Optimistic — UI reacts before the async write completes
      set({ calorieGoal: goal });

      if (user && !user.isAnonymous) {
        await saveCalorieGoal(user.uid, goal);
      } else {
        // Guest (anonymous or not yet signed in): persist to localStorage
        writeGuestGoal(goal);
      }
    },

    toggleFood: async (foodId) => {
      const { user, foods, todayLog, calorieGoal } = get();
      if (!user) return;

      // ── Guard: foods must be loaded before we can derive calories ──────────
      // If the foods subscription hasn't delivered yet (race on cold load),
      // writing derived values would corrupt the stored totalCalories.
      // We still flip the checkedFoods optimistically but skip the Firestore
      // write of derived fields until we have a valid food list.
      if (foods.length === 0) {
        console.warn("toggleFood called before foods loaded — skipping Firestore write");
        return;
      }

      const today = todayKey();
      const prevChecked = todayLog?.checkedFoods ?? [];
      const isChecked = prevChecked.includes(foodId);

      const newChecked = isChecked
        ? prevChecked.filter((id) => id !== foodId)
        : [...prevChecked, foodId];

      // Derive calories from the authoritative foods list in state.
      // calcLog filters by ID so deleted food IDs in checkedFoods produce 0 contribution
      // rather than crashing.
      const derived = calcLog(foods, newChecked, calorieGoal);

      // Optimistic update — keep existing weight so it isn't overwritten
      set({
        todayLog: {
          date: today,
          checkedFoods: newChecked,
          weight: todayLog?.weight,
          ...derived,
        },
      });

      // Persist to Firestore. merge:true means any fields we DON'T include
      // (e.g. weight set by logBodyWeight) are preserved on the server.
      // We always include checkedFoods + all derived fields together so the
      // document is never left in a partially-written inconsistent state.
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
