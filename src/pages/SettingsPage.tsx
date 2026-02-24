import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "../store/appStore";
import { signOutUser } from "../services/firebase";
import { APP_CONFIG } from "../../config/app.config";
import toast from "react-hot-toast";

// ── Sub-components ────────────────────────────────────────────

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
      className={`w-12 h-6 rounded-full transition-all duration-300 relative flex-shrink-0 ${
        value ? "bg-violet-600" : "bg-white/10"
      }`}
    >
      <motion.div
        className="w-5 h-5 bg-white rounded-full shadow absolute top-0.5"
        animate={{ left: value ? "26px" : "2px" }}
        transition={{ type: "spring", stiffness: 500, damping: 35 }}
      />
    </button>
  );
}

// ── Calorie Goal Card ─────────────────────────────────────────

const PRESETS = [
  { label: "Cut", value: 1800, icon: "🔥", description: "Calorie deficit" },
  { label: "Maintain", value: 2200, icon: "⚖️", description: "Maintenance" },
  { label: "Bulk", value: 2800, icon: "💪", description: "Calorie surplus" },
] as const;

const MIN_GOAL = 500;
const MAX_GOAL = 10_000;

function CalorieGoalCard() {
  const { calorieGoal, updateCalorieGoal, user } = useAppStore();
  const isGuest = user?.isAnonymous ?? true;

  // Local draft — only committed when Save is pressed
  const [draft, setDraft] = useState(String(calorieGoal));
  const [saving, setSaving] = useState(false);
  // Track whether the draft matches the live value to show/hide Save
  const draftNum = parseInt(draft, 10);
  const isDirty = !isNaN(draftNum) && draftNum !== calorieGoal;

  const validationError = (() => {
    if (draft === "") return null; // don't show error while typing
    if (isNaN(draftNum)) return "Must be a number";
    if (draftNum < MIN_GOAL) return `Minimum is ${MIN_GOAL} kcal`;
    if (draftNum > MAX_GOAL) return `Maximum is ${MAX_GOAL.toLocaleString()} kcal`;
    return null;
  })();

  const handlePreset = (value: number) => {
    setDraft(String(value));
  };

  const handleSave = async () => {
    if (validationError || isNaN(draftNum)) return;
    setSaving(true);
    try {
      await updateCalorieGoal(draftNum);
      toast.success(`Goal updated to ${draftNum.toLocaleString()} kcal`);
    } catch {
      toast.error("Failed to save goal");
      setDraft(String(calorieGoal)); // revert draft on error
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass rounded-3xl p-5 mb-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-display font-semibold text-sm text-white/70 uppercase tracking-wider">
          Daily Calorie Goal
        </h3>
        {isGuest && (
          <span className="text-xs glass px-2 py-0.5 rounded-lg text-amber-400/80">
            Saved locally
          </span>
        )}
      </div>
      <p className="text-xs text-white/25 font-body mb-5">
        Progress ring and completion streak use this value
      </p>

      {/* Preset buttons */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {PRESETS.map((p) => {
          const isActive = draftNum === p.value;
          return (
            <button
              key={p.label}
              onClick={() => handlePreset(p.value)}
              className={`rounded-2xl p-3 text-center transition-all duration-200 border ${
                isActive
                  ? "bg-violet-600/30 border-violet-500/50"
                  : "glass border-transparent hover:border-white/10"
              }`}
            >
              <div className="text-xl mb-1">{p.icon}</div>
              <div className="font-display font-bold text-sm text-white">{p.label}</div>
              <div className="font-mono text-xs text-white/40 mt-0.5">
                {p.value.toLocaleString()}
              </div>
            </button>
          );
        })}
      </div>

      {/* Number input */}
      <div className="relative mb-4">
        <label className="text-xs text-white/40 font-body uppercase tracking-wider mb-2 block">
          Custom goal
        </label>
        <div className="relative">
          <input
            type="number"
            inputMode="numeric"
            value={draft}
            min={MIN_GOAL}
            max={MAX_GOAL}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              // Clamp on blur so the field never shows an out-of-range value
              if (!isNaN(draftNum)) {
                const clamped = Math.min(Math.max(draftNum, MIN_GOAL), MAX_GOAL);
                if (clamped !== draftNum) setDraft(String(clamped));
              }
            }}
            className={`w-full glass rounded-2xl px-4 py-3 pr-16 text-xl font-display font-bold
              text-white placeholder-white/15 outline-none transition-colors border
              ${validationError ? "border-red-500/50" : "border-transparent focus:border-violet-500/50"}`}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 text-sm font-body pointer-events-none">
            kcal
          </span>
        </div>

        {/* Validation error */}
        <AnimatePresence>
          {validationError && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-xs text-red-400 mt-1.5 font-body"
            >
              {validationError}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Save button — only shown when there's a dirty, valid value */}
      <AnimatePresence>
        {isDirty && !validationError && (
          <motion.button
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            onClick={handleSave}
            disabled={saving}
            className="w-full btn-primary py-3.5 text-sm font-semibold flex items-center justify-center gap-2"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="w-4 h-4">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            Save {draftNum.toLocaleString()} kcal goal
          </motion.button>
        )}
      </AnimatePresence>

      {/* Live confirmation — current active goal */}
      {!isDirty && (
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <span className="text-xs text-white/25 font-body">Active goal</span>
          <span className="font-mono text-sm font-bold text-violet-300">
            {calorieGoal.toLocaleString()} kcal
          </span>
        </div>
      )}
    </div>
  );
}

// ── Settings Page ─────────────────────────────────────────────

export default function SettingsPage() {
  const { user } = useAppStore();
  const [signingOut, setSigningOut] = useState(false);

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
            {isGuest ? "Data saved locally on this device" : user?.email}
          </div>
        </div>
        {isGuest && (
          <div className="flex-shrink-0 text-xs glass px-2 py-1 rounded-lg text-amber-400">
            Guest
          </div>
        )}
      </div>

      {/* ── Live calorie goal editor ── */}
      <CalorieGoalCard />

      {/* App-level feature flags (read-only, controlled via config) */}
      <div className="glass rounded-3xl p-5 mb-4">
        <h3 className="font-display font-semibold text-sm text-white/50 uppercase tracking-wider mb-1">
          App Config
        </h3>
        <p className="text-xs text-white/25 font-body mb-4">
          Controlled via{" "}
          <code className="font-mono text-violet-400">config/app.config.ts</code>
        </p>

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
        <h3 className="font-display font-semibold text-sm text-white/50 uppercase tracking-wider mb-3">
          About
        </h3>
        <SettingRow label="App Name">
          <span className="text-sm text-white/50 font-body">{APP_CONFIG.app.name}</span>
        </SettingRow>
        <SettingRow label="Version">
          <span className="font-mono text-sm text-white/30">v{APP_CONFIG.app.version}</span>
        </SettingRow>
        <SettingRow label="Cloud Provider">
          <span className="text-sm text-white/50 font-body capitalize">
            {APP_CONFIG.cloud.provider}
          </span>
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
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
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
