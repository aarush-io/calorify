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
  saveCalorieGoal,
  todayKey,
  commitFoodEdits,
  type EditDiff,
} from "../services/firebase";

// ── Draft food type ───────────────────────────────────────────────────────────
// Used only during edit mode — never persisted directly to Firestore.
// pendingAdd:    food was added this session, not yet written to Firestore
// pendingDelete: food is marked for removal, shown at reduced opacity
export interface DraftFoodItem extends FoodItem {
  pendingAdd?:    boolean;
  pendingDelete?: boolean;
}
import { APP_CONFIG } from "../../config/app.config";

// ─────────────────────────────────────────────────────────────────────────────
// localStorage cache helpers
//
// Strategy: on every Firestore snapshot, write a slim cache to localStorage.
// On app start, read that cache synchronously before any network call.
// This gives real data at frame 1 instead of skeletons.
//
// Keys are namespaced per-uid so switching accounts never shows stale data.
// ─────────────────────────────────────────────────────────────────────────────

const LS = {
  uid:   "cfy_uid",
  goal:  "calorify_guest_goal",
  foods: (uid: string) => `cfy_foods_${uid}`,
  log:   (uid: string, date: string) => `cfy_log_${uid}_${date}`,
  goalForUser: (uid: string) => `cfy_goal_${uid}`,
};

function lsGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}

function lsSet(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}

function lsDel(key: string): void {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

function readCachedGoal(uid: string | null): number {
  const key = uid ? LS.goalForUser(uid) : LS.goal;
  try {
    const raw = localStorage.getItem(key) ?? localStorage.getItem(LS.goal);
    if (!raw) return APP_CONFIG.diet.dailyCalorieGoal;
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) ? APP_CONFIG.diet.dailyCalorieGoal : parsed;
  } catch { return APP_CONFIG.diet.dailyCalorieGoal; }
}

function writeCachedGoal(uid: string | null, goal: number): void {
  if (uid) lsSet(LS.goalForUser(uid), goal);
  lsSet(LS.goal, goal); // legacy guest key
}

// ── Seed state synchronously at module load time ──────────────────────────────
// Runs once when JS module is first evaluated, before any React render.
// By the time the first component mounts the store already has real data.
const cachedUid  = lsGet<string>(LS.uid);
const todayDate  = todayKey();
const cachedFoods = cachedUid ? (lsGet<FoodItem[]>(LS.foods(cachedUid)) ?? []) : [];
const cachedLog   = cachedUid ? lsGet<DailyLog>(LS.log(cachedUid, todayDate)) : null;
const cachedGoal  = readCachedGoal(cachedUid);

// ── Types ─────────────────────────────────────────────────────────────────────
interface AppState {
  user: User | null;
  // Only true on first-ever cold install (no cachedUid).
  // Warm loads start false so the UI renders with cached data immediately.
  authLoading: boolean;

  calorieGoal: number;

  foods: FoodItem[];
  foodsLoading: boolean;

  todayLog: DailyLog | null;
  logLoading: boolean;

  history: DailyLog[];
  historyLoading: boolean;

  streak: number;

  editMode: boolean;
  celebrationActive: boolean;
  activeTab: "today" | "history" | "weight" | "settings";

  _unsubFoods: (() => void) | null;
  _unsubLog: (() => void) | null;

