import { useEffect, lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { onAuthChange, bootstrapUser } from "./services/firebase";
import { useAppStore } from "./store/appStore";
import AppShell from "./components/layout/AppShell";
import AuthScreen from "./components/auth/AuthScreen";
import LoadingScreen from "./components/ui/LoadingScreen";
import CelebrationOverlay from "./components/ui/CelebrationOverlay";

const TodayPage    = lazy(() => import("./pages/TodayPage"));
const HistoryPage  = lazy(() => import("./pages/HistoryPage"));
const WeightPage   = lazy(() => import("./pages/WeightPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));

const PageLoader = () => (
  <div className="flex items-center justify-center h-full min-h-[50vh]">
    <div className="flex gap-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="w-2 h-2 rounded-full bg-violet-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  </div>
);

function AppRoutes({ celebrationActive }: { celebrationActive: boolean }) {
  return (
    <>
      {celebrationActive && <CelebrationOverlay />}
      <AppShell>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/"         element={<TodayPage />} />
            <Route path="/history"  element={<HistoryPage />} />
            <Route path="/weight"   element={<WeightPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*"         element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AppShell>
    </>
  );
}

export default function App() {
  const {
    user, authLoading,
    setUser, setAuthLoading,
    initUserData, cleanupSubscriptions,
    celebrationActive,
    foods, todayLog,
  } = useAppStore();

  useEffect(() => {
    const unsub = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);

      if (firebaseUser) {
        // bootstrapUser gets/creates the calorieGoal from Firestore.
        // For returning users the UI is already rendered with localStorage
        // cache while this await is in flight — no blank screen.
        const seed = await bootstrapUser(firebaseUser.uid, firebaseUser.displayName);
        initUserData(firebaseUser.uid, seed.calorieGoal, {
          used:   seed.aiScansUsed,
          limit:  seed.aiScansLimit,
          plan:   seed.plan,
          status: seed.subscriptionStatus,
        });
      } else {
        cleanupSubscriptions();
      }
    });

    return () => unsub();
  }, []);

  // ── Render decision tree ───────────────────────────────────────────────────
  //
  // authLoading starts FALSE for returning users (cached uid in localStorage).
  // It is only TRUE on a brand-new install where we have no session hint at all.
  if (authLoading) return <LoadingScreen />;

  // Confirmed logged-in user — normal path.
  if (user) return <AppRoutes celebrationActive={celebrationActive} />;

  // user is null but authLoading is false — two possible situations:
  //
  //   A) WARM LOAD: Firebase hasn't fired onAuthChange yet (takes 1–3s).
  //      The store seeded itself from localStorage so we have real data.
  //      Render the app optimistically — auth will confirm within seconds.
  //      If auth comes back negative, cleanupSubscriptions() + re-render
  //      will land us in case B below.
  //
  //   B) CONFIRMED LOGOUT: onAuthChange fired with null, cleanupSubscriptions()
  //      cleared the localStorage uid cache and reset foods/todayLog to empty.
  //      No cache → show AuthScreen.
  //
  const hasCache = foods.length > 0 || todayLog !== null;
  if (hasCache) return <AppRoutes celebrationActive={celebrationActive} />;

  return <AuthScreen />;
}
