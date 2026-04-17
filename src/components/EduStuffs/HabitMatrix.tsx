import React from 'react';
import { Plus, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/cn';
import { EduStuff } from '../../types';
import confetti from 'canvas-confetti';

interface HabitMatrixProps {
  habits: EduStuff[];
  toggleHabit: (habit: EduStuff) => Promise<void>;
  onNewHabit: () => void;
}

export function HabitMatrix({ habits, toggleHabit, onNewHabit }: HabitMatrixProps) {
  const handleToggle = async (habit: EduStuff) => {
    const isNowCompleted = !habit.completedDates?.includes(new Date().toISOString().split('T')[0]);
    await toggleHabit(habit);
    
    if (isNowCompleted) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f97316', '#fbbf24', '#f59e0b']
      });
    }
  };

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Hábitos Ativos</h3>
        <span className="text-[10px] font-bold text-orange-500">{habits.length}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {habits.map((habit) => {
          const todayStr = new Date().toISOString().split('T')[0];
          const isCompletedToday = habit.completedDates?.includes(todayStr);

          return (
            <motion.button
              key={habit.id}
              onClick={() => handleToggle(habit)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "p-3 glass-card rounded-2xl flex flex-col gap-2 items-start transition-all group border-orange-100/30",
                isCompletedToday && "bg-orange-50/30 border-orange-200/50"
              )}
            >
              <div className="flex items-center justify-between w-full">
                <div className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                  isCompletedToday ? "bg-orange-500 text-white shadow-lg shadow-orange-200" : "bg-gray-50 text-gray-300"
                )}>
                  <CheckCircle2 size={16} />
                </div>
                <span className="text-[10px] font-black text-orange-500/50">
                  {habit.streak || 0}🔥
                </span>
              </div>
              <span className="text-[10px] font-bold text-gray-700 truncate w-full text-left uppercase tracking-tight">
                {habit.title}
              </span>
              
              {/* Real Heatmap Matrix (Item #5) */}
              <div className="flex gap-1 mt-1">
                {last7Days.map((day, i) => {
                  const isDone = habit.completedDates?.includes(day);
                  return (
                    <div 
                      key={day} 
                      title={day}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full transition-colors",
                        isDone ? "bg-orange-400" : "bg-gray-100"
                      )} 
                    />
                  );
                })}
              </div>
            </motion.button>
          );
        })}
        
        {/* Fixed 'Novo' button (Item #4) */}
        <button 
          onClick={onNewHabit}
          className="p-3 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col gap-2 items-center justify-center hover:bg-white/50 transition-all opacity-40 hover:opacity-100 group"
        >
          <Plus size={16} className="text-gray-400 group-hover:text-orange-500" />
          <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Novo</span>
        </button>
      </div>
    </section>
  );
}
