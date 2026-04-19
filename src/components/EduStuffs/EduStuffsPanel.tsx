import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, Plus, Trash2, Heart, Sparkles, Smile,
  ChevronDown, ChevronUp, Clock, Edit3, Save, 
  BookOpen, Dumbbell, CheckSquare, Flame, Calendar as CalendarIcon,
  ChevronRight, ChevronLeft, Tag as TagIcon, Loader2,
  CalendarCheck, Package, ArrowRightLeft, History, Target, X, Check, Settings2, AlertCircle
} from 'lucide-react';
import { useEduStuffs } from '../../hooks/useEduStuffs';
import { useTags } from '../../hooks/useTags';
import { useUIWatcher } from '../../hooks/useUIWatcher';
import { useAutoRecovery } from '../../hooks/useAutoRecovery';
import { EduStuff } from '../../types';
import { TaskDetailModal } from './TaskDetailModal';
import { DeferredDrawer } from './DeferredDrawer';
import { TagManagerModal } from './TagManagerModal';
import { playSuccessSound } from '../../utils/audio';
import { parseTaskTitle } from '../../utils/smartParser';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const COLOR_MAP: Record<string, {bg: string, text: string, border: string}> = {
  blue:   { bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-300' },
  green:  { bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-300' },
  pink:   { bg: 'bg-pink-100',   text: 'text-pink-700',   border: 'border-pink-300' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  teal:   { bg: 'bg-teal-100',   text: 'text-teal-700',   border: 'border-teal-300' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
  red:    { bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-300' },
  amber:  { bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-300' },
  slate:  { bg: 'bg-slate-100',  text: 'text-slate-700',  border: 'border-slate-300' },
  rose:   { bg: 'bg-rose-100',   text: 'text-rose-700',   border: 'border-rose-300' },
  cyan:   { bg: 'bg-cyan-100',   text: 'text-cyan-700',   border: 'border-cyan-300' },
};

const DEFAULT_TAGS = [
  { id: 'compromisso', label: 'Compromisso', emoji: '📅', color: 'blue' },
  { id: 'aniversario', label: 'Aniversário', emoji: '🎂', color: 'pink' },
  { id: 'financeiro', label: 'Financeiro', emoji: '💰', color: 'green' },
  { id: 'trabalho', label: 'Trabalho', emoji: '💼', color: 'purple' },
  { id: 'obrigacoes', label: 'Obrigações', emoji: '✅', color: 'orange' },
];

const MOOD_EMOJIS = [
  { value: 1, emoji: '😢' },
  { value: 2, emoji: '😕' },
  { value: 3, emoji: '😐' },
  { value: 4, emoji: '🙂' },
  { value: 5, emoji: '🤩' },
];

const getTodayKey = () => {
  return new Date().toLocaleDateString('en-CA');
};

const getHabitIcon = (title: string) => {
  const lower = title.toLowerCase();
  if (lower.includes('ler') || lower.includes('livro')) return <BookOpen size={16} />;
  if (lower.includes('atividade') || lower.includes('treino')) return <Dumbbell size={16} />;
  return <CheckCircle2 size={16} />;
};

export function EduStuffsPanel({ isOpen, onToggle, userId }: { isOpen: boolean, onToggle: () => void, userId: string }) {
  const { 
    stuffs, isLoading, dailyMood, setDailyMood, 
    addStuff, updateStuff, deleteStuff, toggleHabit 
  } = useEduStuffs();
  
  const { tags: customDbTags } = useTags(userId);
  
  const [selectedTask, setSelectedTask] = useState<EduStuff | null>(null);
  const [isDeferredDrawerOpen, setIsDeferredDrawerOpen] = useState(false);
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('pessoal');
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  
  const panelId = 'planner-window';

  // 1. Ativa o cão de guarda para este componente específico
  useUIWatcher([panelId], 3000);
  
  // 2. Prepara a injeção de adrenalina (Autocura)
  const { recoveryKey, isRecovering } = useAutoRecovery(panelId, 'FORCE_REMOUNT');

  const TAG_OPTIONS = useMemo(() => [
    ...DEFAULT_TAGS,
    ...customDbTags.map(t => ({ id: t.id, label: t.label, emoji: t.emoji, color: t.color }))
  ], [customDbTags]);

  const handleMoodSelect = useCallback((val: number) => {
    setDailyMood(val);
  }, [setDailyMood]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    
    const meta = parseTaskTitle(newTitle);
    await addStuff({
      title: newTitle.trim(),
      type: newTitle.toLowerCase().startsWith('h:') ? 'habit' : 'todo',
      completed: false,
      category: meta.tags.length > 0 ? meta.tags[0] : selectedTag,
      priority: meta.priority || 'media',
    });
    setNewTitle('');
  };

  const habits = stuffs.filter(s => s.type === 'habit');
  const todos = stuffs.filter(s => s.type === 'todo' && !s.completed && !s.isDeferred);
  const deferredTasks = stuffs.filter(s => s.isDeferred);
  const customHabits = habits.filter(h => h.habitType === 'custom' || !h.habitType);

  // Filtragem e Agrupamento
  const filteredTodos = useMemo(() => {
    return activeTagFilter 
      ? todos.filter(t => t.tagId === activeTagFilter || t.category === activeTagFilter)
      : todos;
  }, [todos, activeTagFilter]);

  const { todayTasks, upcomingTasks } = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    const todayTasks: EduStuff[] = [];
    const upcomingTasks: EduStuff[] = [];

    filteredTodos.forEach(task => {
      const isTaskToday = task.dueDate && task.dueDate.slice(0, 10) === todayStr;
      if (isTaskToday) {
        todayTasks.push(task);
      } else {
        upcomingTasks.push(task);
      }
    });

    return { todayTasks, upcomingTasks };
  }, [filteredTodos]);

  if (isRecovering) return null; // Seguro para retornar aqui (após todos os hooks)

  return (
    <motion.aside
      key={`${panelId}-${recoveryKey}`}
      id={panelId}
      initial={false}
      animate={{ width: isOpen ? (typeof window !== 'undefined' && window.innerWidth < 768 ? '100%' : 460) : 0 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
      className={cn(
        "h-full fixed right-0 top-0 flex flex-col z-40 pointer-events-none overflow-hidden",
        isOpen && "glass-premium border-l border-white/20 shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.1)] pointer-events-auto"
      )}
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            key="edustuffs-content"
            id="planner-content-area"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 flex flex-col p-6 pt-14 overflow-y-auto custom-scrollbar relative"
          >
            {/* 1. HEADER */}
            <div className="flex items-start justify-between mb-8">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-gray-900 leading-none" style={{ fontFamily: 'Outfit, sans-serif' }}>EDU STUFF'S</h2>
                <div className="flex items-center gap-2 mt-2.5">
                  <div className="h-1 w-10 bg-indigo-500 rounded-full" />
                  <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.3em]">Ambiente de Elite</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => setIsTagManagerOpen(true)}
                  className="w-10 h-10 bg-white border border-gray-100 hover:border-indigo-200 text-gray-400 hover:text-indigo-500 rounded-xl flex items-center justify-center transition-all shadow-sm active:scale-95 group"
                >
                  <Settings2 size={18} className="group-hover:rotate-45 transition-transform" />
                </button>
                <button 
                  onClick={onToggle}
                  className="w-10 h-10 bg-gray-100/80 hover:bg-gray-200/80 text-gray-500 rounded-xl flex items-center justify-center transition-all shadow-sm active:scale-95"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* 2. MOOD BAR */}
            <div className="flex items-center gap-1.5 bg-gray-50/50 p-1.5 rounded-xl border border-gray-100 mb-8 w-fit mx-auto lg:mx-0">
               <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest px-1.5">Estado:</span>
              {MOOD_EMOJIS.map((item) => (
                <button 
                  key={item.value} 
                  onClick={() => handleMoodSelect(item.value)} 
                  className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center text-base transition-all",
                    dailyMood === item.value ? "bg-white shadow-md scale-110 z-10" : "opacity-30 hover:opacity-100 grayscale hover:grayscale-0"
                  )}
                >
                  {item.emoji}
                </button>
              ))}
            </div>

            {/* 3. INPUT SECTION */}
            <section className="mb-6">
              <form onSubmit={handleAdd}>
                <div className="relative group">
                  <div className="absolute -inset-1 bg-indigo-500/10 rounded-2xl blur-md opacity-0 group-focus-within:opacity-100 transition-all duration-500" />
                  <div className="relative bg-white border border-gray-100 rounded-[20px] p-1.5 shadow-sm group-focus-within:border-indigo-400 group-focus-within:shadow-xl group-focus-within:shadow-indigo-100 transition-all flex items-center">
                    <input 
                      type="text" 
                      value={newTitle} 
                      onChange={(e) => setNewTitle(e.target.value)} 
                      placeholder="Qual o próximo alvo? 🎯" 
                      className="flex-1 bg-transparent pl-4 py-2 text-base font-bold text-gray-800 placeholder:text-gray-300 outline-none" 
                    />
                    <button type="submit" className="px-5 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-[10px] tracking-widest hover:bg-indigo-700 shadow-xl transition-all active:scale-95">
                      FOCAR
                    </button>
                  </div>
                </div>
              </form>

              {/* TAG FILTERS (PILLS ROW) */}
              <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                <button 
                  onClick={() => setActiveTagFilter(null)}
                  className={cn(
                    "whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                    activeTagFilter === null ? "bg-gray-900 border-gray-900 text-white shadow-lg" : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                  )}
                >
                  Todas
                </button>
                {TAG_OPTIONS.map(tag => {
                   const colorData = COLOR_MAP[tag.color] || COLOR_MAP.slate;
                   const isActive = activeTagFilter === tag.id;
                   return (
                     <button 
                       key={tag.id}
                       onClick={() => setActiveTagFilter(isActive ? null : tag.id)}
                       className={cn(
                         "whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-2",
                         isActive 
                           ? cn(colorData.bg, colorData.text, colorData.border, "shadow-md scale-105") 
                           : "bg-white border-gray-100 text-gray-300 hover:border-gray-200"
                       )}
                     >
                       <span>{tag.emoji}</span>
                       {tag.label}
                     </button>
                   );
                })}
              </div>
            </section>

            {/* 4. TAREFAS HOJE */}
            {todayTasks.length > 0 && (
              <section className="mb-10">
                <div className="flex items-center justify-between mb-6 px-1">
                  <h3 className="text-[10px] font-black text-orange-600 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" /> 🔥 HOJE
                    <span className="bg-orange-100 px-1.5 py-0.5 rounded text-[8px]">{todayTasks.length}</span>
                  </h3>
                </div>
                <div className="space-y-4">
                  {todayTasks.map(task => renderTaskCard(task))}
                </div>
              </section>
            )}

            {/* 5. PRÓXIMAS MISSÕES */}
            <section className="mb-10 flex-1">
              <div className="flex items-center justify-between mb-6 px-1">
                <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full" /> PRÓXIMAS MISSÕES
                </h3>
              </div>
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {upcomingTasks.map(task => renderTaskCard(task))}
                </AnimatePresence>
                {filteredTodos.length === 0 && !isLoading && (
                  <div className="py-20 text-center opacity-30">
                    <Sparkles size={32} className="mx-auto text-emerald-500 mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Missão Cumprida</p>
                  </div>
                )}
              </div>
            </section>

            {/* 6. FAB ADIADAS */}
            {deferredTasks.length > 0 && (
              <button 
                onClick={() => setIsDeferredDrawerOpen(true)}
                className="absolute bottom-6 left-6 flex items-center gap-3 bg-white border border-gray-100 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] hover:shadow-xl hover:-translate-y-1 transition-all px-5 py-3 rounded-2xl group z-20 pointer-events-auto"
              >
                <div className="bg-amber-100 p-1.5 rounded-lg text-amber-600 group-hover:rotate-12 transition-transform">
                  <History size={16} />
                </div>
                <div>
                   <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Adiadas</p>
                   <p className="text-[11px] font-bold text-gray-900 leading-none">{deferredTasks.length} <span className="text-gray-400">tarefas</span></p>
                </div>
              </button>
            )}

            {/* 7. HABITS */}
            {customHabits.length > 0 && (
              <section className="mt-auto pt-8 border-t border-gray-100">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">ROTINAS</h3>
                <div className="flex flex-wrap gap-2">
                  {customHabits.map((habit) => (
                    <button 
                      key={habit.id}
                      onClick={() => toggleHabit(habit)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-xl border transition-all",
                        habit.completedDates?.includes(getTodayKey()) 
                          ? "bg-emerald-600 border-emerald-500 text-white shadow-md scale-105" 
                          : "bg-white border-gray-100 text-gray-500 hover:border-gray-200"
                      )}
                    >
                      <span className="text-xs">{getHabitIcon(habit.title)}</span>
                      <span className="text-[10px] font-bold tracking-tight uppercase">{habit.title}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALS */}
      <AnimatePresence>
        {selectedTask && (
          <TaskDetailModal 
            task={selectedTask}
            isOpen={!!selectedTask}
            onClose={() => setSelectedTask(null)}
            onUpdate={updateStuff}
            onDelete={deleteStuff}
            tags={customDbTags}
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

      <TagManagerModal 
        isOpen={isTagManagerOpen}
        onClose={() => setIsTagManagerOpen(false)}
        userId={userId}
      />
    </motion.aside>
  );

  function renderTaskCard(task: EduStuff) {
    const meta = parseTaskTitle(task.title);
    const tagOption = TAG_OPTIONS.find(t => t.id === task.category) || DEFAULT_TAGS[4];
    const colorData = COLOR_MAP[tagOption.color] || COLOR_MAP.slate;
    
    const todayStr = new Date().toLocaleDateString('en-CA');
    const isOverdue = task.dueDate && task.dueDate.slice(0, 10) < todayStr && !task.completed;
    const isTaskToday = task.dueDate && task.dueDate.slice(0, 10) === todayStr;
    const completedSub = task.subtasks?.filter(s => s.completed).length || 0;
    const totalSub = task.subtasks?.length || 0;

    return (
      <motion.div 
        key={task.id} 
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="group p-4 bg-white border border-gray-100 rounded-2xl hover:border-indigo-200 hover:shadow-lg transition-all cursor-pointer relative"
        onClick={() => setSelectedTask(task)}
      >
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4 flex-1">
            <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-sm border border-white shrink-0", colorData.bg)}>{tagOption.emoji}</div>
            <div className="flex-1 min-w-0">
               <div className="flex items-center flex-wrap gap-2 mb-1">
                 <span className={cn("text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border leading-none", colorData.bg, colorData.text, colorData.border)}>
                   {tagOption.label}
                 </span>
                 
                 {isOverdue && <span className="text-[7px] font-black text-white bg-rose-500 px-1.5 py-0.5 rounded uppercase leading-none">ATRASADO</span>}
                 {!isOverdue && isTaskToday && <span className="text-[7px] font-black text-white bg-orange-500 px-1.5 py-0.5 rounded uppercase leading-none">HOJE</span>}
                 
                 {task.status === 'doing' && (
                   <div className="flex items-center gap-1.5 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                     <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                     <span className="text-[7px] font-black text-blue-600 uppercase">FAZENDO</span>
                   </div>
                 )}
                 {task.status === 'blocked' && (
                   <div className="flex items-center gap-1.5 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                     <AlertCircle size={8} className="text-rose-500" />
                     <span className="text-[7px] font-black text-rose-600 uppercase">BLOQUEADO</span>
                   </div>
                 )}
               </div>
               
               <h4 className="text-sm font-bold text-gray-800 leading-tight group-hover:text-indigo-600 transition-colors truncate">
                 {meta.cleanTitle}
               </h4>
               
               {totalSub > 0 && (
                 <p className="text-[9px] font-bold text-gray-400 mt-1.5 flex items-center gap-1">
                   <div className={cn("w-1 h-1 rounded-full", completedSub === totalSub ? "bg-emerald-500" : "bg-gray-300")} />
                   ✓ {completedSub}/{totalSub} subtarefas
                 </p>
               )}
            </div>
          </div>
          
          <button 
            onClick={(e) => { 
                e.stopPropagation(); 
                updateStuff(task.id, { completed: true, completedAt: new Date().toISOString() }); 
                playSuccessSound(true);
            }} 
            className="w-10 h-10 flex items-center justify-center bg-gray-50 text-gray-200 hover:bg-emerald-500 hover:text-white rounded-xl transition-all shadow-sm shrink-0"
          >
            <Check size={18} strokeWidth={3} />
          </button>
        </div>
      </motion.div>
    );
  }
}
