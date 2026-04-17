import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface HeatmapCalendarProps {
  completedDates: string[]; // Array de strings 'YYYY-MM-DD'
  totalDays?: number;       // Meta total (ex: 120)
  title?: string;
}

/**
 * Componente de Heatmap blindado contra bugs de fuso horário.
 * Usa toLocaleDateString('en-CA') para garantir consistência com o backend.
 */
export function HeatmapCalendar({ completedDates, totalDays = 120, title }: HeatmapCalendarProps) {
  
  // Função de utilidade interna para garantir que a data de comparação seja a local
  const getLocalDateString = (date: Date) => {
    return date.toLocaleDateString('en-CA'); // Retorna YYYY-MM-DD
  };

  // Gera os últimos 120 dias a partir de hoje
  const days = useMemo(() => {
    const result = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = totalDays - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const dateStr = getLocalDateString(date);
      const isCompleted = completedDates.includes(dateStr);
      
      result.push({
        date: dateStr,
        day: date.getDate(),
        month: date.toLocaleString('pt-BR', { month: 'short' }),
        isCompleted,
        isToday: i === 0,
      });
    }
    return result;
  }, [completedDates, totalDays]);

  // Agrupa por semanas para visualização em grid (colunas de 7 dias)
  const weeks = useMemo(() => {
    const result: typeof days[][] = [];
    let currentWeek: typeof days[] = [];

    days.forEach((day) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        result.push(currentWeek);
        currentWeek = [];
      }
    });

    if (currentWeek.length > 0) {
      result.push(currentWeek);
    }

    return result;
  }, [days]);

  const completionPercentage = Math.min((completedDates.length / totalDays) * 100, 100);

  return (
    <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-4 border border-white/60 shadow-sm">
      {title && (
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{title}</p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
              {completedDates.length}/{totalDays} dias
            </span>
          </div>
        </div>
      )}

      {/* Grid de Heatmap com Scroll Horizontal Suave */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 custom-scrollbar mask-fade-edges">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-1.5 min-w-[14px]">
            {week.map((day) => (
              <motion.div
                key={day.date}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ 
                  delay: (weekIndex * 7 + week.indexOf(day)) * 0.002,
                  duration: 0.2
                }}
                whileHover={{ scale: 1.3, zIndex: 10 }}
                className={cn(
                  "w-3.5 h-3.5 rounded-sm transition-all border cursor-help",
                  day.isCompleted
                    ? "bg-linear-to-br from-emerald-400 to-teal-500 border-emerald-600 shadow-[0_0_8px_rgba(52,211,153,0.3)]"
                    : "bg-gray-100/50 border-gray-200/40",
                  day.isToday && !day.isCompleted && "ring-2 ring-orange-400 ring-offset-1 ring-offset-white/10"
                )}
                title={`${day.day} de ${day.month} - ${day.isCompleted ? 'Concluído' : 'Pendente'}`}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Barra de Progresso e Legenda */}
      <div className="mt-4 flex flex-col gap-3">
        <div className="flex items-center justify-between text-[8px] font-bold text-gray-400 uppercase tracking-tighter">
          <span>Progresso do Desafio</span>
          <span>{completionPercentage.toFixed(0)}%</span>
        </div>
        
        <div className="w-full h-1.5 bg-gray-200/50 rounded-full overflow-hidden border border-white/40">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completionPercentage}%` }}
            transition={{ duration: 1, ease: "circOut" }}
            className="h-full bg-linear-to-r from-emerald-400 to-teal-500 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.4)]"
          />
        </div>

        <div className="flex items-center justify-end gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-xs bg-gray-100/50 border border-gray-200/50" />
            <span className="text-[9px] text-gray-500 font-medium">Vazio</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-xs bg-linear-to-br from-emerald-400 to-teal-500 border border-emerald-600" />
            <span className="text-[9px] text-gray-500 font-medium">Feito</span>
          </div>
        </div>
      </div>
    </div>
  );
}
