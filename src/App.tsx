import { useEffect, lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { onAuthChange, bootstrapUser } from "./services/firebase";
import { useAppStore } from "./store/appStore";
import AppShell from "./components/layout/AppShell";
import AuthScreen from "./components/auth/AuthScreen";
import LoadingScreen from "./components/ui/LoadingScreen";
import CelebrationOverlay from "./components/ui/CelebrationOverlay";

// Lazy loaded pages
const TodayPage = lazy(() => import("./pages/TodayPage"));
const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const WeightPage = lazy(() => import("./pages/WeightPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));

const PageLoader = () => (
  <div className="flex items-center justify-center h-full min-h-[50vh]">
    <div className="flex gap-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full bg-violet-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  </div>
);

export default function App() {
  const { user, authLoading, setUser, setAuthLoading, initUserData, cleanupSubscriptions, celebrationActive } =
    useAppStore();

  useEffect(() => {
    const unsub = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);

      if (firebaseUser) {
        await bootstrapUser(firebaseUser.uid, firebaseUser.displayName);
        initUserData(firebaseUser.uid);
      } else {
        cleanupSubscriptions();
      }
    });

    return () => unsub();
  }, []);

  if (authLoading) return <LoadingScreen />;
  if (!user) return <AuthScreen />;

  return (
    <>
      {celebrationActive && <CelebrationOverlay />}
      <AppShell>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<TodayPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/weight" element={<WeightPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AppShell>
    </>
  );
}
