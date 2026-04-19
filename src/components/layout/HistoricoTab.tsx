import React from 'react';
import { 
  History, Search, Target, BookOpen, Brain, Sparkles, Check 
} from 'lucide-react';
import { Task } from '../../types';
import { SUBJECT_INFO, SUBJECTS } from '../../constants/subjects';
import { cn } from '../../lib/cn';
import { TaskCard } from './TaskCard';
import { useEduStuffs } from '../../hooks/useEduStuffs';
import { HistoryView } from '../EduStuffs/HistoryView';

interface HistoricoTabProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  userId: string;
  isEduStuffsOpen?: boolean;
}

export function HistoricoTab({ tasks, onEdit, userId, isEduStuffsOpen }: HistoricoTabProps) {
  const [view, setView] = React.useState<'estudos' | 'vida'>('estudos');
  const [search, setSearch] = React.useState('');
  const [subjectFilter, setSubjectFilter] = React.useState('Todas');
  const [periodFilter, setPeriodFilter] = React.useState('all'); 
  const [sortBy, setSortBy] = React.useState<'newest' | 'oldest' | 'effort'>('newest');

  const { stuffs } = useEduStuffs();

  const completedTasks = tasks.filter(t => t.status === 'concluida');

  const filteredTasks = React.useMemo(() => {
    let result = completedTasks.filter(t => {
      const matchesSearch = !search || t.title.toLowerCase().includes(search.toLowerCase());
      const matchesSubject = subjectFilter === 'Todas' || t.subject === subjectFilter;
      
      let matchesPeriod = true;
      if (periodFilter !== 'all') {
        const date = t.updatedAt?.toDate() || t.createdAt?.toDate() || new Date();
        const now = new Date();
        if (periodFilter === 'today') {
          matchesPeriod = date.toDateString() === now.toDateString();
        } else if (periodFilter === 'week') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesPeriod = date >= sevenDaysAgo;
        } else if (periodFilter === 'month') {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesPeriod = date >= thirtyDaysAgo;
        }
      }

      return matchesSearch && matchesSubject && matchesPeriod;
    });

    result.sort((a, b) => {
      const aTime = a.updatedAt?.toMillis() || a.createdAt?.toMillis() || 0;
      const bTime = b.updatedAt?.toMillis() || b.createdAt?.toMillis() || 0;
      
      if (sortBy === 'newest') return bTime - aTime;
      if (sortBy === 'oldest') return aTime - bTime;
      if (sortBy === 'effort') return (b.liquidTime || 0) - (a.liquidTime || 0);
      return 0;
    });

    return result;
  }, [completedTasks, search, subjectFilter, periodFilter, sortBy]);

  const groupedTasks = React.useMemo(() => {
    const groups: Record<string, Task[]> = {};
    const now = new Date();
    const todayStr = now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    filteredTasks.forEach(task => {
      const date = task.updatedAt?.toDate() || task.createdAt?.toDate() || new Date();
      let label = "";
      const dateStr = date.toDateString();
      
      if (dateStr === todayStr) label = "HOJE";
      else if (dateStr === yesterdayStr) label = "ONTEM";
      else {
        label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date).toUpperCase();
      }

      if (!groups[label]) groups[label] = [];
      groups[label].push(task);
    });

    return Object.entries(groups);
  }, [filteredTasks]);

  if (completedTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center opacity-50 py-20">
        <History size={48} className="text-gray-200 mb-4" />
        <p className="font-bold text-gray-900">Seu histórico de conquistas está vazio.</p>
        <p className="text-sm text-gray-500 mt-2">Conclua tarefas para vê-las aqui.</p>
      </div>
    );
  }

  const totalPomodoros = completedTasks.reduce((acc, t) => acc + (t.pomodoros || 0), 0);
  const totalLiquidTime = completedTasks.reduce((acc, t) => acc + (t.liquidTime || 0), 0);
  const totalQuestions = completedTasks.reduce((acc, t) => acc + (t.questionsTotal || 0), 0);
  const totalCorrect = completedTasks.reduce((acc, t) => acc + (t.questionsCorrect || 0), 0);
  const avgAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  
  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className="flex h-full min-h-0 flex-col max-w-5xl mx-auto w-full px-1 pb-20">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Concluídas</p>
          <p className="text-2xl font-black text-gray-900">{completedTasks.length}</p>
        </div>
        <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 shadow-sm">
          <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Pomodoros</p>
          <p className="text-2xl font-black text-orange-600">{totalPomodoros}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 shadow-sm">
          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Tempo Focado</p>
          <p className="text-2xl font-black text-blue-600">{formatDuration(totalLiquidTime)}</p>
        </div>
        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 shadow-sm">
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Acerto Médio</p>
          <p className="text-2xl font-black text-emerald-600">{totalQuestions > 0 ? `${avgAccuracy}%` : '-'}</p>
        </div>
      </div>

      <div className="flex items-center gap-1 p-1 bg-white/50 backdrop-blur-md border border-white/80 rounded-2xl w-fit mb-8 shadow-sm">
        <button
          onClick={() => setView('estudos')}
          className={cn(
            "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
            view === 'estudos' ? "bg-orange-500 text-white shadow-lg shadow-orange-200" : "text-gray-400 hover:text-gray-900"
          )}
        >
          🎓 Missões (Estudos)
        </button>
        <button
          onClick={() => setView('vida')}
          className={cn(
            "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
            view === 'vida' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200" : "text-gray-400 hover:text-gray-900"
          )}
        >
          🌿 Stuff (Vida)
        </button>
      </div>

      {view === 'estudos' ? (
        <>
          <div className="mb-8 space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                <input
                  type="text"
                  placeholder="Buscar no histórico..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/10 shadow-sm"
                />
              </div>
              <div className="flex gap-2 shrink-0 overflow-x-auto pb-1 md:pb-0">
                <div className="relative flex items-center">
                  <select 
                    value={subjectFilter}
                    onChange={e => setSubjectFilter(e.target.value)}
                    className="px-4 py-3 pr-8 bg-white border border-gray-100 rounded-2xl text-xs font-bold text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/10 shadow-sm appearance-none cursor-pointer hover:bg-gray-50 transition-colors min-w-[120px]"
                  >
                    <option value="Todas">Toda as Matérias</option>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <div className="absolute right-3 pointer-events-none text-gray-400">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </div>
                <div className="relative flex items-center">
                  <select 
                    value={periodFilter}
                    onChange={e => setPeriodFilter(e.target.value)}
                    className="px-4 py-3 pr-8 bg-white border border-gray-100 rounded-2xl text-xs font-bold text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/10 shadow-sm appearance-none cursor-pointer hover:bg-gray-50 transition-colors min-w-[100px]"
                  >
                    <option value="all">Todo Período</option>
                    <option value="today">Apenas Hoje</option>
                    <option value="week">Últimos 7 dias</option>
                    <option value="month">Últimos 30 dias</option>
                  </select>
                  <div className="absolute right-3 pointer-events-none text-gray-400">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </div>
                <div className="relative flex items-center">
                  <select 
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as any)}
                    className="px-4 py-3 pr-8 bg-white border border-gray-100 rounded-2xl text-xs font-bold text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/10 shadow-sm appearance-none cursor-pointer hover:bg-gray-50 transition-colors min-w-[120px]"
                  >
                    <option value="newest">Mais Recentes</option>
                    <option value="oldest">Mais Antigas</option>
                    <option value="effort">Maior Esforço</option>
                  </select>
                  <div className="absolute right-3 pointer-events-none text-gray-400">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mt-8">
              <HistoryView stuffs={stuffs} tasks={tasks} />
              
              <div className="space-y-10 mt-12">
                {(Object.entries(groupedTasks) as [string, Task[]][]).map(([label, dayTasks]) => (
                  <div key={label} className="space-y-4">
                    <div className="flex items-center gap-4 sticky top-0 bg-white/80 backdrop-blur-md py-3 z-20 px-4 -mx-4 group">
                      <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
                      <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{label}</h3>
                      <div className="flex-1 h-px bg-gray-100" />
                      <span className="text-[10px] font-bold text-gray-300 leading-none">{dayTasks.length} módulos</span>
                    </div>
                    
                    <div className={cn("grid grid-cols-1 gap-4", !isEduStuffsOpen ? "lg:grid-cols-2" : "grid-cols-1")}>
                      {dayTasks.map((task, idx) => (
                        <TaskCard key={task.id || `hist-${idx}`} task={task} onEdit={() => onEdit(task)} />
                      ))}
                    </div>
                  </div>
                ))}

                {filteredTasks.length === 0 && (
                  <div className="py-24 text-center opacity-30 flex flex-col items-center">
                    <Target size={40} className="mb-4" />
                    <p className="text-sm font-bold uppercase tracking-widest">Nenhuma missão encontrada</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Histórico de Vida & Hábitos</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stuffs.filter(s => s.completed || (s.type === 'habit' && s.streak > 0)).map((stuff) => (
              <div key={stuff.id} className="p-5 glass-card rounded-3xl border-white/40 flex items-start gap-4 group">
                <div className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm",
                  stuff.type === 'habit' ? "bg-emerald-50 text-emerald-500" : "bg-orange-50 text-orange-500"
                )}>
                  {stuff.type === 'habit' ? <Sparkles size={20} /> : <Check size={20} />}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-black text-gray-900 uppercase tracking-tight mb-1">{stuff.title}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {stuff.type === 'habit' ? `${stuff.streak} dias de sequência` : 'Tarefa Concluída'}
                  </p>
                  {stuff.lastCompletedAt && (
                    <p className="text-[9px] text-gray-300 mt-2">
                      Última atividade: {stuff.lastCompletedAt.toDate().toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {stuffs.filter(s => s.completed || (s.type === 'habit' && s.streak > 0)).length === 0 && (
            <div className="py-20 flex flex-col items-center opacity-30">
              <History size={48} className="mb-4" />
              <p className="text-sm font-bold uppercase tracking-widest">Nada no histórico pessoal ainda</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
