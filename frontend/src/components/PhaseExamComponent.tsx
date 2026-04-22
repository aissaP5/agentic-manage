import { useState, useEffect } from "react";
import { GraduationCap, ArrowRight, CheckCircle2, XCircle, Trophy, AlertCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import clsx from "clsx";

interface PhaseExamProps {
  planId: number;
  phaseIndex: number;
  exam: any;
  onComplete: (achievement?: any) => void;
  onCancel: () => void;
}

export default function PhaseExamComponent({ planId, phaseIndex, exam, onComplete, onCancel }: PhaseExamProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0); // 0: Intro, 1: Questions, 2: Result
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const questions = exam?.questions || [];
  const currentQuestion = questions[currentQuestionIdx];

  const handleNext = () => {
    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
    } else {
      finishExam();
    }
  };

  const finishExam = async () => {
    setIsSubmitting(true);
    let score = 0;
    questions.forEach((q: any, idx: number) => {
      if (answers[idx] === q.answer) score++;
    });

    try {
      const res = await fetch("http://localhost:3000/api/progress/phase-exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          planId,
          phaseIndex,
          score,
          totalQuestions: questions.length
        })
      });
      const data = await res.json();
      setResult({ score, total: questions.length, ...data });
      setCurrentStep(2);
    } catch (err) {
      console.error("Failed to submit exam", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (currentStep === 0) {
    return (
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-10 text-center text-white relative">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
          <GraduationCap size={64} className="mx-auto mb-4 text-blue-400" />
          <h2 className="text-3xl font-black mb-2 uppercase tracking-tighter">Phase Certification Exam</h2>
          <p className="text-slate-400 font-medium">{exam?.examTitle}</p>
        </div>
        <div className="p-10 text-center space-y-6">
          <div className="flex justify-center gap-8 py-4">
             <div className="text-center">
                <div className="text-2xl font-black text-slate-800">{questions.length}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Questions</div>
             </div>
             <div className="text-center">
                <div className="text-2xl font-black text-slate-800">70%</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Passing Score</div>
             </div>
             <div className="text-center">
                <div className="text-2xl font-black text-slate-800">Expert</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Level</div>
             </div>
          </div>
          <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl text-blue-800 text-sm flex items-start gap-4 text-left">
            <AlertCircle className="shrink-0 text-blue-500" size={20} />
            <p>This exam covers all topics in this phase. You must pass to earn the Phase Certification achievement. Good luck!</p>
          </div>
          <div className="flex gap-4 pt-4">
            <button onClick={onCancel} className="flex-1 py-4 text-slate-500 font-bold hover:text-slate-700 transition">Cancel</button>
            <button 
              onClick={() => setCurrentStep(1)} 
              className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-1 active:scale-95"
            >
              Begin Certification <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 1) {
    const progress = ((currentQuestionIdx + 1) / questions.length) * 100;
    return (
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="bg-slate-900 h-2 w-full">
           <motion.div className="bg-blue-500 h-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
        </div>
        <div className="p-8 md:p-12">
          <div className="flex items-center justify-between mb-8">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Question {currentQuestionIdx + 1} of {questions.length}</span>
            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-widest">{currentQuestion.difficulty}</span>
          </div>
          
          <h3 className="text-2xl font-bold text-slate-800 mb-8 leading-tight">{currentQuestion.question}</h3>
          
          <div className="grid grid-cols-1 gap-4">
            {currentQuestion.options.map((option: string, idx: number) => (
              <button
                key={idx}
                onClick={() => setAnswers({ ...answers, [currentQuestionIdx]: option })}
                className={clsx(
                  "text-left p-5 rounded-2xl border-2 transition-all duration-200 flex items-center gap-4 group",
                  answers[currentQuestionIdx] === option
                    ? "border-blue-600 bg-blue-50 text-blue-900 shadow-md ring-2 ring-blue-500/10"
                    : "border-slate-100 hover:border-slate-300 bg-white text-slate-700"
                )}
              >
                <div className={clsx(
                  "w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm",
                  answers[currentQuestionIdx] === option ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                )}>
                  {String.fromCharCode(65 + idx)}
                </div>
                <span className="font-bold">{option}</span>
              </button>
            ))}
          </div>

          <div className="mt-12 flex justify-end">
            <button
              disabled={!answers[currentQuestionIdx] || isSubmitting}
              onClick={handleNext}
              className="px-10 py-4 bg-slate-900 hover:bg-black disabled:opacity-30 disabled:cursor-not-allowed text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95"
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : (currentQuestionIdx === questions.length - 1 ? "Finish Exam" : "Next Question")}
              {!isSubmitting && <ArrowRight size={20} />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Result Step
  const isPassed = result?.success;
  return (
    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 p-12 text-center">
      <div className={clsx(
        "w-24 h-24 mx-auto rounded-3xl flex items-center justify-center mb-8 shadow-lg transform rotate-3",
        isPassed ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
      )}>
        {isPassed ? <Trophy size={48} /> : <AlertCircle size={48} />}
      </div>
      <h2 className="text-4xl font-black mb-2">{isPassed ? "Congratulations!" : "Keep Trying!"}</h2>
      <p className="text-slate-500 font-medium mb-8">
        Your score: <span className="text-slate-900 font-bold">{result.score} / {result.total}</span> ({Math.round((result.score/result.total)*100)}%)
      </p>
      
      {isPassed ? (
        <div className="bg-green-50 border border-green-100 p-6 rounded-2xl mb-8 text-left">
           <div className="flex items-center gap-4 mb-2">
              <CheckCircle2 className="text-green-600" />
              <h4 className="font-bold text-green-900">Achievement Unlocked!</h4>
           </div>
           <p className="text-green-800 text-sm font-medium">{result.achievement?.title}</p>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-100 p-6 rounded-2xl mb-8 text-left">
           <div className="flex items-center gap-4 mb-2">
              <XCircle className="text-red-600" />
              <h4 className="font-bold text-red-900">Certification Failed</h4>
           </div>
           <p className="text-red-800 text-sm font-medium">You need at least 70% to pass. Review the phase topics and try again when you're ready.</p>
        </div>
      )}

      <button
        onClick={() => {
            if (isPassed) onComplete(result.achievement);
            else onCancel();
        }}
        className="w-full py-5 bg-slate-900 hover:bg-black text-white font-black rounded-2xl shadow-xl transition-all active:scale-95"
      >
        {isPassed ? "Continue Learning" : "Back to Dashboard"}
      </button>
    </div>
  );
}
