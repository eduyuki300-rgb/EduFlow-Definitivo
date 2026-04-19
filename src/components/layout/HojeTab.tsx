import React from 'react';
import { 
  CalendarDays, Sparkles, Target, Clock, CheckCircle2, Search, X, LayoutList, Grid 
} from 'lucide-react';
import { Task } from '../../types';
import { SUBJECT_INFO } from '../../constants/subjects';
import { cn } from '../../lib/cn';
import { TaskCard } from './TaskCard';

interface HojeTabProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  userName?: string;
  isEduStuffsOpen?: boolean;
}

export function HojeTab({ tasks, onEdit, userName, isEduStuffsOpen }: HojeTabProps) {
  const [isGrouped, setIsGrouped] = React.useState(() => localStorage.getItem('eduflow_hoje_grouped') === 'true');
  const [search, setSearch] = React.useState('');
  const [sortBy, setSortBy] = React.useState<'priority' | 'effort' | 'none'>('none');

  React.useEffect(() => {
    localStorage.setItem('eduflow_hoje_grouped', String(isGrouped));
  }, [isGrouped]);

  const hojeTasks = tasks.filter(t => 
    t.status === 'hoje' && 
    (!search || t.title.toLowerCase().includes(search.toLowerCase()))
  );

  const totalHojeTasks = hojeTasks.length;
  const totalEstimated = hojeTasks.reduce((acc, t) => acc + (t.estimatedPomodoros || 0), 0);
  const totalDonePomodoros = hojeTasks.reduce((acc, t) => acc + (t.pomodoros || 0), 0);
  
  const sortedTasks = React.useMemo(() => {
    let result = [...hojeTasks];
    if (sortBy === 'priority') {
      const priorityOrder = { 'alta': 0, 'media': 1, 'baixa': 2 };
      result.sort((a, b) => (priorityOrder[a.priority as keyof typeof priorityOrder] ?? 1) - (priorityOrder[b.priority as keyof typeof priorityOrder] ?? 1));
    } else if (sortBy === 'effort') {
      result.sort((a, b) => (b.estimatedPomodoros || 0) - (a.estimatedPomodoros || 0));
    }
    return result;
  }, [hojeTasks, sortBy]);

  const groupedTasks = React.useMemo(() => {
    const groups: Record<string, Task[]> = {};
    sortedTasks.forEach(task => {
      if (!groups[task.subject]) groups[task.subject] = [];
      groups[task.subject].push(task);
    });
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [sortedTasks]);

  const heaviestSubject = groupedTasks.length > 0 ? groupedTasks[0][0] : null;
  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  if (tasks.filter(t => t.status === 'hoje').length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-center py-20 px-6 animate-in fade-in zoom-in duration-500">
        <div className="relative mb-8">
          <div className="absolute -inset-4 bg-orange-100 rounded-full blur-2xl opacity-50 animate-pulse" />
          <div className="relative w-32 h-32 bg-white rounded-3xl flex items-center justify-center shadow-xl border border-gray-50 group">
            <CalendarDays size={56} className="text-orange-500 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6" />
            <Sparkles size={24} className="absolute -top-2 -right-2 text-yellow-400 animate-bounce" />
          </div>
        </div>
        <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Horizonte Limpo!</h3>
        <p className="text-gray-500 text-sm max-w-[280px] font-medium leading-relaxed mb-10">
          Você completou tudo ou ainda não planejou seu dia. Que tal transformar o <span className="text-orange-500 font-bold">hoje</span> em um dia épico?
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col max-w-5xl mx-auto w-full px-1 pb-20">
      <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
            <Sparkles size={16} className="text-orange-500" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-gray-900 leading-none">
            {greeting()}, {userName?.split(' ')[0] || 'Edu'}!
          </h2>
        </div>
        <p className="text-sm text-gray-500 font-medium">
          {totalHojeTasks > 0 ? (
            <>
              Você tem <span className="text-orange-600 font-bold">{totalHojeTasks} missões</span> planejadas. 
              {heaviestSubject && (
                <span> O foco principal hoje parece ser <span className="text-indigo-600 font-bold uppercase tracking-tight">{heaviestSubject}</span>.</span>
              )}
            </>
          ) : (
            "Seu dia está livre de missões obrigatórias. Que tal triar algo do Inbox?"
          )}
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-4xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 shadow-inner">
            <Target size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Foco do Dia</p>
            <p className="text-2xl font-black text-gray-900 leading-tight">
              {totalHojeTasks} <span className="text-sm font-bold text-gray-400">módulos</span>
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-4xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500 shadow-inner">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tempo Est.</p>
            <p className="text-2xl font-black text-gray-900 leading-tight">
              {totalEstimated * 25} <span className="text-sm font-bold text-gray-400">min</span>
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-4xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 shadow-inner">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Progresso</p>
            <p className="text-2xl font-black text-gray-900 leading-tight">
              {totalDonePomodoros} / {totalEstimated} <span className="text-sm font-bold text-gray-400">toms</span>
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
          <input
            type="text"
            placeholder="Buscar nas missões de hoje..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-medium text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500/10 shadow-sm transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600 transition-colors">
              <X size={14} />
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-3 pr-8 bg-white border border-gray-100 rounded-2xl text-[10px] font-bold text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/10 shadow-sm appearance-none min-w-[120px] uppercase tracking-widest cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <option value="none">Ordenar</option>
              <option value="priority">Prioridade</option>
              <option value="effort">Esforço</option>
            </select>
            <div className="absolute right-3 pointer-events-none text-gray-400">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>

          <button 
            onClick={() => setIsGrouped(!isGrouped)}
            className="flex items-center gap-3 px-6 py-3 rounded-2xl border border-gray-100 bg-white text-[10px] font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all shadow-sm uppercase tracking-widest whitespace-nowrap"
          >
            {isGrouped ? <LayoutList size={14} /> : <Grid size={14} />}
            {isGrouped ? 'Ver Tudo' : 'Matérias'}
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {totalHojeTasks === 0 ? (
          <div className="text-center py-12 opacity-40">
            <p className="text-sm font-bold uppercase tracking-widest">Nenhuma missão encontrada</p>
          </div>
        ) : isGrouped ? (
          groupedTasks.map(([subject, items]) => {
            const info = SUBJECT_INFO[subject] || SUBJECT_INFO['Geral'];
            return (
              <div key={subject} className="space-y-4">
                <div className="flex items-center gap-4 px-2">
                  <div className={cn("w-1 h-3 rounded-full", info.tagColor.split(' ')[1])} />
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    {subject}
                    {items.reduce((acc, task) => acc + (task.estimatedPomodoros || 0), 0) >= 5 && (
                      <span title="Carga horária elevada" className="animate-pulse">🔥</span>
                    )}
                  </h3>
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-[10px] font-bold text-gray-300 leading-none">{items.length}</span>
                </div>
                <div className={cn("grid grid-cols-1 gap-4", !isEduStuffsOpen ? "lg:grid-cols-2" : "grid-cols-1")}>
                  {items.map(task => (
                    <TaskCard key={task.id} task={task} onEdit={() => onEdit(task)} />
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div className={cn("grid grid-cols-1 gap-4", !isEduStuffsOpen ? "lg:grid-cols-2" : "grid-cols-1")}>
            {sortedTasks.map(task => (
              <TaskCard key={task.id} task={task} onEdit={() => onEdit(task)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
