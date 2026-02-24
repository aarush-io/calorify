import { initializeApp } from "firebase/app";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  limit,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
  onAuthStateChanged,
  signOut,
  User,
} from "firebase/auth";
import { APP_CONFIG } from "../../config/app.config";
import { format } from "date-fns";

// ── Firebase Init ──────────────────────────────────────────────
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

// Firebase 10+ persistence API — replaces the deprecated enableIndexedDbPersistence().
// persistentLocalCache() enables IndexedDB-backed offline storage so onSnapshot
// replays instantly from cache on refresh, even with no network.
// persistentMultipleTabManager() removes the single-tab restriction that caused
// the old API to silently fail whenever more than one tab was open.
export const db = APP_CONFIG.cloud.enableOfflinePersistence
  ? initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    })
  : getFirestore(app);

export const auth = getAuth(app);

// ── Types ──────────────────────────────────────────────────────
export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  emoji: string;
  category: string;
  order: number;
  defaultChecked: boolean;
  createdAt?: Timestamp;
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  checkedFoods: string[]; // food item IDs
  totalCalories: number;
  completed: boolean;
  completionPercent: number;
  weight?: number;
  updatedAt?: Timestamp;
}

export interface UserSettings {
  dailyCalorieGoal: number;
  notifications: boolean;
  reminderMorning: string;
  reminderEvening: string;
  weightUnit: string;
}

/** Top-level fields stored directly on users/{uid} */
export interface UserProfile {
  displayName: string | null;
  calorieGoal: number;
  weightUnit: string;
  createdAt?: Timestamp;
}

// ── Auth ───────────────────────────────────────────────────────
const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const signInAsGuest = () => signInAnonymously(auth);
export const signOutUser = () => signOut(auth);
export const onAuthChange = (cb: (user: User | null) => void) => onAuthStateChanged(auth, cb);

// ── Helpers ────────────────────────────────────────────────────
const userRef = (uid: string) => doc(db, "users", uid);
const foodsCol = (uid: string) => collection(db, "users", uid, "foods");
const logsCol = (uid: string) => collection(db, "users", uid, "dailyLogs");
const foodDoc = (uid: string, fid: string) => doc(db, "users", uid, "foods", fid);
const logDoc = (uid: string, date: string) => doc(db, "users", uid, "dailyLogs", date);

// ── User Bootstrap ─────────────────────────────────────────────
export async function bootstrapUser(uid: string, displayName: string | null) {
  const ref = userRef(uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    // First-time user — seed user doc + default foods in one batch
    const batch = writeBatch(db);

    batch.set(ref, {
      displayName,
      // calorieGoal lives at the top level — config is only the seed default
      calorieGoal: APP_CONFIG.diet.dailyCalorieGoal,
      weightUnit: APP_CONFIG.diet.weightUnit,
      createdAt: serverTimestamp(),
      // Legacy settings sub-object kept for backwards compat
      settings: {
        dailyCalorieGoal: APP_CONFIG.diet.dailyCalorieGoal,
        notifications: false,
        reminderMorning: APP_CONFIG.reminders.morning,
        reminderEvening: APP_CONFIG.reminders.evening,
        weightUnit: APP_CONFIG.diet.weightUnit,
      },
    });

    APP_CONFIG.defaultFoods.forEach((food, i) => {
      const fRef = doc(foodsCol(uid));
      batch.set(fRef, { ...food, order: i, createdAt: serverTimestamp() });
    });

    await batch.commit();
    return APP_CONFIG.diet.dailyCalorieGoal;
  }

  // Existing user — backfill calorieGoal if the field is absent
  const data = snap.data();
  if (data.calorieGoal === undefined) {
    // Prefer the value that was previously stored under settings
    const backfill: number =
      data.settings?.dailyCalorieGoal ?? APP_CONFIG.diet.dailyCalorieGoal;
    await setDoc(ref, { calorieGoal: backfill }, { merge: true });
    return backfill;
  }

  return data.calorieGoal as number;
}

// ── Foods CRUD ─────────────────────────────────────────────────
export async function getFoods(uid: string): Promise<FoodItem[]> {
  const snap = await getDocs(query(foodsCol(uid), orderBy("order", "asc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FoodItem));
}

export function subscribeFoods(uid: string, cb: (foods: FoodItem[]) => void) {
  return onSnapshot(query(foodsCol(uid), orderBy("order", "asc")), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FoodItem)));
  });
}

