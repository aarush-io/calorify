import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { useAppStore } from "../store/appStore";
import { APP_CONFIG } from "../../config/app.config";
import { format, parseISO } from "date-fns";
import toast from "react-hot-toast";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-2xl px-3 py-2 text-xs font-body">
      <div className="text-white/40 mb-1">{label}</div>
      <div className="font-bold text-violet-300">{payload[0].value} {APP_CONFIG.diet.weightUnit}</div>
    </div>
  );
};

export default function WeightPage() {
  const { history, todayLog, logBodyWeight, loadHistory } = useAppStore();
  const [inputWeight, setInputWeight] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadHistory();
    if (todayLog?.weight) setInputWeight(String(todayLog.weight));
  }, []);

  const weightData = history
    .filter((l) => l.weight)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((l) => ({
      date: format(parseISO(l.date), "MMM d"),
      weight: l.weight!,
    }));

  const latestWeight = weightData[weightData.length - 1]?.weight;
  const firstWeight = weightData[0]?.weight;
  const change = latestWeight && firstWeight ? (latestWeight - firstWeight).toFixed(1) : null;

  const handleLog = async () => {
    const w = parseFloat(inputWeight);
    if (isNaN(w) || w <= 0 || w > 999) return toast.error("Enter a valid weight");
    setSaving(true);
    await logBodyWeight(w);
    toast.success(`Weight logged: ${w} ${APP_CONFIG.diet.weightUnit}`);
    setSaving(false);
    loadHistory();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="mb-5">
        <h2 className="font-display font-bold text-2xl text-white">Weight</h2>
        <p className="text-white/30 text-sm font-body mt-0.5">Track your progress</p>
      </div>

      {/* Log today's weight */}
      <div className="glass rounded-3xl p-5 mb-5">
        <h3 className="font-display font-semibold text-sm text-white/60 mb-4 uppercase tracking-wider">Log Today</h3>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="number"
              inputMode="decimal"
              value={inputWeight}
              onChange={(e) => setInputWeight(e.target.value)}
              placeholder="0.0"
              className="w-full glass rounded-2xl px-4 py-3 text-xl calorie-number text-white placeholder-white/15 outline-none border border-transparent focus:border-violet-500/50 transition-colors pr-16"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 text-sm font-body">
              {APP_CONFIG.diet.weightUnit}
            </span>
          </div>
          <button onClick={handleLog} disabled={saving} className="btn-primary px-5 py-3 flex-shrink-0">
            {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Log"}
          </button>
        </div>
      </div>

      {/* Stats */}
      {latestWeight && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "Current", value: `${latestWeight}`, unit: APP_CONFIG.diet.weightUnit },
            { label: "Starting", value: firstWeight ? `${firstWeight}` : "—", unit: APP_CONFIG.diet.weightUnit },
            { label: "Change", value: change ? (parseFloat(change) > 0 ? `+${change}` : change) : "—", unit: APP_CONFIG.diet.weightUnit },
          ].map((s) => (
            <div key={s.label} className="glass rounded-2xl p-3 text-center">
              <div className="calorie-number font-bold text-lg text-white">{s.value}</div>
              <div className="text-xs text-white/30 mt-0.5 font-body">{s.unit}</div>
              <div className="text-xs text-white/20 mt-1 font-body">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      {weightData.length > 1 ? (
        <div className="glass rounded-3xl p-4">
          <h3 className="font-display font-semibold text-sm text-white/60 mb-4 uppercase tracking-wider">Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={weightData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10, fontFamily: "DM Sans" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="weight" stroke="#A78BFA" strokeWidth={2} fill="url(#weightGrad)" dot={{ fill: "#7C3AED", r: 3, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="glass rounded-3xl p-8 text-center">
          <div className="text-4xl mb-3">⚖️</div>
          <p className="text-white/30 text-sm font-body">Log at least 2 days to see your trend</p>
        </div>
      )}
    </motion.div>
  );
}
