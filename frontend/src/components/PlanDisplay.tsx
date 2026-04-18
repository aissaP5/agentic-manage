import { CheckCircle2, Circle, Target, Lock } from "lucide-react";
import clsx from "clsx";
import { motion } from "framer-motion";

interface PlanDisplayProps {
  plan: any[];
  onSelectTopic: (topic: string) => void;
  activeTopic: string;
}

export default function PlanDisplay({ plan, onSelectTopic, activeTopic }: PlanDisplayProps) {
  return (
    <div className="relative">
      {/* Central spine line */}
      <div className="absolute left-6 top-8 bottom-8 w-1 bg-gradient-to-b from-blue-200 via-indigo-200 to-slate-100 rounded-full z-0"></div>

      <div className="space-y-8 relative z-10">
        {plan.map((phase, wIdx) => (
          <div key={wIdx} className="relative">
            {/* Week Badge */}
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-8 rounded-full bg-blue-100 border-2 border-blue-600 flex items-center justify-center font-bold text-blue-800 text-sm shadow-sm">
                W{phase.week}
              </div>
              <h3 className="font-bold text-lg text-slate-800 tracking-wide">
                Phase {phase.week}
              </h3>
            </div>

            {/* Topics */}
            <div className="pl-6 space-y-4">
              {phase.topics.map((topic: string, tIdx: number) => {
                const isActive = topic === activeTopic;
                const isCompleted = false; // Add progress logic here later if needed

                return (
                  <motion.div 
                    key={tIdx}
                    whileHover={{ x: 5 }}
                    className="relative pl-8"
                  >
                    {/* Node Dot */}
                    <div className={clsx(
                      "absolute left-[-21px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 bg-white transition-colors duration-300",
                      isActive ? "border-blue-600 ring-4 ring-blue-100 shadow-[0_0_10px_rgba(37,99,235,0.5)]" : 
                      isCompleted ? "border-green-500 bg-green-500" : "border-slate-300"
                    )}>
                      {isActive && (
                        <div className="absolute inset-0 m-auto w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></div>
                      )}
                    </div>

                    <button
                      onClick={() => onSelectTopic(topic)}
                      className={clsx(
                        "w-full text-left p-4 rounded-xl transition-all duration-300 border flex items-center justify-between group cursor-pointer",
                        isActive 
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 border-transparent text-white shadow-md transform scale-[1.02]" 
                          : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:border-blue-300 hover:shadow-sm"
                      )}
                    >
                      <span className={clsx(
                        "font-semibold text-sm",
                        isActive ? "text-white" : "text-slate-700"
                      )}>
                        {topic}
                      </span>
                      
                      <div className={clsx(
                        "transition-transform",
                        isActive ? "text-white/80" : "text-slate-400 group-hover:text-blue-500"
                      )}>
                        {isActive ? <Target size={18} /> : <Circle size={18} />}
                      </div>
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
