import { useState } from "react";
import { motion } from "framer-motion";
import { signInWithGoogle, signInAsGuest } from "../../services/firebase";
import { APP_CONFIG } from "../../../config/app.config";
import toast from "react-hot-toast";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function AuthScreen() {
  const [loading, setLoading] = useState<"google" | "guest" | null>(null);

  const handleGoogle = async () => {
    setLoading("google");
    try {
      await signInWithGoogle();
    } catch (e: any) {
      toast.error(e.message || "Sign in failed");
      setLoading(null);
    }
  };

  const handleGuest = async () => {
    if (!APP_CONFIG.features.guestMode) return;
    setLoading("guest");
    try {
      await signInAsGuest();
    } catch (e: any) {
      toast.error(e.message || "Guest sign in failed");
      setLoading(null);
    }
  };

  return (
    <div className="mesh-bg min-h-dvh flex items-center justify-center p-6">
      {/* Background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, #7C3AED, transparent)" }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: "radial-gradient(circle, #F59E0B, transparent)" }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm relative"
      >
        {/* Logo / hero */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
            className="text-7xl mb-6 inline-block animate-float"
          >
            🥗
          </motion.div>
          <h1 className="font-display text-4xl font-bold text-gradient leading-none mb-2">
            {APP_CONFIG.app.name}
          </h1>
          <p className="text-white/40 font-body text-sm mt-3">
            {APP_CONFIG.app.tagline}
          </p>
        </div>

        {/* Features preview */}
        <div className="glass rounded-3xl p-6 mb-6 space-y-3">
          {[
            { icon: "✅", text: `Track your daily ${APP_CONFIG.diet.dailyCalorieGoal} ${APP_CONFIG.diet.unit} goal` },
            { icon: "📊", text: "View history & progress trends" },
            ...(APP_CONFIG.features.streaks ? [{ icon: "🔥", text: "Build your streak" }] : []),
            ...(APP_CONFIG.features.weightTracking ? [{ icon: "⚖️", text: "Log your weight" }] : []),
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.08 }}
              className="flex items-center gap-3"
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-white/60 text-sm font-body">{item.text}</span>
            </motion.div>
          ))}
        </div>

        {/* Auth buttons */}
        <div className="space-y-3">
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            onClick={handleGoogle}
            disabled={!!loading}
            className="w-full btn-primary py-4 rounded-2xl text-base font-body font-semibold flex items-center justify-center gap-3"
          >
            {loading === "google" ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            Continue with Google
          </motion.button>

          {APP_CONFIG.features.guestMode && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              onClick={handleGuest}
              disabled={!!loading}
              className="w-full btn-ghost py-4 rounded-2xl text-base font-body font-medium text-white/60"
            >
              {loading === "guest" ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : null}
              Continue as Guest
            </motion.button>
          )}
        </div>

        <p className="text-center text-white/20 text-xs mt-6 font-body">
          Your data is private and synced across devices
        </p>
      </motion.div>
    </div>
  );
}