export async function addFood(uid: string, food: Omit<FoodItem, "id" | "createdAt">) {
  const ref = doc(foodsCol(uid));
  await setDoc(ref, { ...food, createdAt: serverTimestamp() });
  return ref.id;
}

export async function updateFood(uid: string, fid: string, updates: Partial<FoodItem>) {
  await setDoc(foodDoc(uid, fid), updates, { merge: true });
}

export async function deleteFood(uid: string, fid: string) {
  const { deleteDoc } = await import("firebase/firestore");
  await deleteDoc(foodDoc(uid, fid));
}

export async function reorderFoods(uid: string, foods: FoodItem[]) {
  const batch = writeBatch(db);
  foods.forEach((f, i) => {
    batch.update(foodDoc(uid, f.id), { order: i });
  });
  await batch.commit();
}

// ── Daily Logs ─────────────────────────────────────────────────
export function todayKey(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export async function getLog(uid: string, date: string): Promise<DailyLog | null> {
  const snap = await getDoc(logDoc(uid, date));
  return snap.exists() ? (snap.data() as DailyLog) : null;
}

export function subscribeLog(uid: string, date: string, cb: (log: DailyLog | null) => void) {
  return onSnapshot(logDoc(uid, date), (snap) => {
    cb(snap.exists() ? (snap.data() as DailyLog) : null);
  });
}

export async function saveLog(uid: string, log: Omit<DailyLog, "updatedAt">) {
  // Firestore rejects undefined field values. weight is optional on DailyLog —
  // omit it from the payload entirely when not set rather than spreading undefined.
  const { weight, ...required } = log;
  const payload: Record<string, unknown> = {
    ...required,
    updatedAt: serverTimestamp(),
    ...(weight !== undefined && { weight }),
  };
  await setDoc(logDoc(uid, log.date), payload, { merge: true });
}

export async function getHistory(uid: string, days = 30): Promise<DailyLog[]> {
  const snap = await getDocs(
    query(logsCol(uid), orderBy("date", "desc"), limit(days))
  );
  return snap.docs.map((d) => d.data() as DailyLog);
}

export async function getStreak(uid: string): Promise<number> {
  const logs = await getHistory(uid, 100);
  if (!logs.length) return 0;

  const threshold = APP_CONFIG.streaks.completionThreshold;
  let streak = 0;
  const today = format(new Date(), "yyyy-MM-dd");

  // Sort descending
  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));

  for (let i = 0; i < sorted.length; i++) {
    const log = sorted[i];
    // Skip today if not yet completed
    if (log.date === today && log.completionPercent < threshold) continue;
    if (log.completionPercent >= threshold) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// ── Weight Tracking ────────────────────────────────────────────
export async function logWeight(uid: string, date: string, weight: number) {
  await setDoc(logDoc(uid, date), { weight, updatedAt: serverTimestamp() }, { merge: true });
}

// ── Calorie Goal ───────────────────────────────────────────────

/** Read calorieGoal from Firestore. Returns null if the doc doesn't exist yet. */
export async function fetchCalorieGoal(uid: string): Promise<number | null> {
  const snap = await getDoc(userRef(uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  // Top-level field first; fall back to legacy settings sub-object
  return (data.calorieGoal ?? data.settings?.dailyCalorieGoal ?? null) as number | null;
}

/** Persist calorieGoal to Firestore (merges, never overwrites unrelated fields). */
export async function saveCalorieGoal(uid: string, goal: number): Promise<void> {
  await setDoc(
    userRef(uid),
    { calorieGoal: goal, settings: { dailyCalorieGoal: goal } },
    { merge: true }
  );
}

// ── User Settings ──────────────────────────────────────────────
export async function getUserSettings(uid: string): Promise<UserSettings | null> {
  const snap = await getDoc(userRef(uid));
  return snap.exists() ? (snap.data()?.settings as UserSettings) : null;
}

export async function updateUserSettings(uid: string, settings: Partial<UserSettings>) {
  await setDoc(userRef(uid), { settings }, { merge: true });
}
