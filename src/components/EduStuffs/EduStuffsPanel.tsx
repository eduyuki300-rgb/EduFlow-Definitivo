import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, Plus, Trash2, Heart, Sparkles, Smile,
  ChevronDown, ChevronUp, Clock, Edit3, Save, 
  BookOpen, Dumbbell, CheckSquare, Flame, Calendar as CalendarIcon,
  ChevronRight, ChevronLeft, Tag as TagIcon, Loader2,
  CalendarCheck, Package, ArrowRightLeft, History, Target
} from 'lucide-react';
import { useEduStuffs } from '../../hooks/useEduStuffs';
import { EduStuff } from '../../types';
import { TaskDetailModal } from './TaskDetailModal';
import { DeferredDrawer } from './DeferredDrawer';
import { playSuccessSound } from '../../utils/audio';
import { parseTaskTitle } from '../../utils/smartParser';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TagOption {
  value: string;
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const DEFAULT_TAGS: TagOption[] = [
  { value: 'compromisso', label: 'Compromisso', emoji: '📅', color: 'text-blue-600', bgColor: 'bg-blue-100', borderColor: 'border-blue-200' },
  { value: 'aniversario', label: 'Aniversário', emoji: '🎂', color: 'text-pink-600', bgColor: 'bg-pink-100', borderColor: 'border-pink-200' },
  { value: 'financeiro', label: 'Financeiro', emoji: '💰', color: 'text-green-600', bgColor: 'bg-green-100', borderColor: 'border-green-200' },
  { value: 'trabalho', label: 'Trabalho', emoji: '💼', color: 'text-purple-600', bgColor: 'bg-purple-100', borderColor: 'border-purple-200' },
  { value: 'obrigacoes', label: 'Obrigações', emoji: '✅', color: 'text-orange-600', bgColor: 'bg-orange-100', borderColor: 'border-orange-200' },
  { value: 'pessoal', label: 'Pessoal', emoji: '✨', color: 'text-indigo-600', bgColor: 'bg-indigo-100', borderColor: 'border-indigo-200' },
];

const MOOD_EMOJIS = [
  { value: 1, emoji: '😢' },
  { value: 2, emoji: '😕' },
  { value: 3, emoji: '😐' },
  { value: 4, emoji: '🙂' },
  { value: 5, emoji: '🤩' },
];

const getTodayKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function EduStuffsPanel({ isOpen, onToggle, userId }: { isOpen: boolean, onToggle: () => void, userId: string }) {
  const { 
    stuffs, isLoading, dailyMood, setDailyMood, 
    addStuff, updateStuff, deleteStuff, toggleHabit 
  } = useEduStuffs(userId);
  
  const [customTags, setCustomTags] = useState<TagOption[]>(() => {
    const saved = localStorage.getItem(`custom_tags_${userId}`);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [selectedTask, setSelectedTask] = useState<EduStuff | null>(null);
  const [isDeferredDrawerOpen, setIsDeferredDrawerOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('pessoal');

  const TAG_OPTIONS = useMemo(() => [...DEFAULT_TAGS, ...customTags], [customTags]);

  const handleMoodSelect = useCallback((val: number) => {
    setDailyMood(val);
  }, [setDailyMood]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    
    const meta = parseTaskTitle(newTitle);
    let type: 'todo' | 'habit' = 'todo';
    if (newTitle.toLowerCase().startsWith('h:')) type = 'habit';
    
    await addStuff({
      title: newTitle,
      type,
      completed: false,
      category: meta.tags.length > 0 ? meta.tags[0] : selectedTag,
      priority: meta.priority || 'media',
      progress: 0,
    });
    setNewTitle('');
  };

  const getHabitIcon = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes('ler') || lower.includes('livro')) return <BookOpen size={16} />;
    if (lower.includes('atividade') || lower.includes('treino')) return <Dumbbell size={16} />;
    return <CheckCircle2 size={16} />;
  };

  const habits = stuffs.filter(s => s.type === 'habit');
  const todos = stuffs.filter(s => s.type === 'todo' && !s.completed && !s.isDeferred);
  const deferredTasks = stuffs.filter(s => s.isDeferred);
  const customHabits = habits.filter(h => h.habitType === 'custom' || !h.habitType);

  return (
    <motion.aside
      initial={false}
      animate={{ width: isOpen ? 480 : 0 }}
      transition={{ type: 'spring', bounce: 0.1, duration: 0.6 }}
      className={cn(
        "h-full fixed right-0 top-0 flex flex-col z-40 pointer-events-none overflow-hidden",
        isOpen && "glass-premium border-l border-white/20 shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.1)] pointer-events-auto"
      )}
    >
      {/* Toggle Button */}
      <button 
        onClick={onToggle} 
        className="absolute left-[-16px] top-[20%] w-4 h-24 bg-white/80 backdrop-blur-md border border-gray-200 hover:bg-white flex items-center justify-center transition-all group z-50 rounded-l-2xl shadow-lg pointer-events-auto"
      >
        {isOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col p-8 overflow-y-auto custom-scrollbar relative"
          >
            {/* 1. HEADER & MOOD BAR */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-black tracking-tighter text-gray-900 leading-tight">EDU STUFF'S</h2>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mt-1.5 opacity-70">Painel de Produtividade</p>
              </div>

              {/* Mood Discretíssimo */}
              <div className="flex items-center gap-1 bg-gray-50/50 p-1 rounded-xl border border-gray-100">
                {MOOD_EMOJIS.map((item) => (
                  <button 
                    key={item.value} 
                    onClick={() => handleMoodSelect(item.value)} 
                    className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center text-base transition-all",
                      dailyMood === item.value ? "bg-white shadow-xs scale-105" : "opacity-20 hover:opacity-100 grayscale hover:grayscale-0"
                    )}
                  >
                    {item.emoji}
                  </button>
                ))}
              </div>
            </div>

            <section className="mb-10">
              <form onSubmit={handleAdd}>
                <div className="relative group">
                  <div className="absolute -inset-1 bg-linear-to-r from-blue-400/10 to-indigo-400/10 rounded-[28px] blur-sm opacity-0 group-focus-within:opacity-100 transition-all" />
                  <div className="relative bg-white border border-gray-100 rounded-2xl p-1.5 shadow-xs group-focus-within:shadow-md transition-all flex items-center">
                    <input 
                      type="text" 
                      value={newTitle} 
                      onChange={(e) => setNewTitle(e.target.value)} 
                      placeholder="Nova missão... !alta #estudo às 15h ✨" 
                      className="flex-1 bg-transparent pl-4 py-2.5 text-sm font-bold text-gray-800 placeholder:text-gray-300 outline-none" 
                    />
                    <button type="submit" className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-white hover:bg-black transition-all">
                      <Plus size={20} strokeWidth={3} />
                    </button>
                  </div>
                </div>
                
                <div className="mt-3 flex flex-wrap gap-2">
                  {TAG_OPTIONS.slice(0, 4).map((tag) => (
                    <button 
                      key={tag.value}
                      type="button"
                      onClick={() => setSelectedTag(tag.value)}
                      className={cn(
                        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all",
                        selectedTag === tag.value ? tag.bgColor + " " + tag.borderColor + " " + tag.color : "bg-white border-gray-100 text-gray-300 hover:border-gray-200"
                      )}
                    >
                      {tag.emoji} {tag.label}
                    </button>
                  ))}
                </div>
              </form>
            </section>

          <section className="mb-10 flex-1">
            <div className="flex items-center justify-between mb-5">
               <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em] flex items-center gap-2">
                 <CheckSquare size={14} className="text-blue-500" /> Próximas Missões
               </h3>
               {deferredTasks.length > 0 && (
                   <button onClick={() => setIsDeferredDrawerOpen(true)} className="text-[9px] font-black uppercase text-blue-400 hover:text-blue-600 flex items-center gap-1.5 tracking-widest transition-all">
                     <History size={12} /> ({deferredTasks.length})
                   </button>
                 )}
              </div>
              
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {todos.map((todo) => {
                    const meta = parseTaskTitle(todo.title);
                    const tagOption = TAG_OPTIONS.find(t => t.value === todo.category) || TAG_OPTIONS[0];
                    
                    return (
                      <motion.div 
                        key={todo.id} 
                        layout
                        drag="x"
                        dragConstraints={{ left: -40, right: 100 }}
                        dragElastic={0.1}
                        onDragEnd={(_, info) => {
                          if (info.offset.x > 80) {
                            playSuccessSound(true);
                            updateStuff(todo.id, { isDeferred: true });
                          }
                        }}
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="group p-4 bg-white border border-gray-100 rounded-[24px] hover:shadow-xl hover:shadow-gray-200/40 transition-all cursor-pointer relative"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedTask(todo);
                        }}
                      >
                        <div className="flex items-center justify-between relative z-10 pointer-events-none">
                          <div className="flex items-center gap-4 flex-1">
                            <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center text-lg", tagOption.bgColor)}>{tagOption.emoji}</div>
                            <div>
                              <h4 className="text-sm font-bold text-gray-800 leading-snug">{meta.cleanTitle}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={cn("text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded", tagOption.bgColor, tagOption.color)}>{tagOption.label}</span>
                                {meta.time && <span className="text-[9px] font-black text-orange-400 uppercase flex items-center gap-1"><Clock size={10} /> {meta.time}</span>}
                                {meta.priority === 'alta' && <span className="text-[9px] font-black text-rose-500 uppercase flex items-center gap-1 tracking-tighter">!ALTA</span>}
                              </div>
                            </div>
                          </div>
                          
                          <button 
                            onClick={(e) => { 
                              e.preventDefault();
                              e.stopPropagation(); 
                              updateStuff(todo.id, { completed: true }); 
                              playSuccessSound(true); 
                            }} 
                            className="w-10 h-10 flex items-center justify-center text-gray-200 hover:text-emerald-500 rounded-xl transition-all pointer-events-auto"
                          >
                            <CheckCircle2 size={24} />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {todos.length === 0 && !isLoading && (
                  <div className="py-10 flex flex-col items-center justify-center opacity-30 text-center grayscale">
                    <CheckCircle2 size={32} className="mb-3 text-emerald-500" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Missões Cumpridas!</p>
                  </div>
                )}
              </div>
            </section>

            {/* 4. HÁBITOS (REDUZIDO) */}
            {customHabits.length > 0 && (
              <section className="mb-6">
                <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Consistência</h3>
                <div className="flex flex-wrap gap-2">
                  {customHabits.map((habit) => (
                    <button 
                      key={habit.id}
                      onClick={() => toggleHabit(habit)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-xl border transition-all",
                        habit.completedDates?.includes(getTodayKey()) 
                          ? "bg-emerald-500 border-emerald-400 text-white shadow-sm" 
                          : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                      )}
                    >
                      <span className="text-xs">{getHabitIcon(habit.title)}</span>
                      <span className="text-[10px] font-bold">{habit.title}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* COMPONENTES FLUTUANTES (Desacoplados do scroll) */}
      <AnimatePresence>
        {selectedTask && (
          <TaskDetailModal 
            task={selectedTask}
            isOpen={!!selectedTask}
            onClose={() => setSelectedTask(null)}
            onUpdate={updateStuff}
            onDelete={deleteStuff}
          />
        )}
      </AnimatePresence>

      <DeferredDrawer 
        tasks={deferredTasks}
        isOpen={isDeferredDrawerOpen}
        onClose={() => setIsDeferredDrawerOpen(false)}
        onReactivate={(id) => updateStuff(id, { isDeferred: false })}
        onDelete={deleteStuff}
      />
    </motion.aside>
  );
}
