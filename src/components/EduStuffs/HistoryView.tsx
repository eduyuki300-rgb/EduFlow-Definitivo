import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, TrendingUp, Award, Flame, CheckCircle2, Clock, CalendarCheck2, ChevronRight, Tag as TagIcon } from 'lucide-react';
import { cn } from '../../lib/cn';
import { EduStuff } from '../../types';

interface HistoryViewProps {
  stuffs: EduStuff[];
}

export function HistoryView({ stuffs }: HistoryViewProps) {
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

  const generateHeatmapDays = (completedDates: string[]) => {
    const days = [];
    const today = new Date();
    // 84 dias = 12 semanas
    for (let i = 83; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      days.push({ key, done: completedDates?.includes(key) });
    }
    return days;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-10 pb-20"
    >
      {/* 📊 ESTATÍSTICAS ELITE */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div whileHover={{ scale: 1.02 }} className="p-5 bg-linear-to-br from-orange-50 to-orange-100/50 border border-orange-100 rounded-[32px] shadow-sm">
          <div className="flex items-center gap-2 mb-2 opacity-60">
            <Flame size={14} className="text-orange-500" />
            <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Melhor Fogo</span>
          </div>
          <p className="text-3xl font-black text-gray-900 tracking-tight">{bestStreak} <span className="text-xs text-orange-400 font-bold uppercase">dias</span></p>
        </motion.div>
        
        <motion.div whileHover={{ scale: 1.02 }} className="p-5 bg-linear-to-br from-emerald-50 to-emerald-100/50 border border-emerald-100 rounded-[32px] shadow-sm">
          <div className="flex items-center gap-2 mb-2 opacity-60">
            <Award size={14} className="text-emerald-500" />
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Conquistas</span>
          </div>
          <p className="text-3xl font-black text-gray-900 tracking-tight">{totalCompletedHabits + completedTodos.length}</p>
        </motion.div>
      </div>

      {/* 📈 MAPA DE CONSISTÊNCIA */}
      {habits.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-6 px-2">
            <div className="w-1.5 h-4 bg-blue-500 rounded-full" />
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Consistência (12 Semanas)</h3>
          </div>
          
          <div className="space-y-6">
            {habits.map(habit => {
              const heatmap = generateHeatmapDays(habit.completedDates || []);
              return (
                <motion.div 
                  key={habit.id} 
                  initial={{ opacity: 0, x: -10 }} 
                  animate={{ opacity: 1, x: 0 }}
                  className="p-6 bg-white border border-gray-100 rounded-[32px] shadow-xs hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                       <span className="text-sm font-black text-gray-800 uppercase tracking-tight">{habit.title}</span>
                       <span className="text-[10px] font-black text-orange-500 bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-100">{habit.streak}🔥</span>
                    </div>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{habit.completedDates?.length || 0} Total</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5 justify-start">
                    {heatmap.map((day, idx) => (
                      <div 
                        key={idx}
                        className={cn(
                          "w-[11px] h-[11px] rounded-[3px] transition-all cursor-crosshair",
                          day.done ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" : "bg-gray-100"
                        )}
                        title={`${day.key}: ${day.done ? 'Concluído' : 'Pendente'}`}
                      />
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* 🕒 JORNADA DE CONQUISTAS */}
      <section>
         <div className="flex items-center gap-2 mb-6 px-2">
            <div className="w-1.5 h-4 bg-purple-500 rounded-full" />
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Linha do Tempo</h3>
          </div>
          
        <div className="relative border-l-2 border-gray-100 ml-5 pl-8 space-y-8">
          <AnimatePresence mode="popLayout">
            {completedTodos.length > 0 ? (
              completedTodos.slice(0, 20).map((todo, idx) => (
                <motion.div 
                  key={todo.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="relative"
                >
                  <div className="absolute left-[-41px] top-2 w-5 h-5 bg-white border-4 border-emerald-400 rounded-full shadow-sm z-10" />
                  
                  <div className="flex flex-col gap-2">
                    <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-widest w-fit border border-emerald-100">
                      {formatDateTime(todo.lastCompletedAt)}
                    </span>
                    <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:translate-x-1 transition-transform">
                      <p className="text-sm font-bold text-gray-800 leading-snug">{todo.title}</p>
                      {todo.category && (
                        <div className="flex items-center gap-1.5 mt-2">
                           <TagIcon size={10} className="text-gray-300" />
                           <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{todo.category}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="py-20 flex flex-col items-center justify-center opacity-30 text-center">
                <Clock size={32} className="mb-4 text-gray-200" />
                <p className="text-[10px] font-black uppercase tracking-widest">Seu legado está vazio...</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </motion.div>
  );
}
