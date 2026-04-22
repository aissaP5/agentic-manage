import { useState } from "react";
import { CheckCircle2, XCircle, Trophy } from "lucide-react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";

import { useAuth } from "../context/AuthContext";
import { useEffect } from "react";
import { apiClient } from "../api/client";

interface QuizProps {
  topicName: string;
  quiz: {
    question: string;
    options: string[];
    answer: string;
    explanation: string;
  }[];
  onComplete?: (achievement?: any) => void;
}

export default function QuizComponent({ topicName, quiz, onComplete }: QuizProps) {
  const { user } = useAuth();
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState<Record<number, boolean>>({});

  if (!quiz || quiz.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border-2 border-dashed border-slate-100">
        <Trophy size={48} className="text-slate-200 mb-4" />
        <p className="text-slate-500 font-medium">The knowledge check for this module is being drafted by the AI examiner.</p>
      </div>
    );
  }

  const handleSelect = (qIdx: number, option: string) => {
    if (submitted[qIdx]) return;
    setSelectedAnswers({ ...selectedAnswers, [qIdx]: option });
  };

  const handleSubmit = (qIdx: number) => {
    if (!selectedAnswers[qIdx]) return;
    setSubmitted({ ...submitted, [qIdx]: true });
  };

  const answeredCount = Object.keys(submitted).length;
  const correctCount = Object.entries(submitted)
    .filter(([idx]) => {
      const i = Number(idx);
      return selectedAnswers[i] === quiz[i]?.answer;
    }).length;

  useEffect(() => {
    if (answeredCount === quiz.length && user) {
      // Award 100 XP per correct answer
      const xpScore = correctCount * 100;
      apiClient.post("/progress/quiz", {
          userId: user.id,
          topicName: topicName,
          quizScore: xpScore
      })
      .then(res => onComplete?.(res.data.achievement))
      .catch(err => console.error("Failed to save progress", err));
    }
  }, [answeredCount, quiz.length, user, correctCount, topicName]);

  const progressPct = Math.round((answeredCount / quiz.length) * 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xl font-bold text-slate-800">Knowledge Check</h3>
        <span className="text-sm font-semibold text-slate-500">{answeredCount}/{quiz.length} answered</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
        <motion.div
          className="bg-blue-600 h-2 rounded-full transition-all"
          style={{ width: `${progressPct}%` }}
          animate={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Score summary when all answered */}
      <AnimatePresence>
        {answeredCount === quiz.length && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={clsx(
              "flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border-2 font-bold text-lg",
              correctCount === quiz.length
                ? "bg-green-50 border-green-300 text-green-800"
                : correctCount >= quiz.length / 2
                ? "bg-yellow-50 border-yellow-300 text-yellow-800"
                : "bg-red-50 border-red-300 text-red-800"
            )}
          >
            <div className="flex items-center gap-4">
              <Trophy size={28} />
              <div>
                <p>Score: {correctCount}/{quiz.length}</p>
                <p className="text-sm font-normal mt-0.5">
                  {correctCount === quiz.length
                    ? "Perfect score! Excellent work! 🎉"
                    : correctCount >= quiz.length / 2
                    ? "Good job! Review the wrong answers below."
                    : "Keep practicing! Review the explanations."}
                </p>
              </div>
            </div>
            
            {correctCount < quiz.length && (
               <button 
                 onClick={() => alert("Adaptive Learning Triggered! The 'Examiner' agent would now generate a tailored micro-lesson focusing specifically on the concepts you missed.")}
                 className="px-4 py-2 mt-2 md:mt-0 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 transition"
               >
                 Generate Support Lesson
               </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {Array.isArray(quiz) && quiz.map((q, idx) => {
        const isSubmitted = submitted[idx];
        const selected = selectedAnswers[idx];
        const isCorrect = selected === q.answer;

        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm"
          >
            <div className="flex gap-3 items-start mb-4">
              <span className="shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center">
                {idx + 1}
              </span>
              <h4 className="font-bold text-lg text-slate-800 leading-snug">{q.question}</h4>
            </div>
            <div className="space-y-2 ml-10">
              {q.options.map((option, oIdx) => {
                let optionStyle = "border-slate-200 hover:border-blue-400 bg-white text-slate-700";

                if (selected === option && !isSubmitted) {
                  optionStyle = "border-blue-500 bg-blue-50 text-blue-800 ring-1 ring-blue-500";
                }

                if (isSubmitted) {
                  if (option === q.answer) {
                    optionStyle = "border-green-500 bg-green-50 text-green-800 ring-1 ring-green-500";
                  } else if (selected === option && !isCorrect) {
                    optionStyle = "border-red-500 bg-red-50 text-red-800 ring-1 ring-red-500";
                  } else {
                    optionStyle = "border-slate-200 bg-slate-50 text-slate-400 opacity-60";
                  }
                }

                return (
                  <button
                    key={oIdx}
                    onClick={() => handleSelect(idx, option)}
                    disabled={isSubmitted}
                    className={clsx(
                      "w-full text-left p-4 rounded-xl border transition-all duration-200 text-sm font-medium",
                      optionStyle,
                      !isSubmitted && "cursor-pointer hover:shadow-sm"
                    )}
                  >
                    <span className="font-bold mr-2 text-slate-400">{String.fromCharCode(65 + oIdx)}.</span>
                    {option}
                  </button>
                );
              })}
            </div>

            {!isSubmitted && selected && (
              <div className="ml-10 mt-4">
                <button
                  onClick={() => handleSubmit(idx)}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-sm"
                >
                  Check Answer
                </button>
              </div>
            )}

            <AnimatePresence>
              {isSubmitted && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className={clsx(
                    "ml-10 mt-4 p-4 rounded-xl flex gap-3",
                    isCorrect ? "bg-green-50 text-green-900 border border-green-200" : "bg-red-50 text-red-900 border border-red-200"
                  )}
                >
                  <div className="mt-0.5 shrink-0">
                    {isCorrect ? <CheckCircle2 size={20} className="text-green-600" /> : <XCircle size={20} className="text-red-600" />}
                  </div>
                  <div>
                    <p className="font-bold">{isCorrect ? "Correct! 🎉" : `Incorrect — The answer was: ${q.answer}`}</p>
                    <p className="text-sm mt-1 opacity-90">{q.explanation}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
