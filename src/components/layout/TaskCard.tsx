import React from 'react';
import { motion } from 'motion/react';
import { 
  CheckCircle2, Circle, Play, Pencil, ChevronDown, ChevronUp, Clock, Target, Check, BookOpen, Brain 
} from 'lucide-react';
import { Task, Status } from '../../types';
import { SUBJECT_INFO } from '../../constants/subjects';
import { cn } from '../../lib/cn';
import { updateTask } from '../../hooks/useTasks';
import { playSuccessSound } from '../../utils/audio';
import { useFocus } from '../../context/FocusContext';

interface TaskCardProps {
  task: Task;
  onEdit: () => void;
  key?: string | number;
}

export function TaskCard({ task, onEdit }: TaskCardProps) {
  const { setActiveTask } = useFocus();
  const [isExpanded, setIsExpanded] = React.useState(false);
  
  React.useEffect(() => {
    const handleGlobalChange = (e: any) => {
      const global = e.detail?.expanded ?? (localStorage.getItem('eduflow_global_expanded') === 'true');
      setIsExpanded(global);
    };
    window.addEventListener('storage', handleGlobalChange);
    window.addEventListener('eduflow-global-expand' as any, handleGlobalChange);
    
    // Initial check
    const currentGlobal = localStorage.getItem('eduflow_global_expanded') === 'true';
    setIsExpanded(currentGlobal);
    
    return () => {
      window.removeEventListener('storage', handleGlobalChange);
      window.removeEventListener('eduflow-global-expand' as any, handleGlobalChange);
    };
  }, []);

  const toggleSubtaskItem = async (groupId: string, itemId: string) => {
    let wasCompleted = false;
    const updatedSubtasks = task.subtasks.map(st => {
      if (st.id === groupId) {
        return {
          ...st,
          items: st.items.map(item => {
            if (item.id === itemId) {
              if (!item.completed) wasCompleted = true;
              return { ...item, completed: !item.completed };
            }
            return item;
          })
        };
      }
      return st;
    });
    try {
      await updateTask(task.id, { subtasks: updatedSubtasks });
      if (wasCompleted) {
        playSuccessSound();
      }
    } catch (error) {
      console.error("Error updating subtask", error);
    }
  };

  const toggleMetric = async (field: 'theoryCompleted' | 'flashcardsCompleted') => {
    try {
      await updateTask(task.id, { [field]: !task[field] });
    } catch (error) {
      console.error(`Error updating ${field}`, error);
    }
  };

  const [isAnimatingCheck, setIsAnimatingCheck] = React.useState(false);

  const toggleTaskStatus = async () => {
    const willComplete = task.status !== 'concluida';
    if (willComplete) {
      setIsAnimatingCheck(true);
      setTimeout(() => setIsAnimatingCheck(false), 300);
    }
    try {
      const newStatus = task.status === 'concluida' ? 'hoje' : 'concluida';
      await updateTask(task.id, { status: newStatus });
      if (newStatus === 'concluida') {
        playSuccessSound();
      }
    } catch (error) {
      console.error("Error toggling task status", error);
    }
  };

  const subjectInfo = SUBJECT_INFO[task.subject] || SUBJECT_INFO['Geral'];

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const liquidTime = task.liquidTime || 0;
  const subtasks = task.subtasks || [];
  const totalSubItems = subtasks.reduce((acc, group) => acc + (group.items?.length || 0), 0);
  const doneSubItems = subtasks.reduce((acc, group) => acc + (group.items?.filter(i => i.completed).length || 0), 0);
  const checklistPct = totalSubItems > 0 ? Math.round((doneSubItems / totalSubItems) * 100) : -1;

  return (
    <div 
      style={{ '--shadow-color': subjectInfo.shadowColor } as React.CSSProperties}
      className={cn(
        "group relative p-5 rounded-5xl border border-white/50 backdrop-blur-sm flex flex-col gap-4 shadow-colored hover:shadow-xl transition-all animate-card-enter",
        subjectInfo.cardBg
      )}
    >
      <div className={cn("absolute inset-0 bg-linear-to-br opacity-5 pointer-events-none rounded-3xl", subjectInfo.gradient)} />
      
      <div className="relative flex items-center justify-between z-10 gap-2">
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-lg border flex items-center gap-1.5 shadow-sm transition-transform group-hover:scale-105", 
            subjectInfo.tagColor
          )}>
            <span className="text-xs">{subjectInfo.emoji}</span> {task.subject}
          </span>
          {task.priority === 'alta' && (
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-red-50 text-red-600 border border-red-100 px-2.5 py-1 rounded-lg">
              Alta
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 bg-gray-50/80 backdrop-blur-sm p-1 rounded-xl border border-gray-100">
          {task.status === 'inbox' ? (
            <div className="flex items-center gap-1">
              <button 
                onClick={async (e) => {
                  e.stopPropagation();
                  try { await updateTask(task.id, { status: 'hoje' }); } catch (error) { console.error(error); }
                }}
                className="px-2 py-1 bg-white text-orange-600 border border-orange-100 rounded-lg text-[10px] font-bold hover:bg-orange-500 hover:text-white transition-all active:scale-95 shadow-sm"
              >
                HOJE
              </button>
              <button 
                onClick={async (e) => {
                  e.stopPropagation();
                  try { await updateTask(task.id, { status: 'semana' }); } catch (error) { console.error(error); }
                }}
                className="px-2 py-1 bg-white text-blue-600 border border-blue-100 rounded-lg text-[10px] font-bold hover:bg-blue-500 hover:text-white transition-all active:scale-95 shadow-sm"
              >
                PRÓX
              </button>
            </div>
          ) : (
            <div className="relative group/select">
              <select 
                value={task.status}
                onChange={async (e) => {
                  try {
                    const newStatus = e.target.value as Status;
                    await updateTask(task.id, { status: newStatus });
                    if (newStatus === 'concluida' && task.status !== 'concluida') playSuccessSound();
                  } catch (error) { console.error(error); }
                }}
                className="text-[10px] font-medium bg-transparent text-gray-500 hover:text-gray-800 transition-all rounded-lg pl-2 pr-6 py-0.5 focus:outline-none cursor-pointer appearance-none"
              >
                <option value="inbox">📥 Inbox</option>
                <option value="semana">🗓 A Fazer</option>
                <option value="hoje">🎯 Hoje</option>
                <option value="concluida">✅ Concluído</option>
              </select>
              <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
            </div>
          )}
          
          <div className="w-px h-4 bg-gray-200 mx-0.5" />

          {task.status !== 'concluida' && (
            <button onClick={(e) => { e.stopPropagation(); setActiveTask(task); }} title="Iniciar Foco"
              className="p-1.5 text-orange-500 hover:bg-orange-50 hover:text-white rounded-lg transition-all active:scale-90 shadow-sm bg-white border border-orange-50">
              <Play size={14} fill="currentColor" />
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); onEdit(); }} title="Editar"
            className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-all shadow-sm bg-white border border-gray-50">
            <Pencil size={16} />
          </button>
        </div>
      </div>

      <div className="relative flex items-start gap-4 z-10">
        <motion.button 
          onClick={(e) => { e.stopPropagation(); toggleTaskStatus(); }}
          className={cn(
            "mt-1 transition-all shrink-0 active:scale-75 p-0.5 rounded-full border-2", 
            task.status === 'concluida' ? "text-green-500 border-green-500 bg-green-50" : "text-gray-300 border-gray-200 hover:text-green-500 hover:border-green-500"
          )}
          animate={isAnimatingCheck ? { scale: [1, 1.3, 1] } : {}}
          transition={{ duration: 0.3 }}
        >
          {task.status === 'concluida' ? <CheckCircle2 size={22} /> : <Circle size={22} />}
        </motion.button>
        <div className="flex-1 min-w-0 pr-8">
          <h3 className={cn(
            "font-semibold text-[16px] leading-[1.4] tracking-tight mb-2 transition-all", 
            task.status === 'concluida' ? "text-gray-400 line-through" : "text-gray-800"
          )}>
            {task.title}
          </h3>
          
          <div className="flex flex-col gap-3 mt-3">
            <div className="flex items-center gap-2">
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-2xl border text-[11px] font-bold shadow-sm transition-all",
                liquidTime > 0 ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-gray-50 text-gray-400 border-gray-100"
              )}>
                <Clock size={14} className="opacity-70" />
                <span>{formatDuration(liquidTime)}</span>
              </div>

              {(task.questionsTotal || 0) > 0 && (
                <div className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-2xl border text-[11px] font-bold shadow-sm animate-in zoom-in-95 duration-500",
                  (task.questionsCorrect || 0) / (task.questionsTotal || 1) >= 0.8 ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
                  (task.questionsCorrect || 0) / (task.questionsTotal || 1) >= 0.6 ? "bg-amber-50 text-amber-600 border-amber-100" : 
                  "bg-rose-50 text-rose-600 border-rose-100"
                )}>
                  <Target size={14} className="opacity-70" />
                  <span>
                    {task.questionsCorrect}/{task.questionsTotal}
                    <span className="ml-1 opacity-60">
                      ({Math.round(((task.questionsCorrect || 0) / (task.questionsTotal || 1)) * 100)}%)
                    </span>
                  </span>
                </div>
              )}

              {(((task.pomodoros ?? 0) > 0) || ((task.estimatedPomodoros ?? 0) > 0)) && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-orange-50 text-orange-600 border border-orange-100 text-[11px] font-bold shadow-sm">
                  <span>🍅</span>
                  <span>{task.pomodoros ?? 0}{(task.estimatedPomodoros ?? 0) > 0 ? ` / ${task.estimatedPomodoros}` : ''}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {(task.tags ?? []).map(tag => (
                <span key={tag} className="text-[9px] font-bold tracking-wider bg-black/5 text-gray-500 border border-black/5 px-2 py-0.5 rounded-lg uppercase">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <button 
          onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} 
          className="absolute right-0 top-1 p-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-all border border-gray-100 shrink-0 active:scale-90"
        >
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {checklistPct >= 0 && (
        <div className="relative z-10 pt-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Progresso
            </span>
            <motion.span
              key={checklistPct}
              initial={{ scale: 1.4, opacity: 0 }}
              animate={{ scale: 1,   opacity: 1 }}
              className="text-[10px] font-bold text-gray-900 px-1.5 py-0.5 bg-gray-50 rounded-md border border-gray-100 tabular-nums"
            >
              {doneSubItems} / {totalSubItems}
            </motion.span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-50 overflow-hidden border border-gray-100 shadow-inner">
            <motion.div
              className={cn(
                "h-full rounded-full",
                checklistPct === 100 ? "bg-emerald-500" :
                checklistPct >= 50  ? "bg-indigo-500"  : "bg-orange-500"
              )}
              initial={{ width: 0 }}
              animate={{ width: `${checklistPct}%` }}
              transition={{ type: 'spring', stiffness: 60, damping: 14, delay: 0.1 }}
            />
          </div>
        </div>
      )}

      {isExpanded && (
        <div className="relative mt-2 space-y-6 animate-in fade-in slide-in-from-top-4 duration-300 z-10 pt-4 border-t border-gray-100">
          {(task.subtasks && task.subtasks.length > 0) ? (
            <div className="pl-2 space-y-5">
              {task.subtasks.map((group) => (
                <div key={group.id} className="space-y-3">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-gray-200" /> {group.title}
                  </h4>
                  <div className="grid grid-cols-1 gap-1.5">
                    {(group.items || []).map(item => (
                      <button 
                        key={item.id} 
                        onClick={() => toggleSubtaskItem(group.id, item.id)}
                        className={cn(
                          "flex items-center gap-3 text-sm text-left w-full p-2.5 rounded-xl transition-all border",
                          item.completed 
                            ? "bg-gray-50 border-transparent opacity-40 shadow-inner" 
                            : "bg-white border-gray-100 hover:bg-gray-50 hover:border-gray-200 shadow-sm"
                        )}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all",
                          item.completed 
                            ? "bg-indigo-500 border-indigo-500 text-white" 
                            : "border-gray-200 text-transparent"
                        )}>
                          <Check size={14} className={item.completed ? "scale-100" : "scale-0"} />
                        </div>
                        <span className={cn("font-medium transition-all text-xs", item.completed ? "line-through text-gray-300" : "text-gray-700 font-semibold")}>
                          {item.title}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-2 text-center opacity-30">
              <p className="text-[10px] font-bold uppercase tracking-widest italic">Sem subtarefas</p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-100">
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => toggleMetric('theoryCompleted')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border shadow-sm",
                  task.theoryCompleted 
                    ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                    : "bg-gray-50 border-gray-100 text-gray-400 hover:text-gray-600"
                )}
              >
                <BookOpen size={12} /> TEORIA
              </button>
              <button 
                onClick={() => toggleMetric('flashcardsCompleted')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border shadow-sm",
                  task.flashcardsCompleted 
                    ? "bg-purple-50 text-purple-600 border-purple-100" 
                    : "bg-gray-50 border-gray-100 text-gray-400 hover:text-gray-600"
                )}
              >
                <Brain size={12} /> FLASHCARDS
              </button>
            </div>

            {((task.updatedAt || task.createdAt)) && (
              <span className="text-[9px] text-gray-300 font-bold uppercase tracking-widest">
                Mod: {formatDate(task.updatedAt || task.createdAt)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
