# 🥗 Calorify — Production-Ready Calorie Checklist PWA

A mobile-first, installable PWA for tracking your daily calorie intake with a glassmorphism dark UI.

---

## 📁 Folder Structure

```
calorify-pwa/
├── config/
│   └── app.config.ts          ← 🎯 SINGLE CONFIG FILE — controls everything
├── public/
│   ├── favicon.svg
│   ├── pwa-192x192.png        ← Add your own icons
│   └── pwa-512x512.png
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   └── AuthScreen.tsx
│   │   ├── checklist/
│   │   │   ├── ProgressCard.tsx
│   │   │   ├── FoodChecklist.tsx
│   │   │   ├── FoodItemRow.tsx
│   │   │   ├── AddFoodModal.tsx
│   │   │   └── EditFoodModal.tsx
│   │   ├── layout/
│   │   │   └── AppShell.tsx
│   │   └── ui/
│   │       ├── LoadingScreen.tsx
│   │       └── CelebrationOverlay.tsx
│   ├── pages/
│   │   ├── TodayPage.tsx
│   │   ├── HistoryPage.tsx
│   │   ├── WeightPage.tsx
│   │   └── SettingsPage.tsx
│   ├── services/
│   │   └── firebase.ts        ← All Firebase logic
│   ├── store/
│   │   └── appStore.ts        ← Zustand store
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── vite.config.ts
├── tailwind.config.js
├── package.json
└── .env.example
```

---

## ⚙️ Setup Steps

### 1. Clone & Install

```bash
git clone <your-repo>
cd calorify-pwa
npm install
```

### 2. Firebase Project Setup

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project (or use existing)
3. Enable these services:
   - **Authentication** → Sign-in methods → Enable **Google** and **Anonymous**
   - **Firestore Database** → Create in production mode
   - **Hosting** → Get started

4. Register a Web App in your Firebase project
5. Copy the config values

### 3. Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```bash
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234:web:abc123
```

### 4. Configure Firestore Rules

```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # Select your project, use existing files
firebase deploy --only firestore:rules,firestore:indexes
```

### 5. Run Locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 🔧 Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_FIREBASE_API_KEY` | ✅ | Firebase Web API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | ✅ | `project-id.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | ✅ | Your Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | ✅ | `project-id.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ✅ | Numeric sender ID |
| `VITE_FIREBASE_APP_ID` | ✅ | Web app ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | ❌ | Analytics (if enabled) |

---

## 🎯 How `config/app.config.ts` Controls the App

The config is the **single source of truth**. Here's what each section does:

### `app` — Identity
```ts
app: {
  name: "Calorify",        // → Displayed in header, PWA manifest, loading screen
  tagline: "...",          // → Shown under the app name
  version: "1.0.0",       // → Shown in Settings page
}
```

### `diet` — Nutrition Goals
```ts
diet: {
  dailyCalorieGoal: 2000,  // → Progress ring target, completion detection
  unit: "kcal",            // → Shown throughout the UI
  weightUnit: "kg",        // → Weight tracking page & logs
  resetTime: "00:00",      // → (Future) Scheduled daily reset
}
```

### `defaultFoods` — Seed Data
```ts
defaultFoods: [
  { name: "Oatmeal", calories: 320, emoji: "🥣", category: "Breakfast", defaultChecked: false },
  // ...
]
```
- **Only used on first login** to seed Firestore for a new user
- After that, the user's Firestore copy is authoritative
- Users can add/edit/delete/reorder via the Edit Mode UI

### `theme` — Visual Design Tokens
```ts
theme: {
  primary: "#7C3AED",      // → Progress ring, checkboxes, buttons, glow
  accent: "#F59E0B",       // → Streak badges, gold text
  success: "#10B981",      // → Completed state colors
}
```
(Currently injected as CSS variables — to make dynamic, use a ThemeProvider)

### `features` — Feature Flags
```ts
features: {
  streaks: true,           // → Shows streak counter in header; if false, hides it
  weightTracking: true,    // → Shows Weight tab in bottom nav; if false, tab disappears
  guestMode: true,         // → Shows "Continue as Guest" button on auth screen
  analytics: false,        // → Enables Firebase Analytics (set measurement ID too)
}
```
Each flag is checked at the component/routing level — disabling removes the feature from the UI entirely.

