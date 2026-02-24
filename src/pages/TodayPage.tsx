import { motion } from "framer-motion";
import ProgressCard from "../components/checklist/ProgressCard";
import FoodChecklist from "../components/checklist/FoodChecklist";
import { format } from "date-fns";

export default function TodayPage() {
  const today = format(new Date(), "EEEE, MMMM d");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Date header */}
      <div className="mb-5">
        <p className="text-white/30 text-xs font-body uppercase tracking-widest">{today}</p>
        <h2 className="font-display font-bold text-2xl text-white mt-0.5">Good day! 👋</h2>
      </div>

      {/* Floating progress card */}
      <ProgressCard />

      {/* Checklist */}
      <FoodChecklist />
    </motion.div>
  );
}
