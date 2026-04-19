/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CalendarDays, CalendarRange, CalendarCheck, Inbox, LogIn, LogOut, X, 
  Loader2, LayoutList, Grid, BarChart2, Sparkles, 
  CloudRain, Snowflake, Droplets, History,
  Droplet, Check, CloudOff, CloudCheck, Plus
} from 'lucide-react';

import { TaskModal } from './components/layout/TaskModal';
import { HojeTab } from './components/layout/HojeTab';
import { InboxTab } from './components/layout/InboxTab';
import { HistoricoTab } from './components/layout/HistoricoTab';

import { User } from 'firebase/auth';

// Componentes
import { BackgroundEffects, type BgEffect } from './components/BackgroundEffects';
import { PomodoroWidget } from './components/PomodoroWidget';
import { FocusMode } from './components/FocusMode';
import { FocusMiniPlayer } from './components/FocusMiniPlayer';
import { SemanaKanban } from './components/SemanaKanban';
import { EduStuffsPanel } from './components/EduStuffs/EduStuffsPanel';
import { LevelUpModal } from './components/ui/LevelUpModal';
import { HistoryView } from './components/EduStuffs/HistoryView';
import { DebugConsole } from './components/ui/DebugConsole';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

// Hooks & Contexto
// Hooks & Contexto
import { useAuthContext } from './context/AuthContext';
import { useTasksContext } from './context/TasksContext';
import { useEduStuffs } from './hooks/useEduStuffs';
import { useFocus } from './context/FocusContext';
import { useUIWatcher } from './hooks/useUIWatcher';

// Utils, Types & Constants
import { cn } from './lib/cn';
import { playSuccessSound } from './utils/audio';
import { SUBJECT_INFO, SUBJECTS } from './constants/subjects';
import type { SubjectInfo } from './constants/subjects';
import { Task, Priority, Status, SubTask } from './types';
import { loginWithGoogle, logout, auth } from './firebase';

const TABS = [
  { id: 'hoje', label: 'Hoje', icon: CalendarDays, color: 'text-pastel-peach' },
  { id: 'semana', label: 'Semana', icon: CalendarRange, color: 'text-pastel-blue' },
  { id: 'inbox', label: 'Inbox', icon: Inbox, color: 'text-pastel-lavender' },
  { id: 'concluida', label: 'Histórico', icon: History, color: 'text-pastel-cream' },
] as const;