  setUser: (user: User | null) => void;
  setAuthLoading: (v: boolean) => void;
  initUserData: (uid: string, seedGoal: number) => void;
  cleanupSubscriptions: () => void;
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
  /** Commit the draft food list to Firestore and update the store in one batch. */
  commitEditDraft: (draft: import("./appStore").DraftFoodItem[]) => Promise<void>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
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

// ── Store ─────────────────────────────────────────────────────────────────────
export const useAppStore = create<AppState>()(
  subscribeWithSelector((set, get) => ({
    user: null,

    // KEY FIX 1: warm loads (returning users) skip the authLoading gate entirely.
    // The full-page LoadingScreen only shows on brand-new installs.
    authLoading: !cachedUid,

    calorieGoal: cachedGoal,

    // KEY FIX 2: seed foods and log from localStorage so components render real
    // data at frame 1. foodsLoading/logLoading are false when cache exists,
    // so skeletons never flash for returning users.
    foods: cachedFoods,
    foodsLoading: cachedFoods.length === 0,

    todayLog: cachedLog,
    logLoading: cachedLog === null,

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

    initUserData: (uid, seedGoal) => {
      const { _unsubFoods, _unsubLog } = get();
      _unsubFoods?.();
      _unsubLog?.();

      // Persist uid so next cold start can skip the authLoading gate
      lsSet(LS.uid, uid);

      // If goal changed on another device, update state + cache now
      if (seedGoal !== get().calorieGoal) {
        set({ calorieGoal: seedGoal });
        writeCachedGoal(uid, seedGoal);
      }

      // KEY FIX 3: only show loading spinners when we truly have no cached data.
      // If localStorage had data, keep those flags false — the cached UI stays
      // visible while Firestore delivers the confirmed snapshot in the background.
      const hasCachedFoods = get().foods.length > 0;
      const hasCachedLog   = get().todayLog !== null;
      set({
        foodsLoading: !hasCachedFoods,
        logLoading:   !hasCachedLog,
      });

      const currentDate = todayKey();

      const unsubFoods = subscribeFoods(uid, (foods) => {
        // Write-through cache on every snapshot
        lsSet(LS.foods(uid), foods);
        set({ foods, foodsLoading: false });

        // Re-derive local state if log arrived first with stale derived values
        const { todayLog, calorieGoal: goal } = get();
        if (todayLog && todayLog.checkedFoods.length > 0) {
          const derived = calcLog(foods, todayLog.checkedFoods, goal);
          const stale =
            derived.totalCalories    !== todayLog.totalCalories ||
            derived.completionPercent !== todayLog.completionPercent ||
            derived.completed         !== todayLog.completed;
          if (stale) set({ todayLog: { ...todayLog, ...derived } });
        }
      });

      const unsubLog = subscribeLog(uid, currentDate, (log) => {
        if (!log) {
          // Firestore has no doc for today.
          if (get().todayLog !== null) {
            // We had a cached log that was never actually persisted — clear it.
            lsDel(LS.log(uid, currentDate));
            set({ todayLog: null, logLoading: false });
          } else {
            set({ logLoading: false });
          }
          return;
        }

        // Re-derive calories from live food list — never trust stored derived values
        const { foods, calorieGoal: goal } = get();
        const derived =
          foods.length > 0
            ? calcLog(foods, log.checkedFoods, goal)
            : { totalCalories: log.totalCalories, completionPercent: log.completionPercent, completed: log.completed };

        const correctedLog: DailyLog = { ...log, ...derived };

        // Write confirmed server data back to localStorage
        lsSet(LS.log(uid, currentDate), correctedLog);

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
      lsDel(LS.uid); // next load will show authLoading again
      set({
        _unsubFoods: null,
        _unsubLog:   null,
        calorieGoal: readCachedGoal(null),
        foods:       [],
        foodsLoading: true,
        todayLog:    null,
        logLoading:  true,
      });
    },

    updateCalorieGoal: async (goal) => {
      const { user } = get();
      set({ calorieGoal: goal });
      writeCachedGoal(user?.uid ?? null, goal);
      if (user && !user.isAnonymous) {
        await saveCalorieGoal(user.uid, goal);
      }
    },

    toggleFood: async (foodId) => {
      const { user, foods, todayLog, calorieGoal } = get();
      if (!user) return;
      if (foods.length === 0) {
        console.warn("toggleFood: foods not loaded yet — skipping write");
        return;
      }

      const currentDate = todayKey();
      const prevChecked = todayLog?.checkedFoods ?? [];
      const isChecked   = prevChecked.includes(foodId);
      const newChecked  = isChecked
        ? prevChecked.filter((id) => id !== foodId)
        : [...prevChecked, foodId];

      const derived = calcLog(foods, newChecked, calorieGoal);

      const optimisticLog: DailyLog = {
        date: currentDate,
        checkedFoods: newChecked,
        weight: todayLog?.weight,
        ...derived,
      };

      // Optimistic update + write-through to localStorage immediately.
      // The user sees their change reflected before the network round-trip.
      set({ todayLog: optimisticLog });
      lsSet(LS.log(user.uid, currentDate), optimisticLog);

      await saveLog(user.uid, {
        date: currentDate,
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
      set({ foods });
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
      const currentDate = todayKey();
      await logWeight(user.uid, currentDate, weight);
      set({
        todayLog: todayLog
          ? { ...todayLog, weight }
          : { date: currentDate, checkedFoods: [], totalCalories: 0, completed: false, completionPercent: 0, weight },
      });
    },

    commitEditDraft: async (draft) => {
      const { user, foods } = get();
      if (!user) return;

      const originalIds  = new Set(foods.map((f) => f.id));
      const draftIds     = new Set(draft.filter((f) => !f.pendingAdd).map((f) => f.id));

      // Foods to delete: originals not present in draft (or flagged pendingDelete)
      const toDelete = draft
        .filter((f) => f.pendingDelete && !f.pendingAdd)
        .map((f) => f.id);

      // Foods to add: flagged pendingAdd (no Firestore id yet — use temp id slot)
      const toAdd = draft
        .filter((f) => f.pendingAdd && !f.pendingDelete)
        .map(({ pendingAdd: _pa, pendingDelete: _pd, id: _id, createdAt: _ca, ...rest }) => rest as Omit<FoodItem, "id" | "createdAt">);

      // Foods to update: survivors whose fields differ from originals
      const origMap = new Map(foods.map((f) => [f.id, f]));
      const toUpdate: EditDiff["toUpdate"] = [];
      draft
        .filter((f) => !f.pendingAdd && !f.pendingDelete && originalIds.has(f.id))
        .forEach((f) => {
          const orig = origMap.get(f.id)!;
          const updates: Partial<FoodItem> = {};
          if (f.name     !== orig.name)     updates.name     = f.name;
          if (f.calories !== orig.calories) updates.calories = f.calories;
          if (f.emoji    !== orig.emoji)    updates.emoji    = f.emoji;
          if (f.category !== orig.category) updates.category = f.category;
          if (Object.keys(updates).length > 0) toUpdate.push({ id: f.id, updates });
        });

      // Survivors in their final display order (excludes pendingDelete + pendingAdd)
      const toReorder = draft.filter((f) => !f.pendingDelete && !f.pendingAdd) as FoodItem[];

      await commitFoodEdits(user.uid, { toAdd, toDelete, toUpdate, toReorder });
      // The Firestore onSnapshot listener will update `foods` in state automatically
    },

    setEditMode:   (v)   => set({ editMode: v }),
    setActiveTab:  (tab) => set({ activeTab: tab }),

    triggerCelebration: () => {
      set({ celebrationActive: true });
      setTimeout(() => set({ celebrationActive: false }), 3500);
    },
  }))
);
