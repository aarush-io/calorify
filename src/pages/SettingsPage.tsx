import { useState } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "../store/appStore";
import { signOutUser, updateUserSettings } from "../services/firebase";
import { APP_CONFIG } from "../../config/app.config";
import toast from "react-hot-toast";

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-white/5 last:border-0">
      <div className="flex-1">
        <div className="text-sm font-body font-medium text-white/80">{label}</div>
        {description && <div className="text-xs text-white/30 font-body mt-0.5">{description}</div>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`w-12 h-6 rounded-full transition-all duration-300 relative flex-shrink-0 ${value ? "bg-violet-600" : "bg-white/10"}`}
    >
      <motion.div
        className="w-5 h-5 bg-white rounded-full shadow absolute top-0.5"
        animate={{ left: value ? "26px" : "2px" }}
        transition={{ type: "spring", stiffness: 500, damping: 35 }}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { user } = useAppStore();
  const [signingOut, setSigningOut] = useState(false);
  const [calorieGoal, setCalorieGoal] = useState(String(APP_CONFIG.diet.dailyCalorieGoal));

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOutUser();
  };

  const isGuest = user?.isAnonymous;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="mb-5">
        <h2 className="font-display font-bold text-2xl text-white">Settings</h2>
        <p className="text-white/30 text-sm font-body mt-0.5">Customize your experience</p>
      </div>

      {/* User info */}
      <div className="glass rounded-3xl p-4 mb-4 flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #7C3AED, #5B21B6)" }}
        >
          {isGuest ? "👤" : user?.photoURL ? (
            <img src={user.photoURL} alt="" className="w-12 h-12 rounded-2xl object-cover" />
          ) : "🙂"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-body font-semibold text-sm text-white truncate">
            {isGuest ? "Guest User" : user?.displayName || "User"}
          </div>
          <div className="text-xs text-white/30 font-body truncate">
            {isGuest ? "Data local to this device" : user?.email}
          </div>
        </div>
        {isGuest && (
          <div className="flex-shrink-0 text-xs glass px-2 py-1 rounded-lg text-amber-400">Guest</div>
        )}
      </div>

      {/* Config-driven feature status */}
      <div className="glass rounded-3xl p-5 mb-4">
        <h3 className="font-display font-semibold text-sm text-white/50 uppercase tracking-wider mb-1">App Config</h3>
        <p className="text-xs text-white/25 font-body mb-4">Controlled via <code className="font-mono text-violet-400">config/app.config.ts</code></p>

        <SettingRow label="Daily Calorie Goal" description="Change in config file to update">
          <span className="calorie-number text-sm font-bold text-violet-300">{APP_CONFIG.diet.dailyCalorieGoal} {APP_CONFIG.diet.unit}</span>
        </SettingRow>
        <SettingRow label="Streak Tracking" description="Consecutive goal-completion days">
          <span className={`text-xs px-2 py-1 rounded-lg ${APP_CONFIG.features.streaks ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-white/30"}`}>
            {APP_CONFIG.features.streaks ? "Enabled" : "Disabled"}
          </span>
        </SettingRow>
        <SettingRow label="Weight Tracking" description="Bodyweight log and graph">
          <span className={`text-xs px-2 py-1 rounded-lg ${APP_CONFIG.features.weightTracking ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-white/30"}`}>
            {APP_CONFIG.features.weightTracking ? "Enabled" : "Disabled"}
          </span>
        </SettingRow>
        <SettingRow label="Guest Mode" description="Anonymous sign-in option">
          <span className={`text-xs px-2 py-1 rounded-lg ${APP_CONFIG.features.guestMode ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-white/30"}`}>
            {APP_CONFIG.features.guestMode ? "Enabled" : "Disabled"}
          </span>
        </SettingRow>
        <SettingRow label="Reset Time" description="When daily checklist resets">
          <span className="font-mono text-sm text-white/50">{APP_CONFIG.diet.resetTime}</span>
        </SettingRow>
      </div>

      {/* App info */}
      <div className="glass rounded-3xl p-5 mb-4">
        <h3 className="font-display font-semibold text-sm text-white/50 uppercase tracking-wider mb-3">About</h3>
        <SettingRow label="App Name">
          <span className="text-sm text-white/50 font-body">{APP_CONFIG.app.name}</span>
        </SettingRow>
        <SettingRow label="Version">
          <span className="font-mono text-sm text-white/30">v{APP_CONFIG.app.version}</span>
        </SettingRow>
        <SettingRow label="Cloud Provider">
          <span className="text-sm text-white/50 font-body capitalize">{APP_CONFIG.cloud.provider}</span>
        </SettingRow>
      </div>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        disabled={signingOut}
        className="w-full glass rounded-3xl p-4 flex items-center justify-center gap-2 text-red-400 hover:bg-red-500/10 transition-all font-body font-medium"
      >
        {signingOut ? (
          <span className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        )}
        Sign Out
      </button>

      <p className="text-center text-white/15 text-xs mt-6 font-body">
        Made with ❤️ · {APP_CONFIG.app.name}
      </p>
    </motion.div>
  );
}
