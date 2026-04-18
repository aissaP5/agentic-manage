import { useState } from "react";
import ReactMarkdown from "react-markdown";
import ResourceList from "./ResourceList";
import QuizComponent from "./QuizComponent";
import ExercisesComponent from "./ExercisesComponent";
import Playground from "./Playground";
import { BookOpen, Map, HelpCircle, Dumbbell, Code } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

export default function LessonViewer({ content }: { content: any }) {
  const [activeTab, setActiveTab] = useState<"learn" | "resources" | "quiz" | "practice" | "playground">("learn");

  if (!content) return null;

  const tabs = [
    { id: "learn", label: "Learn", icon: BookOpen },
    { id: "resources", label: "Resources", icon: Map },
    { id: "practice", label: "Exercises", icon: Dumbbell },
    { id: "playground", label: "Lab", icon: Code },
    { id: "quiz", label: "Quiz", icon: HelpCircle },
  ] as const;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden flex flex-col h-full min-h-[600px]">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-6 text-white shrink-0">
        <h2 className="text-2xl font-extrabold">{content.topic}</h2>
      </div>
      
      <div className="flex border-b border-slate-200 bg-slate-50/50 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={clsx(
              "flex-1 py-4 px-2 sm:px-6 flex items-center justify-center gap-1 sm:gap-2 font-bold text-xs sm:text-sm transition-colors border-b-2",
              activeTab === tab.id 
                ? "border-blue-600 text-blue-700 bg-white" 
                : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            )}
          >
            <tab.icon size={18} className="hidden sm:block" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-8 flex-1 overflow-y-auto bg-slate-50/30">
        <AnimatePresence mode="wait">
          {activeTab === "learn" && (
            <motion.div 
              key="learn"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {content.reasoning && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 shadow-sm">
                  <h3 className="text-indigo-800 font-bold mb-2 flex items-center gap-2">
                    <BookOpen size={18} /> Pediatric Approach (AI Reasoning)
                  </h3>
                  <p className="text-indigo-900/80 text-sm italic">{content.reasoning}</p>
                </div>
              )}

              {content.sections ? (
                <div className="space-y-8">
                  {content.sections.map((section: any, idx: number) => (
                    <div key={idx} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                      <div className="p-6 w-full">
                        <h3 className="text-xl font-bold text-slate-800 mb-4">{section.title}</h3>
                        <div className="prose prose-blue prose-sm max-w-none text-slate-600">
                          <ReactMarkdown>{section.content}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                 <div className="prose prose-blue max-w-none text-slate-700 bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                   <ReactMarkdown>{content.explanation || "No content provided."}</ReactMarkdown>
                 </div>
              )}
            </motion.div>
          )}

          {activeTab === "resources" && (
            <motion.div 
              key="resources"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <ResourceList resources={content.resources || []} />
            </motion.div>
          )}

          {activeTab === "practice" && (
            <motion.div 
              key="practice"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <ExercisesComponent exercises={content.exercises || []} />
            </motion.div>
          )}

          {activeTab === "playground" && (
            <motion.div 
              key="playground"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Playground initialCode={`<!-- Practice what you learned in: ${content.topic} -->\n<script>\n  console.log("Lab ready.");\n</script>`} />
            </motion.div>
          )}

          {activeTab === "quiz" && (
            <motion.div 
              key="quiz"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <QuizComponent topicName={content.topic} quiz={content.quiz || []} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
