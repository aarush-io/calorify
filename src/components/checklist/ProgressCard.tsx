import { motion } from "framer-motion";
import { APP_CONFIG } from "../../../config/app.config";
import { useAppStore } from "../../store/appStore";

function arc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(startDeg));
  const y1 = cy + r * Math.sin(toRad(startDeg));
  const x2 = cx + r * Math.cos(toRad(endDeg));
  const y2 = cy + r * Math.sin(toRad(endDeg));
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

export default function ProgressCard() {
  const { todayLog, logLoading, foods } = useAppStore();
  const goal = APP_CONFIG.diet.dailyCalorieGoal;
  const unit = APP_CONFIG.diet.unit;

  const eaten = todayLog?.totalCalories ?? 0;
  const remaining = Math.max(goal - eaten, 0);
  const percent = Math.min(eaten / goal, 1);
  const completed = todayLog?.completed ?? false;

  const checkedCount = todayLog?.checkedFoods.length ?? 0;
  const totalCount = foods.length;

  // Arc params
  const r = 70;
  const cx = 90;
  const cy = 90;
  const startAngle = -220;
  const endAngle = 40;
  const arcSpan = endAngle - startAngle;
  const fillAngle = startAngle + arcSpan * percent;

  if (logLoading) {
    return <div className="skeleton h-48 rounded-3xl mb-6" />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass rounded-3xl p-5 mb-5 relative overflow-hidden ${completed ? "glow-success" : "glow-primary"}`}
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none rounded-3xl"
        style={{
          background: completed
            ? "radial-gradient(ellipse at center, rgba(16,185,129,0.2), transparent)"
            : "radial-gradient(ellipse at center, rgba(124,58,237,0.15), transparent)",
        }}
      />

      <div className="relative z-10 flex items-center gap-5">
        {/* Circular progress */}
        <div className="flex-shrink-0">
          <svg width="180" height="120" viewBox="0 0 180 120">
            {/* Track arc */}
            <path
              d={arc(cx, cy, r, startAngle, endAngle)}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="10"
              strokeLinecap="round"
            />
            {/* Fill arc */}
            {percent > 0 && (
              <motion.path
                d={arc(cx, cy, r, startAngle, fillAngle)}
                fill="none"
                stroke={completed ? "#10B981" : "url(#arcGrad)"}
                strokeWidth="10"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            )}
            <defs>
              <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#7C3AED" />
                <stop offset="100%" stopColor="#A78BFA" />
              </linearGradient>
            </defs>
            {/* Center text */}
            <text x={cx} y={cy - 8} textAnchor="middle" fill="#F8FAFC" fontSize="22" fontWeight="700" fontFamily="Syne, sans-serif">
              {Math.round(percent * 100)}%
            </text>
            <text x={cx} y={cy + 12} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="10" fontFamily="DM Sans, sans-serif">
              {completed ? "✓ done" : "of goal"}
            </text>
          </svg>
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-4">
          <div>
            <div className="text-white/40 text-xs font-body uppercase tracking-wider mb-1">Consumed</div>
            <div className="calorie-number text-3xl font-bold" style={{ color: completed ? "#10B981" : "#A78BFA" }}>
              {eaten.toLocaleString()}
              <span className="text-sm text-white/40 font-normal ml-1">{unit}</span>
            </div>
          </div>

          <div>
            <div className="text-white/40 text-xs font-body uppercase tracking-wider mb-1">Remaining</div>
            <div className="calorie-number text-xl font-semibold text-white/70">
              {remaining.toLocaleString()}
              <span className="text-sm text-white/30 font-normal ml-1">{unit}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 progress-track">
              <motion.div
                className={`progress-fill ${completed ? "completed" : ""}`}
                initial={{ width: 0 }}
                animate={{ width: `${percent * 100}%` }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              />
            </div>
            <span className="text-xs text-white/30 font-mono flex-shrink-0">
              {checkedCount}/{totalCount}
            </span>
          </div>
        </div>
      </div>

      {/* Goal label */}
      <div className="relative z-10 mt-3 pt-3 border-t border-white/5 flex justify-between items-center">
        <span className="text-xs text-white/30 font-body">Daily goal</span>
        <span className="font-mono text-xs text-white/50">
          {goal.toLocaleString()} {unit}
        </span>
      </div>
    </motion.div>
  );
}