### `streaks` — Streak Logic
```ts
streaks: {
  completionThreshold: 0.9,  // → 90% of goal = counts as completed day
  milestones: [3, 7, 14, 30, 60, 100],  // → (Future) Milestone notifications
}
```

### `pwa` — PWA Manifest
```ts
pwa: {
  themeColor: "#0A0A0F",   // → Browser chrome color on mobile
  display: "standalone",   // → Hides browser UI when installed
}
```
These values are injected directly into the Vite PWA plugin's manifest generation.

### `cloud` — Backend Settings
```ts
cloud: {
  provider: "firebase",         // → (Future: swap to "supabase")
  enableOfflinePersistence: true, // → IndexedDB offline cache
  syncDebounceMs: 800,          // → (Future) Debounce rapid saves
}
```

---

## 🗃️ Data Model

### Firestore Structure

```
users/{uid}
  ├── displayName: string
  ├── createdAt: timestamp
  ├── settings: {
  │     dailyCalorieGoal: number
  │     notifications: boolean
  │     reminderMorning: string
  │     reminderEvening: string
  │     weightUnit: string
  │   }
  ├── foods/{foodId}
  │     ├── name: string
  │     ├── calories: number
  │     ├── emoji: string
  │     ├── category: string
  │     ├── order: number
  │     └── createdAt: timestamp
  └── dailyLogs/{YYYY-MM-DD}
        ├── date: string
        ├── checkedFoods: string[]   ← array of food IDs
        ├── totalCalories: number
        ├── completed: boolean
        ├── completionPercent: number
        ├── weight?: number
        └── updatedAt: timestamp
```

---

## 🚀 Deployment

### Firebase Hosting

```bash
# Build
npm run build

# Deploy everything
firebase deploy

# Or just hosting
firebase deploy --only hosting
```

Your app will be live at:
- `https://your-project-id.web.app`
- `https://your-project-id.firebaseapp.com`

### Custom Domain

In Firebase Console → Hosting → Add custom domain → follow DNS instructions.

---

## 📱 PWA Icons

Generate icons for all sizes using [realfavicongenerator.net](https://realfavicongenerator.net) or [pwabuilder.com](https://www.pwabuilder.com/imageGenerator).

Required files in `/public/`:
```
pwa-64x64.png
pwa-192x192.png
pwa-512x512.png
maskable-icon-512x512.png   ← Important for Android home screen
apple-touch-icon.png        ← iOS home screen icon
```

---

## 🏗️ Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| **Cloud** | Firebase | Realtime listeners, offline persistence, free tier, all-in-one |
| **State** | Zustand | Minimal boilerplate, works great with Firebase subscriptions |
| **Animations** | Framer Motion | Best-in-class for React, handles reorder/drag natively |
| **Routing** | React Router v6 | Lazy loading with `lazy()` + `Suspense` |
| **Styling** | Tailwind + CSS vars | Utility speed + dynamic theming via CSS variables |

---

## 🔮 Extending the App

### Add a new feature flag
1. Add to `APP_CONFIG.features` in `config/app.config.ts`
2. Reference it in components: `APP_CONFIG.features.yourFeature`
3. Gate the UI: `{APP_CONFIG.features.yourFeature && <YourComponent />}`

### Add a new food category
Edit `defaultFoods` in `config/app.config.ts` — this only affects new users.
Existing users add foods via the Edit Mode UI.

### Change the color scheme
Edit the `theme` object in config. Then update the CSS variables in `src/index.css` `:root` block to match.

### Switch to Supabase
1. Change `cloud.provider` to `"supabase"` in config
2. Create `src/services/supabase.ts` mirroring the Firebase service API
3. Update imports in `App.tsx` and `appStore.ts`

---

## 🐛 Troubleshooting

**"FirebaseError: Missing or insufficient permissions"**
→ Deploy Firestore rules: `firebase deploy --only firestore:rules`

**PWA not installable**
→ Must be served over HTTPS. Firebase Hosting handles this automatically.

**Offline not working in dev**
→ PWA service worker is disabled in dev by default. Test with `npm run build && npm run preview`.

**Foods not loading**
→ Check that Firestore indexes are deployed: `firebase deploy --only firestore:indexes`