type Tab = typeof TABS[number]['id'];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('hoje');
  const [bgEffect, setBgEffect] = useState<BgEffect>(() => (localStorage.getItem('eduflow_bgeffect') as BgEffect) || 'bubbles');
  const { user, isAuthReady } = useAuthContext();
  const { tasks, isLoading, error, syncStatus } = useTasksContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | undefined>(undefined);
  const [globalExpanded, setGlobalExpanded] = useState(() => {
    return localStorage.getItem('eduflow_global_expanded') === 'true';
  });

  const toggleGlobalExpanded = () => {
    const next = !globalExpanded;
    setGlobalExpanded(next);
    localStorage.setItem('eduflow_global_expanded', String(next));
    // Dispatch custom event for current window
    window.dispatchEvent(new CustomEvent('eduflow-global-expand', { detail: { expanded: next } }));
  };

  // Recuperação EduFlow Phoenix: Métricas do Micro-Dashboard
  const { hojeCount, concluidaHojeCount, progressHoje } = React.useMemo(() => {
    // Pegar data local hoje no formato YYYY-MM-DD para comparação precisa
    const todayStr = new Date().toLocaleDateString('en-CA');
    
    const hojeTasks = tasks.filter(t => t.status === 'hoje');
    const concluidaHoje = tasks.filter(t => {
      if (t.status !== 'concluida') return false;
      if (!t.updatedAt) return false;
      
      // Converte timestamp do Firebase ou string para data local YYYY-MM-DD
      const updateDate = t.updatedAt?.toDate ? t.updatedAt.toDate() : new Date(t.updatedAt);
      const updateDateStr = updateDate.toLocaleDateString('en-CA');
      
      return updateDateStr === todayStr;
    });
    
    const hCount = hojeTasks.length;
    const cCount = concluidaHoje.length;
    const total = hCount + cCount;
    const progress = total > 0 ? Math.round((cCount / total) * 100) : 0;
    
    return { hojeCount: hCount, concluidaHojeCount: cCount, progressHoje: progress };
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('eduflow_bgeffect', bgEffect);
  }, [bgEffect]);

  const openCreateModal = () => {
    setTaskToEdit(undefined);
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setTaskToEdit(task);
    setIsModalOpen(true);
  };

  if (!isAuthReady) {
    return <div className="flex h-dvh items-center justify-center bg-pastel-bg">Carregando...</div>;
  }

  if (!user) {
    return (
      <div className="flex flex-col h-dvh w-full max-w-md mx-auto bg-white items-center justify-center p-8 text-center shadow-2xl sm:rounded-5xl sm:h-[80vh] sm:my-[10vh] border border-gray-100 animate-in fade-in duration-500 relative overflow-hidden">
        <BackgroundEffects effect={bgEffect} />
        <div className="relative z-10 w-full flex flex-col items-center">
          <div className="w-24 h-24 bg-orange-50 rounded-4xl flex items-center justify-center mb-8 shadow-sm border border-orange-100 animate-bounce-slow">
            <CalendarDays size={48} className="text-orange-500" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3 tracking-tight">EduFlow</h1>
          <p className="text-gray-500 text-sm mb-10 max-w-[240px] leading-relaxed">Sua jornada de estudos em um nível profissional.</p>
          <button
            onClick={loginWithGoogle}
            className="flex items-center gap-3 bg-gray-900 text-white px-8 py-4 rounded-2xl font-bold shadow-xl hover:bg-black transition-all active:scale-95 group"
          >
            <LogIn size={20} className="group-hover:translate-x-1 transition-transform" />
            ENTRAR COM GOOGLE
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AppContent 
        activeTab={activeTab} setActiveTab={setActiveTab}
        bgEffect={bgEffect} setBgEffect={setBgEffect}
        progressHoje={progressHoje}
        hojeCount={hojeCount}
        concluidaHojeCount={concluidaHojeCount}
        openCreateModal={openCreateModal}
        openEditModal={openEditModal}
        isModalOpen={isModalOpen} setIsModalOpen={setIsModalOpen}
        taskToEdit={taskToEdit}
        globalExpanded={globalExpanded}
        toggleGlobalExpanded={toggleGlobalExpanded}
      />
      <DebugConsole />
    </ErrorBoundary>
  );
}

