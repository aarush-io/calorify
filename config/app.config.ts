// ============================================================
// 🎯 CALORIE PWA — SINGLE SOURCE OF TRUTH CONFIG
// Every setting in here drives the entire app's UI & logic.
// ============================================================

export const APP_CONFIG = {
  // ─── App Identity ──────────────────────────────────────────
  app: {
    name: "Calorify",
    tagline: "Your daily nutrition ritual",
    version: "1.0.0",
    author: "Your Name",
  },

  // ─── Diet Goal ─────────────────────────────────────────────
  diet: {
    dailyCalorieGoal: 2000,
    unit: "kcal" as "kcal" | "kJ",
    weightUnit: "kg" as "kg" | "lbs",
    volumeUnit: "ml" as "ml" | "fl oz",
    // Time to reset the daily checklist (24h format, local time)
    resetTime: "00:00",
  },

  // ─── Default Food Items ────────────────────────────────────
  // These populate Firestore on first-run for a new user.
  // The app reads from Firestore after that (user-editable).
  defaultFoods: [
    { name: "Oatmeal with berries", calories: 320, defaultChecked: false, emoji: "🥣", category: "Breakfast" },
    { name: "Greek yogurt", calories: 150, defaultChecked: false, emoji: "🥛", category: "Breakfast" },
    { name: "Banana", calories: 90, defaultChecked: false, emoji: "🍌", category: "Snack" },
    { name: "Grilled chicken breast", calories: 280, defaultChecked: false, emoji: "🍗", category: "Lunch" },
    { name: "Brown rice (1 cup)", calories: 215, defaultChecked: false, emoji: "🍚", category: "Lunch" },
    { name: "Steamed broccoli", calories: 55, defaultChecked: false, emoji: "🥦", category: "Lunch" },
    { name: "Almonds (30g)", calories: 170, defaultChecked: false, emoji: "🥜", category: "Snack" },
    { name: "Salmon fillet", calories: 310, defaultChecked: false, emoji: "🐟", category: "Dinner" },
    { name: "Sweet potato", calories: 130, defaultChecked: false, emoji: "🍠", category: "Dinner" },
    { name: "Mixed salad", calories: 80, defaultChecked: false, emoji: "🥗", category: "Dinner" },
  ],

  // ─── Theme ─────────────────────────────────────────────────
  theme: {
    primary: "#7C3AED",       // violet-600
    primaryLight: "#A78BFA",  // violet-400
    accent: "#F59E0B",        // amber-500
    success: "#10B981",       // emerald-500
    danger: "#EF4444",        // red-500
    background: "#0A0A0F",    // near-black
    surface: "rgba(255,255,255,0.04)",
    glassBorder: "rgba(255,255,255,0.08)",
    textPrimary: "#F8FAFC",
    textSecondary: "#94A3B8",
  },

  // ─── Feature Flags ─────────────────────────────────────────
  features: {
    analytics: false,     // Firebase Analytics
    streaks: true,        // Consecutive day streak tracking
    reminders: true,      // Push notification reminders
    weightTracking: true, // Bodyweight log & graph
    guestMode: true,      // Anonymous auth without Google
    darkModeOnly: true,   // Force dark mode (glassmorphism)
  },

  // ─── Cloud Provider ────────────────────────────────────────
  cloud: {
    provider: "firebase" as "firebase" | "supabase",
    // Firebase config is read from .env.local — see README
    enableOfflinePersistence: true,
    syncDebounceMs: 800,
  },

  // ─── PWA ───────────────────────────────────────────────────
  pwa: {
    themeColor: "#0A0A0F",
    backgroundColor: "#0A0A0F",
    display: "standalone" as const,
    orientation: "portrait" as const,
    categories: ["health", "lifestyle"],
    shortcuts: [
      { name: "Today's Checklist", url: "/", description: "Open today's food checklist" },
      { name: "History", url: "/history", description: "View past days" },
    ],
  },

  // ─── Streak Settings ───────────────────────────────────────
  streaks: {
    // Must reach at least this % of goal to count the day
    completionThreshold: 0.9,
    milestones: [3, 7, 14, 30, 60, 100],
  },

  // ─── Reminder Times ────────────────────────────────────────
  reminders: {
    morning: "08:00",
    evening: "20:00",
    message: "Don't forget to log your meals! 🥗",
  },
} as const;

export type AppConfig = typeof APP_CONFIG;
export type FoodItem = (typeof APP_CONFIG.defaultFoods)[number] & { id: string; order: number };
