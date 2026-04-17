import React from 'react';
import { motion } from 'motion/react';
import { Calendar, TrendingUp, Award, Flame } from 'lucide-react';
import { cn } from '../../lib/cn';
import { EduStuff } from '../../types';

interface HistoryViewProps {
  stuffs: EduStuff[];
}

export function HistoryView({ stuffs }: HistoryViewProps) {
  const habits = stuffs.filter(s => s.type === 'habit');
  
  // Basic Stats
  const totalCompletedHabits = habits.reduce((acc, h) => acc + (h.completedDates?.length || 0), 0);
  const bestStreak = Math.max(...habits.map(h => h.streak), 0);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-6"
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 bg-orange-50/50 rounded-3xl border border-orange-100/50">
          <div className="flex items-center gap-2 mb-2">
            <Flame size={14} className="text-orange-500" />
            <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Melhor Streak</span>
          </div>
          <p className="text-2xl font-black text-gray-900">{bestStreak} <span className="text-[10px] text-gray-400">dias</span></p>
        </div>
        
        <div className="p-4 bg-indigo-50/50 rounded-3xl border border-indigo-100/50">
          <div className="flex items-center gap-2 mb-2">
            <Award size={14} className="text-indigo-500" />
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Conclusões</span>
          </div>
          <p className="text-2xl font-black text-gray-900">{totalCompletedHabits}</p>
        </div>
      </div>

      <section>
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 px-2">Análise de Hábito</h3>
        <div className="space-y-3">
          {habits.map(habit => (
            <div key={habit.id} className="p-4 bg-white/40 border border-white/60 rounded-3xl shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-gray-700 uppercase">{habit.title}</span>
                <span className="text-[10px] font-black text-orange-500">{habit.streak}🔥</span>
              </div>
              
              {/* Simplified Month View */}
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: 30 }, (_, i) => {
                  const d = new Date();
                  d.setDate(d.getDate() - (29 - i));
                  const dayStr = d.toISOString().split('T')[0];
                  const isDone = habit.completedDates?.includes(dayStr);
                  
                  return (
                    <div 
                      key={i}
                      className={cn(
                        "w-2 h-2 rounded-sm",
                        isDone ? "bg-orange-400" : "bg-gray-100"
                      )}
                      title={dayStr}
                    />
                  );
                })}
              </div>
              <p className="mt-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                Últimos 30 dias
              </p>
            </div>
          ))}
        </div>
      </section>
      
      {habits.length === 0 && (
        <div className="py-12 flex flex-col items-center justify-center opacity-20 grayscale">
          <Calendar size={32} />
          <p className="text-[10px] font-bold uppercase tracking-widest mt-4">Sem histórico ainda</p>
        </div>
      )}
    </motion.div>
  );
}
