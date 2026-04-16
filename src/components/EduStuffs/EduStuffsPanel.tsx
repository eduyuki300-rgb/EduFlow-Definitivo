import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, Circle, Plus, Trash2, Heart, 
  MessageCircle, ShoppingBag, Home, User, 
  ChevronRight, ChevronLeft, Sparkles, Smile,
  ChevronDown, ChevronUp, History, Clock, Edit3, Save, CheckCircle
} from 'lucide-react';
import { useEduStuffs, EduStuff } from '../../hooks/useEduStuffs';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function EduStuffsPanel({ isOpen, onToggle, userId }: { isOpen: boolean, onToggle: () => void, userId: string }) {
  const { stuffs, isLoading, addStuff, updateStuff, deleteStuff, toggleHabit } = useEduStuffs(userId);
  const [newTitle, setNewTitle] = useState('');
  const [activeTab, setActiveTab] = useState<'hoje' | 'historico'>('hoje');
  const [mood, setMood] = useState<number | null>(() => {
    const saved = localStorage.getItem(`mood_${new Date().toDateString()}`);
    return saved ? parseInt(saved) : null;
  });
  const [moodNote, setMoodNote] = useState(() => {
    return localStorage.getItem(`mood_note_${new Date().toDateString()}`) || '';
  });
  const [isMoodNoteOpen, setIsMoodNoteOpen] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    // Basic Smart Parsing
    let type: 'todo' | 'habit' = 'todo';
    if (newTitle.toLowerCase().startsWith('h:') || newTitle.toLowerCase().includes('hábito')) {
      type = 'habit';
    }

    await addStuff({
      title: newTitle.replace('h:', '').trim(),
      type,
      completed: false,
    });
    setNewTitle('');
  };

  const handleMoodSelect = (val: number) => {
    setMood(val);
    localStorage.setItem(`mood_${new Date().toDateString()}`, val.toString());
  };

  const handleSaveMoodNote = () => {
    localStorage.setItem(`mood_note_${new Date().toDateString()}`, moodNote);
    setIsMoodNoteOpen(false);
  };

  const extractTime = (title: string) => {
    const timeMatch = title.match(/às\s+(\d{1,2}[:h]\d{0,2})/i);
    return timeMatch ? timeMatch[1].replace('h', ':') : null;
  };

  const habits = stuffs.filter(s => s.type === 'habit');
  const todos = stuffs.filter(s => s.type === 'todo' && !s.completed);

  return (
    <motion.aside
      initial={false}
      animate={{ width: isOpen ? 360 : 64 }}
      className={cn(
        "h-full relative transition-all duration-500 flex flex-col glass-premium border-l border-white/20 shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.1)] z-40 overflow-hidden",
        !isOpen && "items-center"
      )}
    >
      {/* Toggle Handle */}
      <button 
        onClick={onToggle}
        className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-20 bg-black/5 hover:bg-black/10 flex items-center justify-center transition-colors group z-50 rounded-r-lg"
      >
        {isOpen ? <ChevronRight size={14} className="text-gray-400 group-hover:text-gray-600" /> : <ChevronLeft size={14} className="text-gray-400 group-hover:text-gray-600" />}
      </button>

      {isOpen ? (
        <div className="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-right-4 duration-500">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-lg font-black tracking-tighter text-gray-900 leading-none">EDU STUFF'S</h2>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Vida & Equilíbrio</p>
            </div>
            <Sparkles size={18} className="text-amber-400 animate-pulse" />
          </div>

          {/* Mood Tracker */}
          <div className="mb-8 p-4 bg-white/40 border border-white/60 rounded-3xl shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 text-center">Humor de Hoje</p>
            <div className="flex justify-between items-center px-2">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  onClick={() => handleMoodSelect(val)}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110",
                    mood === val ? "bg-orange-100 text-orange-600 scale-110 shadow-sm" : "hover:bg-gray-50 text-gray-300"
                  )}
                >
                  <Smile size={20} strokeWidth={mood === val ? 2.5 : 1.5} />
                </button>
              ))}
            </div>

            <AnimatePresence>
              {mood !== null && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="mt-4 pt-4 border-t border-white/40"
                >
                  {isMoodNoteOpen ? (
                    <div className="space-y-2">
                      <textarea
                        value={moodNote}
                        onChange={(e) => setMoodNote(e.target.value)}
                        placeholder="O que aconteceu hoje?"
                        className="w-full bg-white/60 border border-white/80 rounded-2xl px-3 py-2 text-[10px] font-medium focus:ring-1 focus:ring-orange-200 outline-none resize-none h-16"
                      />
                      <button 
                        onClick={handleSaveMoodNote}
                        className="w-full py-1.5 bg-orange-500 text-white rounded-xl text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                      >
                        <Save size={12} /> Salvar Reflexão
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setIsMoodNoteOpen(true)}
                      className="w-full py-2 bg-white/40 hover:bg-white/60 rounded-xl text-[9px] font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                      {moodNote ? <Edit3 size={12} /> : <Plus size={12} />}
                      {moodNote ? 'Editar Reflexão' : 'Adicionar Reflexão'}
                    </button>
                  )}
                  {moodNote && !isMoodNoteOpen && (
                    <p className="mt-2 text-[10px] text-gray-500 italic px-2 line-clamp-2">"{moodNote}"</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Habit Matrix */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Hábitos Ativos</h3>
              <span className="text-[10px] font-bold text-orange-500">{habits.length}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {habits.map((habit) => (
                <button
                  key={habit.id}
                  onClick={() => toggleHabit(habit)}
                  className="p-3 glass-card rounded-2xl flex flex-col gap-2 items-start hover:scale-[1.02] transition-all group border-orange-100/30"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                      habit.streak > 0 ? "bg-orange-50 text-orange-500" : "bg-gray-50 text-gray-300"
                    )}>
                      <CheckCircle2 size={16} />
                    </div>
                    <span className="text-[10px] font-black text-orange-500/50">{habit.streak}🔥</span>
                  </div>
                  <span className="text-[10px] font-bold text-gray-700 truncate w-full text-left uppercase tracking-tight">
                    {habit.title}
                  </span>
                  {/* Heatmap Micro-Dots */}
                  <div className="flex gap-1 mt-1">
                    {[...Array(7)].map((_, i) => (
                      <div 
                        key={i} 
                        className={cn(
                          "w-1 h-1 rounded-full",
                          i === 6 && habit.streak > 0 ? "bg-orange-400" : "bg-gray-100"
                        )} 
                      />
                    ))}
                  </div>
                </button>
              ))}
              <button className="p-3 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col gap-2 items-center justify-center hover:bg-white/50 transition-all opacity-40 hover:opacity-100 group">
                <Plus size={16} className="text-gray-400 group-hover:text-orange-500" />
                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Novo</span>
              </button>
            </div>
          </section>

          {/* Quick Tasks */}
          <section className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lembretes & Tarefas</h3>
              <History size={14} className="text-gray-300 hover:text-gray-900 cursor-pointer transition-colors" />
            </div>

            <form onSubmit={handleAdd} className="mb-4 relative group">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Anotar algo... (h: para hábito)"
                className="w-full bg-white/60 border border-white/80 rounded-2xl px-4 py-3 text-xs font-medium focus:ring-2 focus:ring-orange-100 outline-none transition-all placeholder:text-gray-300"
              />
              <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-orange-500 text-white rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-orange-200">
                <Plus size={16} />
              </button>
            </form>

            <div className="space-y-2">
              {todos.map((todo) => (
                 <motion.div 
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={{ scale: 1.01, backgroundColor: 'rgba(255, 255, 255, 0.7)' }}
                  whileTap={{ scale: 0.98 }}
                  key={todo.id} 
                  className="flex items-center group gap-3 p-3 bg-white/40 rounded-2xl border border-white/60 transition-all cursor-pointer"
                  onClick={() => updateStuff(todo.id, { completed: true })}
                >
                  <motion.div
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.8 }}
                  >
                    <Circle size={16} className="text-gray-300 group-hover:text-orange-500 transition-colors" />
                  </motion.div>
                   <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-gray-700 truncate uppercase tracking-tight">{todo.title}</p>
                    {extractTime(todo.title) && (
                      <div className="flex items-center gap-1 mt-1">
                        <div className="px-1.5 py-0.5 bg-orange-50 border border-orange-100 rounded-md flex items-center gap-1 scale-90 origin-left">
                          <Clock size={8} className="text-orange-500" />
                          <span className="text-[8px] font-black text-orange-600">{extractTime(todo.title)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteStuff(todo.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-rose-500 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </motion.div>
              ))}
              
              {todos.length === 0 && (
                <div className="py-12 flex flex-col items-center justify-center opacity-20 grayscale">
                  <Heart size={32} />
                  <p className="text-[10px] font-bold uppercase tracking-widest mt-4">Vida Organizada</p>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center py-8 gap-10 opacity-40 hover:opacity-100 transition-opacity">
          <History size={20} className="text-gray-400" />
          <div className="w-px h-12 bg-black/5" />
          <CheckCircle2 size={20} className="text-emerald-400" />
          <Smile size={20} className="text-orange-400" />
        </div>
      )}
    </motion.aside>
  );
}
