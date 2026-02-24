import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "../../store/appStore";

const COLORS = ["#7C3AED", "#A78BFA", "#F59E0B", "#10B981", "#EC4899", "#60A5FA"];
const SHAPES = ["circle", "square", "triangle"];

interface Particle {
  id: number;
  x: number;
  color: string;
  shape: string;
  size: number;
  duration: number;
  delay: number;
}

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
    size: Math.random() * 8 + 4,
    duration: Math.random() * 2 + 2,
    delay: Math.random() * 0.8,
  }));
}

export default function CelebrationOverlay() {
  const { celebrationActive } = useAppStore();
  const particles = useRef(generateParticles(60));

  return (
    <AnimatePresence>
      {celebrationActive && (
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
          {/* Central message */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-10"
          >
            <motion.div
              animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-6xl mb-3"
            >
              🎉
            </motion.div>
            <div className="glass-strong rounded-3xl px-8 py-4">
              <p className="font-display font-bold text-2xl text-gradient">Goal Crushed!</p>
              <p className="text-white/50 text-sm font-body mt-1">You hit your calorie target today</p>
            </div>
          </motion.div>

          {/* Confetti particles */}
          {particles.current.map((p) => (
            <motion.div
              key={p.id}
              className="absolute top-0"
              style={{
                left: `${p.x}%`,
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                borderRadius: p.shape === "circle" ? "50%" : p.shape === "square" ? "2px" : "0",
              }}
              initial={{ y: -20, opacity: 1, rotate: 0, scale: 1 }}
              animate={{
                y: "110vh",
                opacity: [1, 1, 0],
                rotate: Math.random() > 0.5 ? 720 : -720,
                scale: [1, 0.8, 0.6],
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                ease: "easeIn",
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
