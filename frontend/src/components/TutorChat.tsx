import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Bot, X, Sparkles, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { apiClient } from "../api/client";

interface Message {
  role: "user" | "bot";
  text: string;
}

interface TutorChatProps {
  planId: number | null;
  onPlanRefined: (updatedPlan: any) => void;
}

export default function TutorChat({ planId, onPlanRefined }: TutorChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", text: "I'm your AI Educational Tutor! How can I improve this learning plan for you?" }
  ]);
  const [input, setInput] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !planId || isRefining) return;
    
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setInput("");
    setIsRefining(true);

    try {
      const res = await apiClient.post(`/plans/${planId}/refine`, {
        message: userMsg
      });
      
      const data = res.data;
      
      if (data.data) {
        setMessages(prev => [...prev, { role: "bot", text: data.message || "I've updated your curriculum! Check out the changes in your timeline." }]);
        onPlanRefined(data.data);
      } else {
         setMessages(prev => [...prev, { role: "bot", text: "Sorry, I couldn't process that refinement. Try asking differently!" }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: "bot", text: "Connection error. Make sure the backend is running!" }]);
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center z-[100] cursor-pointer"
      >
        {isOpen ? <X size={28} /> : <MessageSquare size={28} />}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            className="fixed bottom-28 right-8 w-[380px] h-[500px] bg-white/90 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-2xl flex flex-col z-[99] overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Bot size={22} />
                 </div>
                 <div>
                    <h3 className="font-bold text-sm">AI Tutor Assistant</h3>
                    <p className="text-[10px] opacity-80">Ready to personalize your plan</p>
                 </div>
              </div>
              <Sparkles size={18} className="animate-pulse" />
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
               {messages.map((m, i) => (
                 <div key={i} className={clsx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                   <div className={clsx(
                     "max-w-[80%] p-3 rounded-2xl text-sm font-medium shadow-sm",
                     m.role === "user" ? "bg-blue-600 text-white rounded-tr-none" : "bg-white text-slate-700 border border-slate-100 rounded-tl-none"
                   )}>
                     {m.text}
                   </div>
                 </div>
               ))}
               {isRefining && (
                 <div className="flex justify-start">
                    <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-100 flex items-center gap-2">
                       <RefreshCw size={14} className="animate-spin text-blue-600" />
                       <span className="text-xs font-bold text-slate-400">AI is thinking...</span>
                    </div>
                 </div>
               )}
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Make week 2 harder..."
                className="flex-1 px-4 py-2 bg-slate-100 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button 
                onClick={handleSend}
                disabled={isRefining}
                className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition cursor-pointer"
              >
                <Send size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
