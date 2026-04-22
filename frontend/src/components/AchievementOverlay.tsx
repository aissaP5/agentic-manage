import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

interface Achievement {
  title: string;
  description: string;
}

export default function AchievementOverlay({ achievement, onComplete }: { achievement: Achievement | null, onComplete: () => void }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (achievement) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        setTimeout(onComplete, 500); // Buffer for animation
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [achievement]);

  return (
    <AnimatePresence>
      {show && achievement && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="fixed bottom-8 right-8 z-[100] bg-slate-900 text-white p-6 rounded-3xl shadow-2xl border border-blue-500/30 flex items-center gap-6 max-w-md overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-1 bg-blue-500/20 rounded-bl-2xl">
             <Sparkles size={16} className="text-blue-400 animate-pulse" />
          </div>
          
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
            <Trophy size={32} className="text-white" />
          </div>
          
          <div>
            <h4 className="text-blue-400 text-xs font-black uppercase tracking-widest mb-1">Achievement Unlocked!</h4>
            <h3 className="text-xl font-bold leading-tight mb-1">{achievement.title}</h3>
            <p className="text-slate-400 text-sm leading-snug">{achievement.description}</p>
          </div>
          
          {/* Confetti effect placeholder */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
             {[...Array(6)].map((_, i) => (
               <motion.div
                 key={i}
                 initial={{ opacity: 0, scale: 0 }}
                 animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0.5], x: [0, (i-2.5)*40], y: [0, -60] }}
                 transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                 className="absolute top-1/2 left-1/2 w-2 h-2 bg-blue-400 rounded-full"
               />
             ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
