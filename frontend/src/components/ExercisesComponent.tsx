import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Code2, Target, Type, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

interface Exercise {
  title: string;
  description: string;
  type: string; // 'code', 'translation', 'theory', 'problem'
  solution: string;
}

export default function ExercisesComponent({ exercises }: { exercises: Exercise[] }) {
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  if (!exercises || exercises.length === 0) return null;

  const toggleReveal = (idx: number) => {
    setRevealed((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const getIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "code": return <Code2 size={20} className="text-blue-500" />;
      case "translation": return <Type size={20} className="text-green-500" />;
      case "problem": return <Target size={20} className="text-orange-500" />;
      default: return <BookOpen size={20} className="text-purple-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">Practice & Exercises</h3>
      <p className="text-slate-600 mb-6">Test your skills with these highly tailored exercises. Try to solve them before revealing the solution!</p>
      
      {exercises.map((exercise, idx) => {
        const isRevealed = revealed[idx];
        return (
          <div key={idx} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="px-3 py-1 bg-slate-100 rounded-full flex items-center gap-2 font-bold text-sm text-slate-700 capitalize border border-slate-200">
                  {getIcon(exercise.type)} {exercise.type || "Theory"}
                </div>
                <h4 className="font-bold text-lg text-slate-900">{exercise.title}</h4>
              </div>
              <div className="prose prose-blue max-w-none text-slate-700 mb-6">
                <ReactMarkdown>{exercise.description}</ReactMarkdown>
              </div>
              
              <button
                onClick={() => toggleReveal(idx)}
                className={clsx(
                  "flex items-center gap-2 font-bold py-2 px-4 rounded-lg transition-colors border",
                  isRevealed 
                    ? "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200" 
                    : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300"
                )}
              >
                {isRevealed ? <><ChevronUp size={18}/> Hide Solution</> : <><ChevronDown size={18}/> Reveal Solution</>}
              </button>
            </div>

            <AnimatePresence>
              {isRevealed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="bg-slate-50 border-t border-slate-200"
                >
                  <div className="p-6 prose prose-blue max-w-none">
                    <h5 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Solution</h5>
                    {exercise.type === "code" || exercise.solution.includes("\n") ? (
                       <ReactMarkdown>{exercise.solution}</ReactMarkdown>
                    ) : (
                       <p className="text-slate-800 font-medium">{exercise.solution}</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
