import { useLocation, Navigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import PlanDisplay from "./PlanDisplay";
import LessonViewer from "./LessonViewer";
import TutorChat from "./TutorChat";
import ErrorBoundary from "./ErrorBoundary";
import { motion, AnimatePresence } from "framer-motion";
import { PlusCircle, Target, BookMarked, ChevronLeft, ChevronRight, Layout, Sparkles, Trash2, Trophy } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import clsx from "clsx";
import { apiClient } from "../api/client";

export default function Dashboard() {
  const location = useLocation();
  const initialPlan = location.state?.planData?.data;
  const { user } = useAuth();

  const [activePlan, setActivePlan] = useState<any>(initialPlan);
  const [currentPlanId, setCurrentPlanId] = useState<number | null>(location.state?.planData?.planId || null);
  const [allPlans, setAllPlans] = useState<any[]>([]);
  const [plansLoaded, setPlansLoaded] = useState(false);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [stats, setStats] = useState({ xp: 0, level: "Beginner", mastered: 0 });
  const [achievements, setAchievements] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeExam, setActiveExam] = useState<any>(null);
  const [examLoading, setExamLoading] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, planId: number | null }>({ isOpen: false, planId: null });

  // Fetch Stats
  const fetchStats = () => {
    if (user?.id) {
      apiClient.get(`/users/${user.id}/stats`)
        .then(res => {
            const data = res.data;
            if (data && typeof data.xp === "number") setStats(data);
        })
        .catch(err => console.error("Failed to load stats", err));

      apiClient.get(`/users/${user.id}/achievements`)
        .then(res => setAchievements(res.data))
        .catch(err => console.error("Failed to load achievements", err));
    }
  };

  // Fetch All Plans for Sidebar
  const fetchPlans = () => {
    if (user?.id) {
      apiClient.get(`/users/${user.id}/plans`)
        .then(res => {
          const data = res.data;
          setAllPlans(data);
          // If we don't have an active plan (e.g. direct nav), pick the first one
          if (!activePlan && data.length > 0) {
            setActivePlan(data[0].planData);
            setCurrentPlanId(data[0].id);
          }
        })
        .catch(err => console.error("Failed to load plans", err))
        .finally(() => setPlansLoaded(true));
    } else {
      setPlansLoaded(true);
    }
  };
 
  const handleDeletePlan = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setDeleteModal({ isOpen: true, planId: id });
  };

  const confirmDelete = async () => {
    const id = deleteModal.planId;
    if (!id) return;
    
    try {
      const resp = await apiClient.delete(`/plans/${id}`);
      console.log("✅ Delete response from server:", resp.data);
      
      const updatedPlans = allPlans.filter(p => p.id !== id);
      setAllPlans(updatedPlans);

      if (currentPlanId === id) {
        if (updatedPlans.length > 0) {
          setActivePlan(updatedPlans[0].planData);
          setCurrentPlanId(updatedPlans[0].id);
        } else {
          setActivePlan(null);
          setCurrentPlanId(null);
        }
      }
      setDeleteModal({ isOpen: false, planId: null });
    } catch (err: any) {
      console.error("❌ Failed to delete plan:", err.response?.data || err.message);
      alert("Deletion failed. See console for details.");
      setDeleteModal({ isOpen: false, planId: null });
    }
  };

  useEffect(() => {
    fetchStats();
    fetchPlans();
  }, [user]);

  useEffect(() => {
    // Bind global callback for PlanDisplay
    (window as any).onStartPhaseExam = handleStartExam;
    return () => { delete (window as any).onStartPhaseExam; };
  }, [currentPlanId]);

  const handleStartExam = async (phaseIndex: number, phase: any) => {
    setExamLoading(true);
    try {
      const res = await apiClient.post(`/plans/${currentPlanId}/phases/${phaseIndex}/exam`);
      setActiveExam({
        phaseIndex,
        data: res.data.data
      });
    } catch (err) {
      console.error("Failed to generate exam", err);
      alert("Failed to generate exam. Please try again.");
    } finally {
      setExamLoading(false);
    }
  };

  if (!user) return <Navigate to="/" replace />;
  if (!plansLoaded) return <div className="flex items-center justify-center min-h-screen text-slate-500 font-medium">Loading your courses...</div>;
  if (!activePlan && allPlans.length === 0) return <Navigate to="/" replace />;

  const currentPlan = activePlan || allPlans[0]?.planData;
  if (!currentPlan) return null;

  const contentArray = Array.isArray(currentPlan.content) ? currentPlan.content : [];
  
  // Find real content OR create a placeholder if the user clicked a topic that isn't generated yet
  let activeContent = contentArray.find((c: any) => c.topic === activeTopic);
  
  if (!activeContent && activeTopic) {
    activeContent = { topic: activeTopic, sections: [] };
  } else if (!activeContent) {
    activeContent = contentArray[0] || { topic: "Welcome", sections: [] };
  }

  const aiGeneratedTopics = contentArray.length;

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-120px)] relative">
      {/* Sidebar Toggle */}
      <button 
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-24 left-4 z-[60] p-1.5 bg-white border border-slate-200 rounded-full shadow-md text-slate-400 hover:text-blue-600 transition md:flex hidden"
      >
        {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      {/* Subject Switcher Sidebar */}
      <motion.div 
        animate={{ width: sidebarOpen ? 280 : 0 }}
        className={clsx(
          "bg-white border-r border-slate-200 overflow-hidden relative transition-all duration-300",
          !sidebarOpen && "border-none"
        )}
      >
        <div className="p-6 w-[280px]">
          <div className="flex items-center gap-2 mb-6 text-slate-800">
            <BookMarked className="text-blue-600" size={20} />
            <h2 className="font-bold text-lg uppercase tracking-wider">My Courses</h2>
          </div>
          
          <div className="space-y-3">
             {allPlans.map((p) => {
               const isSelected = p.id === currentPlanId;
               return (
                  <div key={p.id} className="group relative">
                    <button
                      onClick={() => {
                        setActivePlan(p.planData);
                        setCurrentPlanId(p.id);
                        setActiveTopic(null);
                      }}
                      className={clsx(
                        "w-full text-left p-3 pr-10 rounded-xl text-sm font-bold transition-all border flex flex-col",
                        isSelected 
                          ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm"
                          : "bg-white border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                      )}
                    >
                      <span className="truncate">{p.topic}</span>
                      <span className="text-[10px] opacity-50 font-normal">{new Date(p.createdAt).toLocaleDateString()}</span>
                    </button>
                    <button 
                      onClick={(e) => handleDeletePlan(e, p.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
               )
             })}
          </div>

          <Link 
            to="/" 
            state={{ forceNew: true }}
            className="mt-8 w-full py-3 px-4 bg-slate-900 hover:bg-black text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-lg"
          >
            <PlusCircle size={18} /> New Subject
          </Link>
        </div>
      </motion.div>

      {/* Main Dashboard Content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-1/3 flex flex-col gap-6">
          {/* User Profile Hook */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full blur-3xl opacity-20 -mr-10 -mt-10"></div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-14 h-14 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md ring-2 ring-white/10 uppercase">
                {user.name.substring(0, 2)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white leading-tight">{user.name}</h2>
                <p className="text-slate-400 text-sm font-medium">Level: {stats.level}</p>
              </div>
            </div>
            <div className="mt-5 pt-5 border-t border-slate-800 relative z-10 flex justify-between">
              <div>
                 <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">XP</div>
                 <div className="text-xl font-bold text-indigo-400">{stats.xp.toLocaleString()}</div>
              </div>
              <div>
                 <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Mastered</div>
                 <div className="text-xl font-bold text-blue-400">{stats.mastered}</div>
              </div>
            </div>
          </div>

          {/* Achievements Sidebar Section */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="text-amber-500" size={20} />
              <h3 className="font-bold text-slate-800">Achievements</h3>
            </div>
            {achievements.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No achievements yet. Complete your first module!</p>
            ) : (
              <div className="space-y-3">
                {achievements.slice(0, 3).map((ach, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 shrink-0">
                      <Trophy size={14} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate">{ach.title}</div>
                      <div className="text-[10px] text-slate-500 truncate">{ach.description}</div>
                    </div>
                  </div>
                ))}
                {achievements.length > 3 && (
                  <button className="text-[10px] font-bold text-blue-600 hover:underline w-full text-center mt-2">
                    View all {achievements.length} achievements
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Current Plan Overview */}
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <Target className="text-blue-600" size={24} />
              <h2 className="text-xl font-bold text-slate-800">Current Path</h2>
            </div>
            <p className="text-slate-600 font-medium mb-3">{currentPlan.goal}</p>
            <div className="text-xs font-bold text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 uppercase tracking-tighter">
              {aiGeneratedTopics} modules generated for this path
            </div>
          </div>
          
          <PlanDisplay 
            plan={currentPlan.plan} 
            onSelectTopic={setActiveTopic} 
            activeTopic={activeTopic || activeContent?.topic || ""} 
          />
        </div>

        <div className="w-full lg:w-2/3">
          {activeContent ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={activeContent.topic}>
               <ErrorBoundary>
                 <LessonViewer 
                   content={activeContent} 
                   planId={currentPlanId}
                   onActionComplete={(_achievement?: any) => fetchStats()}
                   onTopicGenerated={(newTopicDetails) => {
                      setActivePlan((prev: any) => {
                        const updated = { ...prev };
                        updated.content = updated.content.filter((c: any) => c.topic !== newTopicDetails.topic);
                        updated.content.push(newTopicDetails);
                        return updated;
                      });
                      // Also update allPlans to persist in session
                      setAllPlans(prev => prev.map(p => p.id === currentPlanId ? { ...p, planData: { ...p.planData, content: [...p.planData.content.filter((c: any) => c.topic !== newTopicDetails.topic), newTopicDetails] } } : p));
                   }}
                 />
               </ErrorBoundary>
            </motion.div>
          ) : (
            <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
              Select a module from the pathway to start.
            </div>
          )}
        </div>
      </div>

      {/* AI Tutor Chatbot */}
      <TutorChat 
        planId={currentPlanId} 
        onPlanRefined={(updatedPlan) => {
          setActivePlan(updatedPlan);
          // Also update the item in allPlans list to keep it in sync
          setAllPlans(prev => prev.map(p => p.id === currentPlanId ? { ...p, planData: updatedPlan } : p));
        }} 
      />

      {/* Phase Exam Overlay */}
      <AnimatePresence>
        {(activeExam || examLoading) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12 bg-slate-900/90 backdrop-blur-md"
          >
            <div className="w-full max-w-3xl relative">
              {examLoading ? (
                <div className="bg-white rounded-3xl p-20 flex flex-col items-center justify-center text-center shadow-2xl">
                  <div className="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-8"></div>
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">AI Examiner is drafting your test...</h2>
                  <p className="text-slate-400 mt-2 font-medium">Analyzing course topics to generate challenging questions.</p>
                </div>
              ) : (
                <PhaseExamComponent 
                  planId={currentPlanId!}
                  phaseIndex={activeExam.phaseIndex}
                  exam={activeExam.data}
                  onCancel={() => setActiveExam(null)}
                  onComplete={(achievement) => {
                    setActiveExam(null);
                    if (achievement) fetchStats();
                  }}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Confirmation Modal */}
      <ConfirmModal 
        isOpen={deleteModal.isOpen}
        title="Delete Course?"
        message="Are you sure you want to delete this course? This action cannot be undone and all your progress for this subject will be lost."
        confirmText="Yes, Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, planId: null })}
      />
    </div>
  );
}
import PhaseExamComponent from "./PhaseExamComponent";
import ConfirmModal from "./ConfirmModal";
