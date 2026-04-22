import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Code2, Target, Type, BookOpen, ChevronDown, ChevronUp, Send, CheckCircle2, AlertCircle, RefreshCw, Dumbbell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import clsx from "clsx";
import { apiClient } from "../api/client";

interface Exercise {
  title: string;
  description: string;
  type: string; // 'code', 'translation', 'theory', 'problem'
  solution: string;
}

export default function ExercisesComponent({ topicName, exercises, onEvaluate }: { topicName: string, exercises: Exercise[], onEvaluate?: (achievement?: any) => void }) {
  const { user } = useAuth();
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [submissions, setSubmissions] = useState<Record<number, string>>({});
  const [evaluations, setEvaluations] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState<Record<number, boolean>>({});

  if (!exercises || exercises.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border-2 border-dashed border-slate-100">
        <Dumbbell size={48} className="text-slate-200 mb-4" />
        <p className="text-slate-500 font-medium">Practice modules are being prepared by the AI.</p>
      </div>
    );
  }

  const handleEvaluate = async (idx: number) => {
    const submission = submissions[idx];
    if (!submission || !user) return;

    setLoading(prev => ({ ...prev, [idx]: true }));
    try {
      const res = await apiClient.post("/progress/evaluate", {
        userId: user.id,
        topicName,
        exercise: exercises[idx],
        submission
      });
      const data = res.data;
      setEvaluations(prev => ({ ...prev, [idx]: data.evaluation }));
      onEvaluate?.(data.achievement);
    } catch (err) {
      console.error("Evaluation failed", err);
    } finally {
      setLoading(prev => ({ ...prev, [idx]: false }));
    }
  };

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
      
      {Array.isArray(exercises) && exercises.map((exercise, idx) => {
        const isRevealed = revealed[idx];
        const evaluation = evaluations[idx];
        const isSubmitting = loading[idx];

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

              {/* Submission Area */}
              <div className="mb-6">
                <textarea
                    value={submissions[idx] || ""}
                    onChange={(e) => setSubmissions(prev => ({ ...prev, [idx]: e.target.value }))}
                    placeholder="Type your answer or code here..."
                    className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
                <button
                    onClick={() => handleEvaluate(idx)}
                    disabled={isSubmitting || !submissions[idx]}
                    className="mt-3 flex items-center gap-2 bg-slate-900 hover:bg-black disabled:bg-slate-300 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-md active:scale-95"
                >
                    {isSubmitting ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
                    Submit for AI Review
                </button>
              </div>

              {/* Evaluation Feedback */}
              <AnimatePresence>
                {evaluation && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={clsx(
                        "mb-6 p-5 rounded-xl border flex flex-col gap-3",
                        evaluation.passed ? "bg-green-50 border-green-100" : "bg-amber-50 border-amber-100"
                    )}
                  >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {evaluation.passed ? <CheckCircle2 className="text-green-600" size={20} /> : <AlertCircle className="text-amber-600" size={20} />}
                            <span className={clsx("font-bold", evaluation.passed ? "text-green-800" : "text-amber-800")}>
                                {evaluation.passed ? "Great Job!" : "Needs Improvement"}
                            </span>
                        </div>
                        <div className="text-lg font-black text-slate-900">Score: {evaluation.score}/100</div>
                    </div>
                    <div className="prose prose-sm prose-slate max-w-none">
                        <ReactMarkdown>{evaluation.feedback}</ReactMarkdown>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
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
                    <h5 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Reference Solution</h5>
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
