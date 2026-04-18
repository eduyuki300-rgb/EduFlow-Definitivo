import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, TrendingUp, Award, Flame, CheckCircle2, 
  Clock, Target, Tag as TagIcon, BarChart3 
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { EduStuff, Task } from '../../types';

interface HistoryViewProps {
  stuffs: EduStuff[];
  tasks?: Task[]; // Adicionado suporte a tasks para métricas de foco
}

// ✅ OTIMIZAÇÃO: Heatmap de Intensidade de Foco (30 Dias)
const FocusHeatmap = ({ tasks }: { tasks: Task[] }) => {
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().split('T')[0];
  });

  const getMinsForDate = (dateStr: string) => {
    return tasks
      .filter(t => {
        if (t.status !== 'concluida') return false;
        const date = t.updatedAt?.toDate ? t.updatedAt.toDate() : new Date(t.updatedAt || 0);
        return date.toISOString().startsWith(dateStr);
      })
      .reduce((a, t) => a + Math.floor((t.liquidTime || 0) / 60), 0);
  };

  const getDataIntensity = (mins: number) => {
    if (mins === 0) return 'bg-gray-100 dark:bg-gray-800';
    if (mins < 30) return 'bg-blue-200 dark:bg-blue-900/30';
    if (mins < 60) return 'bg-blue-400 dark:bg-blue-700/50';
    if (mins < 120) return 'bg-blue-600 dark:bg-blue-500';
    return 'bg-blue-800 dark:bg-blue-400';
  };

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-6 custom-scrollbar snap-x">
      {days.map(date => {
        const mins = getMinsForDate(date);
        return (
          <div key={date} className="flex flex-col items-center gap-2 snap-center">
            <div 
              className={cn(
                "w-[14px] h-[14px] rounded-sm transition-all duration-500 hover:scale-125 hover:ring-2 hover:ring-blue-400 cursor-help",
                getDataIntensity(mins)
              )}
              title={`${date}: ${mins} min de foco`}
            />
            <span className="text-[7px] font-black text-gray-400 uppercase tracking-tighter">
              {date.split('-')[2]}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// ✅ OTIMIZAÇÃO: Ranking de Eficiência por Matéria (Storytelling)
const SubjectEfficiency = ({ tasks }: { tasks: Task[] }) => {
  const stats = useMemo(() => {
    const subMap: Record<string, { name: string, time: number }> = {};
    tasks.filter(t => t.status === 'concluida').forEach(t => {
      const sub = t.subject || 'Geral';
      if (!subMap[sub]) subMap[sub] = { name: sub, time: 0 };
      subMap[sub].time += Math.floor((t.liquidTime || 0) / 60);
    });
    
    const values = Object.values(subMap);
    const max = Math.max(...values.map(v => v.time), 1);
    
    return values
      .sort((a, b) => b.time - a.time)
      .slice(0, 5)
      .map(item => ({
        subject: item.name,
        mins: item.time,
        percent: (item.time / max) * 100
      }));
  }, [tasks]);

  return (
    <div className="space-y-4">
      {stats.map(({ subject, mins, percent }) => (
        <div key={subject} className="group">
          <div className="flex justify-between text-[10px] mb-1.5 px-1">
            <span className="font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest">{subject}</span>
            <span className="font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded-md tabular-nums">
              {Math.floor(mins / 60)}h {mins % 60}m
            </span>
          </div>
          <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden border border-black/5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${percent}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="h-full bg-linear-to-r from-blue-500 to-indigo-500 rounded-full"
            />
          </div>
        </div>
      ))}
      {stats.length === 0 && (
        <div className="py-8 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl">
           <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Aguardando dados de estudo...</p>
        </div>
      )}
    </div>
  );
};

export function HistoryView({ stuffs, tasks = [] }: HistoryViewProps) {
  const habits = stuffs.filter(s => s.type === 'habit');
  const completedTodos = useMemo(() => {
    return stuffs.filter(s => s.type === 'todo' && s.completed)
      .sort((a, b) => {
        const dateA = a.lastCompletedAt?.toDate ? a.lastCompletedAt.toDate() : new Date(a.lastCompletedAt || 0);
        const dateB = b.lastCompletedAt?.toDate ? b.lastCompletedAt.toDate() : new Date(b.lastCompletedAt || 0);
        return dateB.getTime() - dateA.getTime();
      });
  }, [stuffs]);
  
  const totalCompletedHabits = habits.reduce((acc, h) => acc + (h.completedDates?.length || 0), 0);
  const bestStreak = Math.max(...habits.map(h => h.streak || 0), 0);

  const formatDateTime = (timestamp: any) => {
    if (!timestamp) return 'Recém';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : (timestamp instanceof Date ? timestamp : new Date(timestamp));
      if (isNaN(date.getTime())) return 'Pendente';
      return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
    } catch (e) {
      return 'Pendente';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-10 pb-20"
    >
      {/* 📊 ESTATÍSTICAS ELITE */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div whileHover={{ scale: 1.02 }} className="p-6 glass-panel rounded-[32px] overflow-hidden relative">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-orange-500/10 blur-3xl rounded-full" />
          <div className="flex items-center gap-2 mb-2 opacity-60">
            <Flame size={14} className="text-orange-500" />
            <span className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">Melhor Fogo</span>
          </div>
          <p className="text-4xl font-black text-gray-900 dark:text-white tracking-tight tabular-nums">
            {bestStreak} <span className="text-[10px] text-orange-400 font-bold uppercase tracking-widest">Dias</span>
          </p>
        </motion.div>
        
        <motion.div whileHover={{ scale: 1.02 }} className="p-6 glass-panel rounded-[32px] overflow-hidden relative">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-500/10 blur-3xl rounded-full" />
          <div className="flex items-center gap-2 mb-2 opacity-60">
            <Award size={14} className="text-emerald-500" />
            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Conquistas</span>
          </div>
          <p className="text-4xl font-black text-gray-900 dark:text-white tracking-tight tabular-nums">
            {totalCompletedHabits + completedTodos.length}
          </p>
        </motion.div>
      </div>

      {/* 🔮 INSIGHTS DE FOCO (NEW) */}
      <section className="glass-panel p-8 rounded-[40px] border-white/50">
        <div className="flex items-center justify-between mb-8">
           <div className="flex items-center gap-3">
              <div className="w-2 h-6 bg-blue-500 rounded-full" />
              <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-[0.2em]">Intensidade de Foco</h3>
           </div>
           <BarChart3 size={18} className="text-blue-500 opacity-50" />
        </div>
        
        <FocusHeatmap tasks={tasks} />
        
        <div className="mt-10 border-t border-black/5 dark:border-white/5 pt-10">
           <SubjectEfficiency tasks={tasks} />
        </div>
      </section>

      {/* 🕒 JORNADA DE CONQUISTAS */}
      <section>
         <div className="flex items-center gap-2 mb-8 px-2">
            <div className="w-1.5 h-4 bg-purple-500 rounded-full" />
            <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Linha do Tempo</h3>
          </div>
          
        <div className="relative border-l-2 border-gray-100 dark:border-gray-800 ml-5 pl-8 space-y-8">
          <AnimatePresence mode="popLayout">
            {completedTodos.length > 0 ? (
              completedTodos.slice(0, 15).map((todo, idx) => (
                <motion.div 
                  key={todo.id || `timeline-${idx}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="relative"
                >
                  <div className="absolute left-[-41px] top-2 w-5 h-5 bg-white dark:bg-gray-900 border-4 border-emerald-400 rounded-full shadow-sm z-10" />
                  
                  <div className="flex flex-col gap-2">
                    <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full uppercase tracking-widest w-fit border border-emerald-100 dark:border-emerald-800">
                      {formatDateTime(todo.lastCompletedAt)}
                    </span>
                    <div className="p-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-xs hover:translate-x-1 transition-transform">
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-200 leading-snug">{todo.title}</p>
                      {todo.category && (
                        <div className="flex items-center gap-1.5 mt-2.5">
                           <TagIcon size={10} className="text-gray-300 dark:text-gray-600" />
                           <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{todo.category}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="py-20 flex flex-col items-center justify-center opacity-30 text-center">
                <Target size={32} className="mb-4 text-gray-200" />
                <p className="text-[10px] font-black uppercase tracking-widest">Nada concluído hoje...</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </motion.div>
  );
}
