import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import ResourceList from "./ResourceList";
import QuizComponent from "./QuizComponent";
import ExercisesComponent from "./ExercisesComponent";
import Playground from "./Playground";
import MermaidDiagram from "./MermaidDiagram";
import { BookOpen, Map, HelpCircle, Dumbbell, Code, Share2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { ThinkingProcess } from "./ThinkingProcess";
import AchievementOverlay from "./AchievementOverlay";
import { apiClient } from "../api/client";

export default function LessonViewer({ 
  content, 
  planId, 
  onActionComplete, 
  onTopicGenerated 
}: { 
  content: any, 
  planId: number | null, 
  onActionComplete?: (achievement?: any) => void,
  onTopicGenerated?: (newContent: any) => void
}) {
  const [activeTab, setActiveTab] = useState<"learn" | "visual" | "resources" | "quiz" | "practice" | "playground">("learn");
  const [isGenerating, setIsGenerating] = useState(false);
  const [thinkingLogs, setThinkingLogs] = useState<any[]>([]);
  const [earnedAchievement, setEarnedAchievement] = useState<any>(null);

  // Simulation of detail generation logs
  useEffect(() => {
    if (!isGenerating) {
        setThinkingLogs([]);
        return;
    }

    const steps = [
        { id: '1', agent: 'Architect', message: `Drafting lecture outline for [${content.topic}]...`, status: 'thinking' },
        { id: '2', agent: 'Researcher', message: 'Retrieving external documentation and resources...', status: 'waiting' },
        { id: '3', agent: 'Critic', message: 'Validating Mermaid syntax and quiz level...', status: 'waiting' }
    ];

    setThinkingLogs([steps[0]]);

    const timers = [
        setTimeout(() => setThinkingLogs(prev => [
            { ...prev[0], status: 'done', message: 'Outline finalized.' },
            { ...steps[1], status: 'thinking' }
        ]), 3000),
        setTimeout(() => setThinkingLogs(prev => [
            prev[0],
            { ...prev[1], status: 'done', message: 'External links gathered.' },
            { ...steps[2], status: 'thinking' }
        ]), 7000),
        setTimeout(() => setThinkingLogs(prev => [
            prev[0],
            prev[1],
            { ...prev[2], status: 'done', message: 'Content quality verified.' }
        ]), 10000)
    ];

    return () => timers.forEach(clearTimeout);
  }, [isGenerating]);

  const handleGenerate = async () => {
    console.log("🚀 Generation requested. PlanID:", planId, "Topic:", content?.topic);
    if (!planId || !content?.topic) {
        console.warn("⚠️ Cannot generate: missing PlanID or Topic name.");
        return;
    }
    setIsGenerating(true);
    try {
      console.log(`📡 Sending request to generate: ${content.topic}`);
      const res = await apiClient.post(`/plans/${planId}/topics/generate`, {
        topicName: content.topic
      });
      const data = res.data;
      if (data && data.data) {
        // Wait a token amount of time to show the "done" state of logs
        setTimeout(() => {
            onTopicGenerated?.(data.data);
            setIsGenerating(false);
        }, 1200);
      } else {
        console.error("Server error during generation:", data);
        alert(`Generation failed: ${data.details || data.error || "Unknown error"}`);
        setIsGenerating(false);
      }
    } catch (err) {
      console.error("Generation failed", err);
      setIsGenerating(false);
    }
  };

  if (!content) return null;

  const tabs = [
    { id: "learn", label: "Learn", icon: BookOpen },
    { id: "visual", label: "Visual", icon: Share2 },
    { id: "resources", label: "Resources", icon: Map },
    { id: "practice", label: "Exercises", icon: Dumbbell },
    { id: "playground", label: "Lab", icon: Code },
    { id: "quiz", label: "Quiz", icon: HelpCircle },
  ].filter(tab => tab.id !== "playground" || (content.labTemplate && content.labTemplate.length > 5)) as any;

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

      <div className="p-8 flex-1 overflow-y-auto bg-slate-50/30 relative">
        {isGenerating && (
            <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-sm flex items-center justify-center p-8">
                <div className="w-full max-w-2xl text-slate-800">
                    <ThinkingProcess logs={thinkingLogs} title={`Generating content for [${content.topic}]...`} />
                </div>
            </div>
        )}

        {!content.sections || content.sections.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-6">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 animate-pulse">
                    <Sparkles size={40} />
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">Ready to master this module?</h3>
                    <p className="text-slate-500 max-w-md mx-auto">
                        Your Agentic AI Assistant needs to research and draft the full content (lecture notes, diagrams, quizzes, and exercises) for this specific topic.
                    </p>
                </div>
                <button 
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                  <Sparkles size={20} />
                  {isGenerating ? "Researching..." : "Start AI Generation"}
                </button>
            </div>
        ) : (
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

              {Array.isArray(content.sections) ? (
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
                 <div className="py-20 px-8 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 shadow-inner max-w-2xl mx-auto">
                    {!isGenerating ? (
                        <>
                            <Sparkles className="mx-auto text-blue-500 mb-4 animate-pulse" size={48} />
                            <h3 className="text-2xl font-black text-slate-800 mb-2">Cours non encore généré</h3>
                            <p className="text-slate-500 mb-8 font-medium">
                            Ce module fait partie de votre plan, mais le contenu détaillé n'a pas encore été créé par l'IA pour économiser des ressources.
                            </p>
                            <button 
                            onClick={handleGenerate}
                            className="px-10 py-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl font-black text-lg shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all"
                            >
                            🚀 Débloquer ce cours maintenant
                            </button>
                        </>
                    ) : (
                        <div className="text-left">
                            <ThinkingProcess logs={thinkingLogs} />
                        </div>
                    )}
                 </div>
              )}
            </motion.div>
          )}

          {activeTab === "visual" && (
            <motion.div 
              key="visual"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="h-full flex items-center justify-center"
            >
              {content.mermaidDiagram ? (
                <div className="w-full">
                   <MermaidDiagram chart={content.mermaidDiagram} />
                </div>
              ) : (
                <div className="text-slate-400 font-medium">No visual diagram generated for this topic yet. Generate the course content first.</div>
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
              <ExercisesComponent 
                topicName={content.topic}
                exercises={content.exercises || []} 
                onEvaluate={(achievement) => {
                  if (achievement) setEarnedAchievement(achievement);
                  onActionComplete?.(achievement);
                }}
              />
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
              <Playground initialCode={content.labTemplate || `<!-- Practice what you learned in: ${content.topic} -->\n<script>\n  console.log("Lab ready.");\n</script>`} />
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
              <QuizComponent 
                topicName={content.topic} 
                quiz={content.quiz || []} 
                onComplete={(achievement) => {
                  if (achievement) setEarnedAchievement(achievement);
                  onActionComplete?.(achievement);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
        )}
      </div>
      
      <AchievementOverlay 
        achievement={earnedAchievement} 
        onComplete={() => setEarnedAchievement(null)} 
      />
    </div>
  );
}
