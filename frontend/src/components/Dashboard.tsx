import { useLocation, Navigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import PlanDisplay from "./PlanDisplay";
import LessonViewer from "./LessonViewer";
import TutorChat from "./TutorChat";
import { motion, AnimatePresence } from "framer-motion";
import { PlusCircle, Target, BookMarked, ChevronLeft, ChevronRight, Layout } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import clsx from "clsx";

export default function Dashboard() {
  const location = useLocation();
  const initialPlan = location.state?.planData?.data;
  const { user } = useAuth();

  const [activePlan, setActivePlan] = useState<any>(initialPlan);
  const [currentPlanId, setCurrentPlanId] = useState<number | null>(location.state?.planData?.planId || null);
  const [allPlans, setAllPlans] = useState<any[]>([]);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [stats, setStats] = useState({ xp: 0, level: "Beginner", mastered: 0 });
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Fetch Stats
  const fetchStats = () => {
    if (user?.id) {
      fetch(`http://localhost:3000/api/users/${user.id}/stats`)
        .then(res => res.json())
        .then(data => {
            if (data && typeof data.xp === "number") setStats(data);
        })
        .catch(err => console.error("Failed to load stats", err));
    }
  };

  // Fetch All Plans for Sidebar
  const fetchPlans = () => {
    if (user?.id) {
      fetch(`http://localhost:3000/api/users/${user.id}/plans`)
        .then(res => res.json())
        .then(data => {
          setAllPlans(data);
          // If we don't have an active plan (e.g. direct nav), pick the first one
          if (!activePlan && data.length > 0) {
            setActivePlan(data[0].planData);
            setCurrentPlanId(data[0].id);
          }
        })
        .catch(err => console.error("Failed to load plans", err));
    }
  };

  useEffect(() => {
    fetchStats();
    fetchPlans();
  }, [user]);

  if (!user) return <Navigate to="/" replace />;
  if (!activePlan && allPlans.length === 0) return <Navigate to="/" replace />;

  const currentPlan = activePlan || allPlans[0]?.planData;
  if (!currentPlan) return null;

  const activeContent = currentPlan.content.find((c: any) => c.topic === activeTopic) || currentPlan.content[0];
  const aiGeneratedTopics = currentPlan.content.length;

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
                 <button
                   key={p.id}
                   onClick={() => {
                     setActivePlan(p.planData);
                     setCurrentPlanId(p.id);
                     setActiveTopic(null);
                   }}
                   className={clsx(
                     "w-full text-left p-3 rounded-xl text-sm font-bold transition-all border",
                     isSelected 
                       ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm"
                       : "bg-white border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                   )}
                 >
                   {p.topic}
                 </button>
               )
             })}
          </div>

          <Link 
            to="/" 
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
            activeTopic={activeTopic || activeContent.topic} 
          />
        </div>

        <div className="w-full lg:w-2/3">
          {activeContent ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={activeContent.topic}>
               <LessonViewer content={activeContent} />
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
    </div>
  );
}
