import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, 
  LineChart, Line
} from 'recharts';
import { Task } from '../../types';
import { Sparkles, Activity, Target, Clock } from 'lucide-react';
import { cn } from '../../lib/cn';

interface AnalyticsTabProps {
  tasks: Task[];
  userName?: string;
}

type TimeFrame = 7 | 30 | 365;

export function AnalyticsTab({ tasks, userName }: AnalyticsTabProps) {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>(7);

  const { effortData, radarData, summaryStats } = useMemo(() => {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - timeFrame);

    const filteredTasks = tasks.filter(t => {
      if (!t.updatedAt) return false;
      const tDate = t.updatedAt?.toDate ? t.updatedAt.toDate() : new Date(t.updatedAt);
      return tDate >= startDate && tDate <= now && t.status === 'concluida';
    });

    // 1. Esforço por Dia
    const daysMap = new Map<string, number>();
    for (let i = timeFrame - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      daysMap.set(dateStr, 0);
    }

    let totalLiquidTime = 0;
    let totalQuestions = 0;
    let correctQuestions = 0;

    filteredTasks.forEach(t => {
      const d = t.updatedAt?.toDate ? t.updatedAt.toDate() : new Date(t.updatedAt as any);
      const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      
      if (daysMap.has(dateStr)) {
        // Converter segundos em horas
        const hours = (t.liquidTime || 0) / 3600;
        daysMap.set(dateStr, daysMap.get(dateStr)! + hours);
      }

      totalLiquidTime += (t.liquidTime || 0);
      totalQuestions += (t.questionsTotal || 0);
      correctQuestions += (t.questionsCorrect || 0);
    });

    const effortData = Array.from(daysMap.entries()).map(([date, hours]) => ({
      date,
      horas: Number(hours.toFixed(2))
    }));

    // 2. Radar de Matérias
    const subjectMap = new Map<string, { total: number, acertos: number }>();
    filteredTasks.forEach(t => {
      if ((t.questionsTotal || 0) > 0) {
        const stats = subjectMap.get(t.subject) || { total: 0, acertos: 0 };
        stats.total += t.questionsTotal || 0;
        stats.acertos += t.questionsCorrect || 0;
        subjectMap.set(t.subject, stats);
      }
    });

    const radarData = Array.from(subjectMap.entries()).map(([subject, stats]) => ({
      subject,
      eficiencia: Math.round((stats.acertos / stats.total) * 100)
    }));

    return { 
      effortData, 
      radarData,
      summaryStats: {
        totalHours: (totalLiquidTime / 3600).toFixed(1),
        avgSuccess: totalQuestions > 0 ? Math.round((correctQuestions / totalQuestions) * 100) : 0,
        totalTasks: filteredTasks.length
      }
    };
  }, [tasks, timeFrame]);

  return (
    <div className="flex h-full min-h-0 flex-col max-w-5xl mx-auto w-full px-1 pb-20">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Sparkles size={16} className="text-blue-500" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-gray-900 leading-none">
              Visão de Águia
            </h2>
          </div>
          <p className="text-sm text-gray-500 font-medium">
            Explore seu desempenho, esforço cognitivo e acertos, {userName?.split(' ')[0] || 'Guerreiro'}.
          </p>
        </div>

        <div className="flex items-center bg-gray-50 border border-gray-100 p-1 rounded-2xl shadow-sm">
          {[
            { id: 7, label: '7 D' },
            { id: 30, label: '30 D' },
            { id: 365, label: '1 Ano' }
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setTimeFrame(opt.id as TimeFrame)}
              className={cn(
                "px-4 py-2 font-bold text-xs rounded-xl transition-all",
                timeFrame === opt.id 
                  ? "bg-white text-gray-900 shadow-sm border border-gray-100" 
                  : "text-gray-400 hover:text-gray-600"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-6 rounded-4xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 shadow-inner">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Esforço Focado</p>
            <p className="text-2xl font-black text-gray-900 leading-tight">
              {summaryStats.totalHours} <span className="text-sm font-bold text-gray-400">h</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-4xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 shadow-inner">
            <Target size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Taxa Média de Acertos</p>
            <p className="text-2xl font-black text-gray-900 leading-tight">
              {summaryStats.avgSuccess} <span className="text-sm font-bold text-gray-400">%</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-4xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-500 shadow-inner">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Missões Concluídas</p>
            <p className="text-2xl font-black text-gray-900 leading-tight">
              {summaryStats.totalTasks}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-4xl border border-gray-100 shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> Horas de Foco
          </h3>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={effortData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#9CA3AF' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#9CA3AF' }} 
                />
                <Tooltip 
                  cursor={{ fill: '#F3F4F6', radius: 8 }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="horas" fill="#3B82F6" radius={[4, 4, 4, 4]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-4xl border border-gray-100 shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Proficiência por Matéria (%)
          </h3>
          <div className="flex-1 min-h-[300px] flex items-center justify-center">
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="#F3F4F6" />
                  <PolarAngleAxis 
                    dataKey="subject" 
                    tick={{ fontSize: 10, fill: '#6B7280', fontWeight: 'bold' }} 
                  />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Acertos" dataKey="eficiencia" stroke="#10B981" fill="#10B981" fillOpacity={0.2} />
                  <Tooltip wrapperStyle={{ zIndex: 100 }} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center opacity-40">
                <Target size={32} className="mx-auto mb-2" />
                <p className="text-[10px] font-bold uppercase tracking-widest">Dados insuficientes</p>
                <p className="text-xs mt-1">Resolva questões para ativar</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
