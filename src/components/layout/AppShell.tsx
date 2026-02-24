import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { APP_CONFIG } from "../../../config/app.config";
import { useAppStore } from "../../store/appStore";

// Icons (inline SVG for bundle size)
const icons = {
  today: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  weight: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M3 3v18h18" /><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  ),
};

const navItems = [
  { path: "/", key: "today", label: "Today", icon: icons.today, alwaysShow: true },
  { path: "/history", key: "history", label: "History", icon: icons.history, alwaysShow: true },
  { path: "/weight", key: "weight", label: "Weight", icon: icons.weight, feature: "weightTracking" as const },
  { path: "/settings", key: "settings", label: "Settings", icon: icons.settings, alwaysShow: true },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { streak } = useAppStore();

  const visibleNav = navItems.filter(
    (item) => item.alwaysShow || (item.feature && APP_CONFIG.features[item.feature])
  );

  return (
    <div className="mesh-bg min-h-dvh flex flex-col">
      {/* Top header */}
      <header className="pt-safe sticky top-0 z-40">
        <div className="glass border-b border-white/5 px-5 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-lg text-gradient leading-none">
              {APP_CONFIG.app.name}
            </h1>
            <p className="text-xs text-white/30 font-body mt-0.5">{APP_CONFIG.app.tagline}</p>
          </div>

          {APP_CONFIG.features.streaks && streak > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1.5 glass px-3 py-1.5 rounded-full"
            >
              <span className="text-base leading-none">🔥</span>
              <span className="font-display font-bold text-sm text-gradient-gold">{streak}</span>
              <span className="text-xs text-white/40">streak</span>
            </motion.div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-lg mx-auto px-4 py-5">
          {children}
        </div>
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-50 bottom-nav">
        <div className="glass border-t border-white/5 px-2 pt-2">
          <div className="max-w-lg mx-auto flex items-center justify-around">
            {visibleNav.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.key}
                  onClick={() => navigate(item.path)}
                  className="flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all duration-200 min-w-[64px] relative"
                  style={{ color: isActive ? "var(--primary-light)" : "var(--text-3)" }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute inset-0 rounded-2xl"
                      style={{ background: "rgba(124,58,237,0.15)" }}
                      transition={{ type: "spring", stiffness: 400, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10">{item.icon}</span>
                  <span className="relative z-10 text-[10px] font-body font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
