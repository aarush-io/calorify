import { useEffect } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "../store/appStore";
import { format, parseISO } from "date-fns";
import { APP_CONFIG } from "../../config/app.config";
import { DailyLog } from "../services/firebase";

function LogCard({ log }: { log: DailyLog }) {
  const pct = Math.round(log.completionPercent * 100);
  const dateObj = parseISO(log.date);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-4 flex items-center gap-4"
    >
      {/* Date badge */}
      <div className="flex-shrink-0 w-12 text-center">
        <div className="text-xs text-white/30 font-body">{format(dateObj, "MMM")}</div>
        <div className="font-display font-bold text-xl text-white/90">{format(dateObj, "d")}</div>
        <div className="text-xs text-white/30 font-body">{format(dateObj, "EEE")}</div>
      </div>

      {/* Divider */}
      <div className="w-px h-10 bg-white/5" />

      {/* Stats */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <span
            className="calorie-number font-semibold text-base"
            style={{ color: log.completed ? "var(--success)" : "var(--primary-light)" }}
          >
            {log.totalCalories.toLocaleString()} kcal
          </span>
          <span
            className="text-xs font-mono px-2 py-0.5 rounded-lg"
            style={{
              background: log.completed ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)",
              color: log.completed ? "#10B981" : "rgba(255,255,255,0.3)",
            }}
          >
            {pct}%
          </span>
        </div>

        <div className="progress-track">
          <div
            className={`progress-fill ${log.completed ? "completed" : ""}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {log.weight && (
          <div className="mt-2 text-xs text-white/30 font-body">
            ⚖️ {log.weight} {APP_CONFIG.diet.weightUnit}
          </div>
        )}
      </div>

      {/* Completion icon */}
      <div className="flex-shrink-0 text-xl">
        {log.completed ? "✅" : pct >= 50 ? "🟡" : "⭕"}
      </div>
    </motion.div>
  );
}

export default function HistoryPage() {
  const { history, historyLoading, loadHistory } = useAppStore();

  useEffect(() => {
    loadHistory();
  }, []);

  const totalDays = history.length;
  const completedDays = history.filter((l) => l.completed).length;
  const avgCalories = totalDays > 0
    ? Math.round(history.reduce((s, l) => s + l.totalCalories, 0) / totalDays)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="mb-5">
        <h2 className="font-display font-bold text-2xl text-white">History</h2>
        <p className="text-white/30 text-sm font-body mt-0.5">Last 60 days</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Days tracked", value: totalDays, icon: "📅" },
          { label: "Goals hit", value: completedDays, icon: "🎯" },
          { label: "Avg kcal", value: avgCalories.toLocaleString(), icon: "📊" },
        ].map((stat) => (
          <div key={stat.label} className="glass rounded-2xl p-3 text-center">
            <div className="text-xl mb-1">{stat.icon}</div>
            <div className="calorie-number font-bold text-lg text-white">{stat.value}</div>
            <div className="text-xs text-white/30 font-body mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* History list */}
      {historyLoading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-2xl" />
          ))}
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📭</div>
          <p className="text-white/30 font-body text-sm">No history yet.<br />Start logging today!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((log) => (
            <LogCard key={log.date} log={log} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