// Separate component to consume the FocusContext
function AppContent({ 
  activeTab, setActiveTab, bgEffect, setBgEffect,
  progressHoje, hojeCount, concluidaHojeCount, openCreateModal, openEditModal,
  isModalOpen, setIsModalOpen, taskToEdit, globalExpanded, toggleGlobalExpanded
}: any) {
  const { user } = useAuthContext();
  const { tasks, isLoading, error, syncStatus } = useTasksContext();
  const { activeTask, setActiveTask, session, view: focusView, setView: setFocusView } = useFocus();
  const { progress, levelUpTriggered } = useEduStuffs();
  const [isBgMenuOpen, setIsBgMenuOpen] = useState(false);
  const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);
  
  // Watchdog de Integridade de UI (Monitoramento de Elementos Globais)
  useUIWatcher(['nav-bar'], 5000);
  const [isEduStuffsOpen, setIsEduStuffsOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem('eduflow_edustuffs_open');
    if (saved !== 'false') {
      setIsEduStuffsOpen(true);
    }
  }, []);

  // Celebração de Level Up
  useEffect(() => {
    if (levelUpTriggered) {
      setIsLevelModalOpen(true);
    }
  }, [levelUpTriggered]);

  // Auto-collapse sidebar during focus
  useEffect(() => {
    if (activeTask && focusView === 'full') {
      setIsEduStuffsOpen(false);
    }
  }, [activeTask, focusView]);

  const toggleEduStuffs = () => {
    const next = !isEduStuffsOpen;
    setIsEduStuffsOpen(next);
    localStorage.setItem('eduflow_edustuffs_open', String(next));
  };

  return (
    <div id="app-root" className="h-dvh w-full md:max-w-full lg:max-w-[98%] xl:max-w-[96%] mx-auto bg-transparent overflow-hidden relative shadow-2xl sm:h-screen border-x border-white/20">
      <BackgroundEffects effect={bgEffect} />
      <div className={cn(
        "flex flex-col h-full w-full transition-all duration-500 ease-in-out",
        isEduStuffsOpen ? "lg:pr-[460px]" : "pr-0"
      )}>
        <PomodoroWidget tasks={tasks} />

      {/* HEADER UNIFICADO: PREMIUM PAPER DESIGN */}
      <header id="nav-bar" className="px-4 sm:px-5 py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-black/5 bg-[#FCF9F2]/80 backdrop-blur-xl sticky top-0 z-60 shadow-sm">
        <div className="flex items-center gap-4">
          <div 
            onClick={() => setActiveTab('hoje')}
            className="w-10 h-10 bg-linear-to-br from-orange-400 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200/50 -rotate-3 hover:rotate-0 transition-all cursor-pointer group active:scale-90"
          >
            <span className="text-white font-black text-2xl italic tracking-tighter group-hover:scale-110 transition-transform">EF</span>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-gray-900 leading-none uppercase">
              {activeTab === 'hoje' ? 'Missões' : activeTab === 'semana' ? 'Semana' : activeTab === 'inbox' ? 'Triagem' : 'Legado'}
            </h1>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">
              EduFlow <span className="mx-1 text-gray-200">|</span> {activeTab === 'hoje' ? 'Foco Máximo' : activeTab === 'semana' ? 'Visão Geral' : activeTab === 'inbox' ? 'Processando' : 'Conquistas'}
            </p>
          </div>
        </div>

        {/* MICRO-DASHBOARD (CENTER) */}
        <div className="hidden lg:flex items-center gap-10 px-8 py-2.5 bg-white/50 border border-white/80 rounded-full shadow-sm backdrop-blur-md">
           <div className="flex flex-col items-end">
             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 opacity-60">Meta Diária</span>
             <div className="flex items-center gap-3">
               <span className="text-sm font-black text-gray-800 tabular-nums">
                 {concluidaHojeCount} <span className="text-gray-300 font-medium">/</span> {hojeCount + concluidaHojeCount}
               </span>
               <div className="w-32 h-2 bg-gray-100/50 rounded-full overflow-hidden border border-white/80 shadow-inner">
                 <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${progressHoje}%` }}
                   className="h-full bg-linear-to-r from-orange-400 to-rose-500 transition-all duration-1000"
                 />
               </div>
             </div>
           </div>
           
           <div className="w-px h-10 bg-black/5" />
           
           {activeTask ? (
             <div className="flex flex-col">
               <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 opacity-60">
                 Sessão Ativa
               </span>
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
                 <span className="text-sm font-black text-orange-600 tabular-nums">
                   {Math.floor((session?.sessionLiquidTime || 0) / 60)}
                   <span className="text-[10px] font-bold opacity-70 ml-1">MIN</span>
                 </span>
                 <span className="text-[10px] text-gray-400 font-bold truncate max-w-[100px]">
                   {activeTask.title}
                 </span>
               </div>
             </div>
           ) : (
             <div className="flex flex-col">
               <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 opacity-60">
                 Tempo Real
               </span>
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                 <span className="text-sm font-black text-emerald-600">
                   {Math.floor(tasks.reduce((acc: any, t: any) => acc + (t.liquidTime || 0), 0) / 60)}
                   <span className="text-[10px] font-bold opacity-70 ml-1">MIN</span>
                 </span>
               </div>
             </div>
           )}
        </div>

        <div className="flex items-center gap-3">
           {/* New Sync Indicator */}
           <div className={cn(
             "px-4 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-widest border transition-all duration-500 flex items-center gap-2.5 shadow-sm",
             syncStatus === 'synced' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
             syncStatus === 'syncing' ? "bg-amber-50/50 text-amber-600 border-amber-100" :
             "bg-gray-50 text-gray-400 border-gray-100"
           )}>
             {syncStatus === 'synced' ? <CloudCheck size={14} className="shadow-[0_0_8px_currentColor] opacity-70" /> : 
              syncStatus === 'syncing' ? <Loader2 size={14} className="animate-spin" /> : 
              <CloudOff size={14} />}
             <span className="hidden md:inline">
               {syncStatus === 'synced' ? 'Nuvem OK' : syncStatus === 'syncing' ? 'Salvando' : 'Offline'}
             </span>
           </div>

            {/* Planner Sidebar Toggle */}
            <button 
              id="btn-toggle-planner"
              onClick={toggleEduStuffs}
              aria-expanded={isEduStuffsOpen}
              title={isEduStuffsOpen ? "Recolher Planner" : "Expandir Planner"}
              className={cn(
                "p-2.5 transition-all rounded-xl border shadow-sm flex items-center justify-center gap-2",
                isEduStuffsOpen 
                  ? "border-emerald-100 bg-emerald-50 text-emerald-600" 
                  : "bg-white text-gray-400 hover:text-emerald-600 border-gray-100 hover:border-emerald-50"
              )}
            >
               <CalendarCheck size={20} />
               <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Planner</span>
            </button>

            {/* Global Expand Toggle */}
            <button 
              onClick={toggleGlobalExpanded}
              title={globalExpanded ? "Recolher Todos os Cartões" : "Expandir Todos os Cartões"}
              className={cn(
                "p-2.5 text-gray-400 hover:text-orange-600 transition-all rounded-xl hover:bg-white border border-transparent shadow-sm flex items-center justify-center",
                globalExpanded ? "border-orange-100 bg-orange-50/50 text-orange-600" : "hover:border-orange-50"
              )}
            >
               {globalExpanded ? <LayoutList size={20} /> : <Grid size={20} />}
            </button>

            {/* Bg Effect Swapper */}
            <div className="relative group">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsBgMenuOpen(!isBgMenuOpen);
                }}
                className={cn(
                  "p-2.5 text-gray-400 hover:text-indigo-600 transition-all rounded-xl hover:bg-white border border-transparent shadow-sm",
                  isBgMenuOpen ? "border-indigo-100 bg-indigo-50/50 text-indigo-600" : "hover:border-indigo-50"
                )}
              >
                 {bgEffect === 'none' ? <Droplet size={20} className="rotate-180 opacity-40" /> : 
                  bgEffect === 'rain' ? <CloudRain size={20} className="text-blue-400" /> : 
                  bgEffect === 'snow' ? <Snowflake size={20} className="text-blue-100" /> : 
                  <Droplets size={20} className="text-cyan-400" />}
              </button>
              
              <AnimatePresence>
                {isBgMenuOpen && (
                  <>
                    {/* Backdrop for closing */}
                    <div className="fixed inset-0 z-65" onClick={() => setIsBgMenuOpen(false)} />
                    
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 top-full mt-3 bg-white/95 backdrop-blur-2xl border border-gray-100 shadow-2xl rounded-3xl p-2 z-70 min-w-[150px]"
                    >
                       {(['bubbles', 'rain', 'snow', 'none'] as BgEffect[]).map(eff => (
                         <button 
                           key={eff}
                           onClick={() => {
                             setBgEffect(eff);
                             setIsBgMenuOpen(false);
                           }}
                           className={cn(
                             "w-full px-4 py-2.5 rounded-2xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-between transition-all",
                             bgEffect === eff ? "bg-indigo-50 text-indigo-600" : "text-gray-400 hover:bg-gray-50 hover:text-gray-900"
                           )}
                         >
                           {eff === 'none' ? 'Sem Efeito' : eff === 'bubbles' ? 'Bolhas' : eff === 'rain' ? 'Chuva' : 'Neve'}
                           {bgEffect === eff && <Check size={12} />}
                         </button>
                       ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

           <div className="w-px h-8 bg-black/5 mx-1" />
           
           <button 
             onClick={() => {
               if (window.confirm('Deseja realmente sair do EduFlow?')) {
                 logout();
               }
             }} 
             className="p-3 text-gray-400 hover:text-rose-500 transition-all rounded-2xl hover:bg-rose-50 group"
             title="Sair"
           >
             <LogOut size={22} className="group-hover:-translate-x-1 transition-transform" />
           </button>
        </div>
      </header>
        {/* Main Layout Area inside the Padding Wrapper */}
        <main className="flex-1 min-w-0 overflow-y-auto p-6 pb-44 relative custom-scrollbar">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center gap-2 text-sm font-bold animate-in fade-in duration-300">
              <X size={18} /> Erro ao carregar dados: {error}
            </div>
          )}
          
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-text-muted animate-in fade-in duration-500">
              <Loader2 size={40} className="animate-spin text-pastel-blue" />
              <p className="font-bold text-sm tracking-wide">Sincronizando com a nuvem...</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {activeTab === 'hoje' && <HojeTab tasks={tasks} onEdit={openEditModal} userName={user.displayName} isEduStuffsOpen={isEduStuffsOpen} />}
                {activeTab === 'semana' && <SemanaKanban tasks={tasks} onEdit={openEditModal} playSuccessSound={playSuccessSound} />}
                {activeTab === 'inbox' && <InboxTab tasks={tasks} onEdit={openEditModal} isEduStuffsOpen={isEduStuffsOpen} />}
                {activeTab === 'concluida' && <HistoricoTab tasks={tasks} onEdit={openEditModal} userId={user.uid} isEduStuffsOpen={isEduStuffsOpen} />}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>

      <EduStuffsPanel 
        isOpen={isEduStuffsOpen} 
        onToggle={toggleEduStuffs} 
        userId={user.uid} 
      />

      {/* Floating Action Button */}
      <button
        onClick={openCreateModal}
        className={cn(
          "fixed bottom-24 w-16 h-16 bg-orange-500 text-white rounded-full flex items-center justify-center shadow-2xl glass-premium z-90 transition-all duration-500 active:scale-90 hover:scale-105 group",
          isEduStuffsOpen ? "lg:right-[504px] right-6" : "lg:right-24 right-6"
        )}
        style={{ 
          background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
          boxShadow: '0 10px 25px -5px rgba(234, 88, 12, 0.4), 0 8px 10px -6px rgba(234, 88, 12, 0.4)'
        }}
      >
        <Plus size={32} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-300" />
      </button>

      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2.5rem)] sm:w-auto sm:min-w-[440px] bg-white/70 backdrop-blur-xl border border-gray-200/50 px-3 py-1.5 flex justify-between items-center z-70 rounded-4xl shadow-xl">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative flex flex-col items-center justify-center p-1.5 transition-all active:scale-95 group min-w-[60px]"
            >
              {isActive && (
                <motion.div 
                  layoutId="activePill"
                  className="absolute inset-0 bg-gray-100/80 rounded-2xl"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <Icon
                size={20}
                strokeWidth={isActive ? 2.5 : 2}
                className={cn(
                  "relative z-10 transition-all duration-300",
                  isActive ? "text-indigo-600" : "text-gray-400 group-hover:text-gray-600 group-hover:scale-110"
                )}
              />
              <span
                className={cn(
                  "relative z-10 text-[10px] font-bold transition-all duration-300 mt-1",
                  isActive ? "text-indigo-600 opacity-100" : "text-gray-400 opacity-0 translate-y-1"
                )}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Create/Edit Task Modal */}
      <TaskModal 
        isOpen={isModalOpen} 
        onClose={(status) => {
          setIsModalOpen(false);
          if (status && status !== activeTab && ['hoje', 'semana', 'inbox', 'concluida'].includes(status)) {
            setActiveTab(status as Tab);
          }
        }} 
        user={user}
        taskToEdit={taskToEdit}
      />

      <AnimatePresence>
        {activeTask && focusView === 'full' && (
          <FocusMode 
            key={activeTask.id}
          />
        )}
        {activeTask && focusView === 'mini' && (
          <FocusMiniPlayer key={`mini-${activeTask.id}`} />
        )}

        {isLevelModalOpen && progress && (
          <LevelUpModal 
            level={progress.level}
            onClose={() => setIsLevelModalOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Debug Overlay (Watchdog Status) */}
    </div>
  );
}
