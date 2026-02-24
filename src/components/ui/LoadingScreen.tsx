import { motion } from "framer-motion";
import { APP_CONFIG } from "../../../config/app.config";

export default function LoadingScreen() {
  return (
    <div className="mesh-bg min-h-dvh flex flex-col items-center justify-center gap-6">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="text-5xl"
      >
        🥗
      </motion.div>

      <div className="space-y-2 text-center">
        <div className="font-display font-bold text-2xl text-gradient">
          {APP_CONFIG.app.name}
        </div>
        <div className="flex gap-1.5 justify-center">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-violet-400"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
