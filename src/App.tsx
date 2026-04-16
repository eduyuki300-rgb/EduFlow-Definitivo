/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CalendarDays, CalendarRange, Inbox, Target, History, Plus, Circle, CheckCircle2, 
  LogIn, LogOut, X, CheckSquare, Square, Star, BookOpen, Brain, Trash2, Pencil, 
  Upload, Image as ImageIcon, Loader2, LayoutList, Grid, BarChart2, Sparkles, 
  Tag, Clock, ChevronDown, ChevronUp, Search, CloudRain, Snowflake, Droplets, 
  Droplet, Play, Check, Settings 
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth, db, loginWithGoogle, logout } from './firebase';
import { User } from 'firebase/auth';
import { Task, Priority, Status, SubTask } from './types';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { PomodoroWidget } from './components/PomodoroWidget';
import { FocusMode } from './components/FocusMode';
import { FocusMiniPlayer } from './components/FocusMiniPlayer';
import { BackgroundEffects, BgEffect } from './components/BackgroundEffects';
import { useAuth } from './hooks/useAuth';
import { useTasks, createTask, updateTask, deleteTask } from './hooks/useTasks';
import { Cloud, CloudOff, CloudCheck, CloudUpload } from 'lucide-react';
import { playSuccessSound } from './utils/audio';
import { SemanaKanban } from './components/SemanaKanban';
import { FocusProvider, useFocus } from './context/FocusContext';
import { SUBJECT_INFO, SUBJECTS } from './constants/subjects';
import type { SubjectInfo } from './constants/subjects';

// removed local playSuccessSound, now using from utils

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Removed local Tab type, now defined via TABS

// SUBJECT_INFO moved to src/constants/subjects.ts

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
  const { user, isAuthReady } = useAuth();
  const { tasks, isLoading, error, syncStatus, forceSync } = useTasks(user?.uid);
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
    const hojeTasks = tasks.filter(t => t.status === 'hoje');
    const concluidaHoje = tasks.filter(t => {
      if (t.status !== 'concluida') return false;
      if (!t.updatedAt) return false;
      const date = t.updatedAt.toDate ? t.updatedAt.toDate() : new Date(t.updatedAt);
      return date.toDateString() === new Date().toDateString();
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
    return <div className="flex h-[100dvh] items-center justify-center bg-pastel-bg">Carregando...</div>;
  }

  if (!user) {
    return (
      <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto bg-white items-center justify-center p-8 text-center shadow-2xl sm:rounded-[2.5rem] sm:h-[80vh] sm:my-[10vh] border border-gray-100 animate-in fade-in duration-500 relative overflow-hidden">
        <BackgroundEffects effect={bgEffect} />
        <div className="relative z-10 w-full flex flex-col items-center">
          <div className="w-24 h-24 bg-orange-50 rounded-[2rem] flex items-center justify-center mb-8 shadow-sm border border-orange-100 animate-bounce-slow">
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
    <FocusProvider tasks={tasks}>
      <AppContent 
        activeTab={activeTab} setActiveTab={setActiveTab}
        bgEffect={bgEffect} setBgEffect={setBgEffect}
        tasks={tasks} isLoading={isLoading} error={error}
        syncStatus={syncStatus}
        progressHoje={progressHoje}
        hojeCount={hojeCount}
        concluidaHojeCount={concluidaHojeCount}
        openCreateModal={openCreateModal}
        openEditModal={openEditModal}
        isModalOpen={isModalOpen} setIsModalOpen={setIsModalOpen}
        taskToEdit={taskToEdit}
        user={user}
        globalExpanded={globalExpanded}
        toggleGlobalExpanded={toggleGlobalExpanded}
      />
    </FocusProvider>
  );
}

// Separate component to consume the FocusContext
function AppContent({ 
  activeTab, setActiveTab, bgEffect, setBgEffect, tasks, isLoading, error, syncStatus,
  progressHoje, hojeCount, concluidaHojeCount, openCreateModal, openEditModal,
  isModalOpen, setIsModalOpen, taskToEdit, user, globalExpanded, toggleGlobalExpanded
}: any) {
  const { activeTask, setActiveTask, session, view: focusView, setView: setFocusView } = useFocus();
  const [isBgMenuOpen, setIsBgMenuOpen] = useState(false);

  return (
    <div className="flex flex-col h-[100dvh] w-full md:max-w-[100%] lg:max-w-[98%] xl:max-w-[96%] mx-auto bg-transparent overflow-hidden relative shadow-2xl sm:h-screen border-x border-white/20">
      <BackgroundEffects effect={bgEffect} />
      <PomodoroWidget tasks={tasks} />

      {/* HEADER UNIFICADO: PREMIUM PAPER DESIGN */}
      <header className="px-5 py-4 flex items-center justify-between border-b border-black/5 bg-[#FCF9F2]/80 backdrop-blur-xl sticky top-0 z-[60] shadow-sm">
        <div className="flex items-center gap-4">
          <div 
            onClick={() => setActiveTab('hoje')}
            className="w-10 h-10 bg-gradient-to-br from-orange-400 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200/50 -rotate-3 hover:rotate-0 transition-all cursor-pointer group active:scale-90"
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
                   className="h-full bg-gradient-to-r from-orange-400 to-rose-500 transition-all duration-1000"
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

             {/* Global Expand Toggle */}
             <button 
               onClick={toggleGlobalExpanded}
               title={globalExpanded ? "Recolher Todos os Cartões" : "Expandir Todos os Cartões"}
               className={cn(
                 "p-2.5 text-gray-400 hover:text-orange-600 transition-all rounded-xl hover:bg-white border border-transparent shadow-sm hidden sm:flex items-center justify-center",
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
                    <div className="fixed inset-0 z-[65]" onClick={() => setIsBgMenuOpen(false)} />
                    
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 top-full mt-3 bg-white/95 backdrop-blur-2xl border border-gray-100 shadow-2xl rounded-3xl p-2 z-[70] min-w-[150px]"
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

           <div className="w-[1px] h-8 bg-black/5 mx-1" />
           
           <button onClick={() => logout()} className="p-3 text-gray-400 hover:text-rose-500 transition-all rounded-2xl hover:bg-rose-50 group">
             <LogOut size={22} className="group-hover:-translate-x-1 transition-transform" />
           </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 pb-32 relative custom-scrollbar">
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
              {activeTab === 'hoje' && <HojeTab tasks={tasks} onEdit={openEditModal} />}
              {activeTab === 'semana' && <SemanaKanban tasks={tasks} onEdit={openEditModal} playSuccessSound={playSuccessSound} />}
              {activeTab === 'inbox' && <InboxTab tasks={tasks} onEdit={openEditModal} />}
              {activeTab === 'concluida' && <HistoricoTab tasks={tasks} onEdit={openEditModal} />}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* Floating Action Button */}
      <button
        onClick={openCreateModal}
        className="absolute bottom-24 right-6 w-16 h-16 bg-orange-500 text-white rounded-full flex items-center justify-center shadow-2xl glass-premium z-30 transition-all active:scale-90 hover:scale-105 group"
        style={{ 
          background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
          boxShadow: '0 10px 25px -5px rgba(234, 88, 12, 0.4), 0 8px 10px -6px rgba(234, 88, 12, 0.4)'
        }}
      >
        <Plus size={32} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-300" />
      </button>

      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2.5rem)] sm:w-auto sm:min-w-[440px] bg-white/70 backdrop-blur-xl border border-gray-200/50 px-3 py-1.5 flex justify-between items-center z-40 rounded-[2rem] shadow-xl">
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
        {activeTask && (
          <FocusMode 
            key={activeTask.id}
            task={activeTask} 
            view={focusView === 'widget' ? 'full' : focusView === 'mini' ? 'minimized' : 'full'}
            onViewChange={(v) => setFocusView(v === 'minimized' ? 'mini' : 'full')}
            onClose={() => setActiveTask(null)}
            playSuccessSound={playSuccessSound}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Modal Component
function TaskModal({ isOpen, onClose, user, taskToEdit }: { isOpen: boolean, onClose: (s?: string) => void, user: User, taskToEdit?: Task }) {
  const [activeTab, setActiveTab] = useState<'geral' | 'estrutura' | 'metricas' | 'ia'>('geral');
  
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Geral');
  const [priority, setPriority] = useState<Priority>('media');
  const [status, setStatus] = useState<Status>('inbox');
  
  // New Module Fields
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [questionsTotal, setQuestionsTotal] = useState<number>(0);
  const [questionsCorrect, setQuestionsCorrect] = useState<number>(0);
  const [theoryCompleted, setTheoryCompleted] = useState(false);
  const [flashcardsCompleted, setFlashcardsCompleted] = useState(false);
  const [difficulty, setDifficulty] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [pomodoros, setPomodoros] = useState<number>(0);
  const [estimatedPomodoros, setEstimatedPomodoros] = useState<number>(0);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [jsonImportText, setJsonImportText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (taskToEdit) {
        setTitle(taskToEdit.title);
        setSubject(taskToEdit.subject);
        setPriority(taskToEdit.priority);
        setStatus(taskToEdit.status);
        setSubtasks(taskToEdit.subtasks || []);
        setQuestionsTotal(taskToEdit.questionsTotal || 0);
        setQuestionsCorrect(taskToEdit.questionsCorrect || 0);
        setTheoryCompleted(taskToEdit.theoryCompleted || false);
        setFlashcardsCompleted(taskToEdit.flashcardsCompleted || false);
        setDifficulty(taskToEdit.difficulty || 0);
        setNotes(taskToEdit.notes || '');
        setPomodoros(taskToEdit.pomodoros || 0);
        setEstimatedPomodoros(taskToEdit.estimatedPomodoros || 0);
        setTags(taskToEdit.tags || []);
      } else {
        setTitle('');
        setSubject('Geral');
        setPriority('media');
        setStatus('inbox');
        setSubtasks([]);
        setQuestionsTotal(0);
        setQuestionsCorrect(0);
        setTheoryCompleted(false);
        setFlashcardsCompleted(false);
        setDifficulty(0);
        setNotes('');
        setPomodoros(0);
        setEstimatedPomodoros(0);
        setTags([]);
      }
      setActiveTab('geral');
    }
  }, [isOpen, taskToEdit]);

  // AI Extraction State
  const [images, setImages] = useState<string[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setImages(prev => [...prev, reader.result as string]);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const processImportedJson = async () => {
    if (!jsonImportText.trim()) {
      alert("Cole o código JSON gerado pelo Gemini primeiro.");
      return;
    }
    
    setIsExtracting(true);
    try {
      // Try the AI API call first, if it fails or if there's no images, fallback to JSON text
      let text = '';
      if (images.length > 0) {
        const prompt = `
          Você é um tutor especialista em ENEM e organização de estudos de alto rendimento. 
          Analise as imagens fornecidas (prints de cronogramas, plataformas de estudo, editais ou listas de tarefas).
          Extraia as informações e estruture um plano de estudo otimizado.
          
          Retorne um objeto JSON estrito com a seguinte estrutura:
          {
            "title": "Nome do Módulo Principal (ex: Genética - Leis de Mendel)",
            "subject": "Uma destas exatas opções: Geral, Biologia, Física, Química, Matemática, Linguagens, Humanas, Redação",
            "estimatedPomodoros": número inteiro (estime 1 pomodoro de 25min para cada 30min de conteúdo/exercícios),
            "difficulty": número de 1 a 3 (1=Fácil, 2=Médio, 3=Difícil, baseado na complexidade do tema para o ENEM),
            "tags": ["array", "de", "strings", "curtas", "ex: ENEM", "Revisão", "Natureza"],
            "subtasks": [
              {
                "title": "Nome do Grupo (ex: 📺 Vídeo Aulas, 📝 Exercícios de Fixação)",
                "items": [
                  { "title": "Nome do item específico (ex: 1. Introdução à Genética (30 min))" }
                ]
              }
            ]
          }
          Retorne APENAS o JSON válido, sem formatação markdown (sem \`\`\`json) ou texto adicional.
        `;

        const contents = {
          parts: [
            { text: prompt },
            ...images.map((base64: string) => {
              const isDataUrl = base64.includes(',');
              const base64Data = isDataUrl ? base64.split(',')[1] : base64;
              const mimeType = isDataUrl ? base64.split(',')[0].split(':')[1].split(';')[0] : "image/jpeg";
              return {
                inlineData: {
                  data: base64Data,
                  mimeType: mimeType
                }
              };
            })
          ]
        };

        const idToken = await auth.currentUser?.getIdToken();
        const response = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({ contents })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro na API do Gemini');
        }

        const responseData = await response.json();
        text = responseData.text;
      } else {
        text = jsonImportText.trim();
        text = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      }

      if (!text) throw new Error("Entrada vazia. Use imagens ou cole o JSON.");
      
      const data = JSON.parse(text);
      
      if (data.title) setTitle(data.title);
      if (data.subject && SUBJECTS.includes(data.subject)) setSubject(data.subject);
      if (data.estimatedPomodoros) setEstimatedPomodoros(Number(data.estimatedPomodoros));
      if (data.difficulty) setDifficulty(Number(data.difficulty));
      if (data.tags && Array.isArray(data.tags)) setTags(data.tags);
      
      if (data.subtasks && Array.isArray(data.subtasks)) {
        const newSubtasks: SubTask[] = data.subtasks.map((st: any) => ({
          id: crypto.randomUUID(),
          title: st.title || 'Grupo',
          completed: false,
          items: (st.items || []).map((item: any) => ({
            id: crypto.randomUUID(),
            title: item.title || 'Item',
            completed: false
          }))
        }));
        setSubtasks(newSubtasks);
      }
      
      setJsonImportText('');
      setActiveTab('geral');
    } catch (error: any) {
      console.error(error);
      alert('Erro ao interpretar o JSON. Certifique-se de que o Gemini retornou o formato perfeito de código JSON e tente novamente.');
    } finally {
      setIsExtracting(false);
    }
  };

  if (!isOpen) return null;

  const addSubtaskGroup = () => {
    setSubtasks([...subtasks, { id: Date.now().toString(), title: '', completed: false, items: [] }]);
  };

  const updateSubtaskGroupTitle = (groupId: string, title: string) => {
    setSubtasks(prev => prev.map(g => g.id === groupId ? { ...g, title } : g));
  };

  const removeSubtaskGroup = (id: string) => {
    setSubtasks(subtasks.filter(st => st.id !== id));
  };

  const addSubtaskItem = (groupId: string) => {
    setSubtasks(prev => prev.map(g => g.id === groupId ? {
      ...g,
      items: [...(g.items || []), { id: crypto.randomUUID(), title: '', completed: false }]
    } : g));
  };

  const updateSubtaskItemTitle = (groupId: string, itemId: string, newTitle: string) => {
    setSubtasks(subtasks.map(st => {
      if (st.id === groupId) {
        return { ...st, items: st.items.map(item => item.id === itemId ? { ...item, title: newTitle } : item) };
      }
      return st;
    }));
  };

  const removeSubtaskItem = (groupId: string, itemId: string) => {
    setSubtasks(subtasks.map(st => {
      if (st.id === groupId) {
        return { ...st, items: st.items.filter(item => item.id !== itemId) };
      }
      return st;
    }));
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    // Strict validation for Firestore rules
    const finalTitle = title.trim();
    const finalSubject = subject || 'Geral';
    
    if (finalTitle.length < 1 || finalTitle.length > 150) {
      alert("O título deve ter entre 1 e 150 caracteres.");
      return;
    }
    
    if (finalSubject.length < 1 || finalSubject.length > 50) {
      alert("A matéria deve ter entre 1 e 50 caracteres.");
      return;
    }

      setIsSubmitting(true);
    const cleanedSubtasks = subtasks
      .map(st => ({
        ...st,
        title: st.title.trim() || 'Sem título',
        items: (st.items || []).filter(item => item.title.trim() !== '')
      }))
      .filter(st => st.title !== 'Sem título' || st.items.length > 0);

    const taskData = {
      title: finalTitle,
      subject: finalSubject,
      priority,
      status,
      subtasks: cleanedSubtasks,
      questionsTotal: Number(questionsTotal) || 0,
      questionsCorrect: Number(questionsCorrect) || 0,
      theoryCompleted,
      flashcardsCompleted,
      difficulty,
      notes: notes.trim(),
      pomodoros: Number(pomodoros) || 0,
      estimatedPomodoros: Number(estimatedPomodoros) || 0,
      tags
    };

    try {
      if (taskToEdit) {
        await updateTask(taskToEdit.id, taskData);
        playSuccessSound();
      } else {
        await createTask(user.uid, taskData);
        playSuccessSound();
      }
      onClose(taskData.status);
    } catch (error) {
      console.error("Error saving task", error);
      alert("Erro ao salvar a tarefa. Verifique sua conexão.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!taskToEdit || isSubmitting) return;
    if (!confirm("Tem certeza que deseja excluir este módulo permanentemente?")) return;
    
    setIsSubmitting(true);
    try {
      await deleteTask(taskToEdit.id);
      onClose();
    } catch (error) {
      console.error("Error deleting task", error);
      alert("Erro ao excluir. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs = [
    { id: 'geral', label: 'Geral', icon: <BookOpen size={16} /> },
    { id: 'estrutura', label: 'Estrutura', icon: <LayoutList size={16} /> },
    { id: 'metricas', label: 'Métricas', icon: <BarChart2 size={16} /> },
    { id: 'ia', label: 'IA Assist', icon: <Sparkles size={16} /> },
  ] as const;

  return (
    <div className="fixed inset-0 h-[100dvh] z-50 flex flex-col sm:items-center sm:justify-center bg-black/20 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-4xl flex flex-col sm:flex-row sm:rounded-[2rem] shadow-2xl animate-in slide-in-from-bottom-8 duration-300 border border-gray-100 overflow-hidden"
        onPaste={handlePaste}
      >
        
        {/* Sidebar Navigation (Desktop) / Top Navigation (Mobile) */}
        <div className="bg-gray-50/50 border-b sm:border-b-0 sm:border-r border-gray-100 sm:w-64 shrink-0 flex flex-col">
          <div className="p-8 hidden sm:block">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              {taskToEdit ? '✏️ Módulo' : '✨ Novo'}
            </h2>
            <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-widest">Configurações</p>
          </div>
          
          {/* Mobile Header */}
          <div className="p-5 flex justify-between items-center sm:hidden bg-white border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              {taskToEdit ? '✏️ Editar' : '✨ Novo'}
            </h2>
            <button onClick={() => onClose()} className="p-2.5 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200 transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex sm:flex-col gap-1.5 p-4 sm:p-5 overflow-x-auto sm:overflow-visible custom-scrollbar">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-3 px-5 py-3 rounded-2xl text-xs font-bold transition-all whitespace-nowrap uppercase tracking-widest",
                  activeTab === tab.id 
                    ? "bg-white text-gray-900 shadow-sm border border-gray-100" 
                    : "text-gray-500 hover:bg-gray-100/50 hover:text-gray-900"
                )}
              >
                <span className={cn("transition-transform duration-300", activeTab === tab.id && "scale-110")}>
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-auto p-4 hidden sm:block">
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || isSubmitting}
              className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-black transition-all"
            >
              {isSubmitting ? (taskToEdit ? 'Salvando...' : 'Criando...') : (taskToEdit ? 'Salvar Alterações' : 'Criar Módulo')}
            </button>
            {taskToEdit && (
              <button onClick={handleDelete} disabled={isSubmitting} className="w-full mt-2 py-2 text-red-500 text-sm font-bold hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50">
                {isSubmitting ? 'Excluindo...' : 'Excluir Módulo'}
              </button>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-0 bg-white relative">
          {/* Desktop Close Button - Adjusted position */}
          <button onClick={onClose} className="hidden sm:flex absolute top-8 right-8 p-3 bg-gray-50 border border-gray-100 rounded-full text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all z-10 active:scale-90 shadow-sm">
            <X size={24} />
          </button>

          <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
            
            {/* TAB: GERAL */}
            {activeTab === 'geral' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-3 uppercase tracking-widest">📚 Nome do Módulo</label>
                  <input
                    autoFocus
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Genética - Leis de Mendel"
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-xl placeholder:text-gray-300 shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-text-muted mb-3 uppercase tracking-widest opacity-50">🏷️ Matéria</label>
                  <div className="flex flex-wrap gap-2">
                    {SUBJECTS.map(sub => {
                      const info = SUBJECT_INFO[sub] || SUBJECT_INFO['Geral'];
                      const isSelected = subject === sub;
                      return (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => setSubject(sub)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-sm font-semibold transition-all border flex items-center gap-1.5",
                            isSelected 
                              ? cn(info.tagColor, "scale-105 shadow-sm") 
                              : "bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100"
                          )}
                        >
                          <span>{info.emoji}</span> {sub}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-text-muted mb-2 uppercase tracking-wider">⚡ Prioridade</label>
                    <select 
                      value={priority} 
                      onChange={(e) => setPriority(e.target.value as Priority)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none font-semibold text-sm"
                    >
                      <option value="baixa">Baixa</option>
                      <option value="media">Média</option>
                      <option value="alta">Alta</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted mb-2 uppercase tracking-widest opacity-50">🎯 Destino</label>
                    <select 
                      value={status} 
                      onChange={(e) => setStatus(e.target.value as Status)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none font-semibold text-sm"
                    >
                      <option value="inbox">📥 Inbox</option>
                      <option value="hoje">🎯 Hoje</option>
                      <option value="semana">🗓️ Semana</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">🤯 Dificuldade</label>
                    <div className="flex gap-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 h-[46px] items-center">
                      {[1, 2, 3].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setDifficulty(star)}
                          className="p-1 transition-transform hover:scale-110"
                        >
                          <Star
                            size={22}
                            className={cn(
                              "transition-colors",
                              difficulty >= star ? "fill-orange-400 text-orange-400" : "text-gray-200"
                            )}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">⏱️ Pomodoros Estimados</label>
                    <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-2 py-1.5 h-[46px]">
                      <button type="button" onClick={() => setEstimatedPomodoros(Math.max(0, estimatedPomodoros - 1))} className="w-8 h-8 rounded-lg bg-white shadow-sm text-gray-600 font-bold hover:bg-gray-100 flex items-center justify-center border border-gray-100">-</button>
                      <span className="font-bold text-lg text-gray-900 w-8 text-center">{estimatedPomodoros}</span>
                      <button type="button" onClick={() => setEstimatedPomodoros(estimatedPomodoros + 1)} className="w-8 h-8 rounded-lg bg-white shadow-sm text-gray-600 font-bold hover:bg-gray-100 flex items-center justify-center border border-gray-100">+</button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">🏷️ Tags Personalizadas</label>
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-2 flex flex-wrap gap-2 items-center min-h-[46px]">
                    {tags.map(tag => (
                      <span key={tag} className="bg-white border border-gray-100 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1.5 text-gray-700 shadow-sm">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="text-gray-400 hover:text-red-500 transition-colors">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleAddTag}
                      placeholder="Adicionar tag e apertar Enter..."
                      className="flex-1 bg-transparent min-w-[150px] text-sm focus:outline-none px-2 text-gray-900 placeholder:text-gray-300"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB: ESTRUTURA */}
            {activeTab === 'estrutura' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Checklist de Aulas</h3>
                    <p className="text-xs text-gray-500">Divida o módulo em partes menores.</p>
                  </div>
                  <button type="button" onClick={addSubtaskGroup} className="bg-white px-4 py-2 rounded-xl text-gray-700 hover:bg-gray-50 font-bold text-xs flex items-center gap-2 border border-gray-200 shadow-sm transition-all active:scale-95">
                    <Plus size={14} /> Novo Grupo
                  </button>
                </div>
                
                {subtasks.length === 0 && (
                  <div className="text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                    <LayoutList size={32} className="mx-auto text-gray-200 mb-3" />
                    <p className="text-sm text-gray-500 font-medium">Nenhuma sub-tarefa adicionada.</p>
                    <p className="text-xs text-gray-400 mt-1">Ex: Vídeo aulas, Exercícios de Fixação</p>
                  </div>
                )}
                
                <div className="space-y-4">
                  {subtasks.map((group, gIndex) => (
                    <div key={group.id} className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm">
                      {/* Group Header */}
                      <div className="flex items-center gap-4 mb-5">
                        <div className="bg-gray-100 text-gray-900 text-[10px] font-bold w-7 h-7 flex items-center justify-center rounded-lg shrink-0 border border-gray-200">
                          {gIndex + 1}
                        </div>
                        <input
                          type="text"
                          value={group.title}
                          onChange={(e) => updateSubtaskGroupTitle(group.id, e.target.value)}
                          placeholder="Ex: Vídeo aulas"
                          className="flex-1 bg-transparent font-bold text-gray-900 text-lg focus:outline-none placeholder:text-gray-200"
                        />
                        <button type="button" onClick={() => removeSubtaskGroup(group.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 rounded-lg">
                          <Trash2 size={18} />
                        </button>
                      </div>

                      {/* Group Items */}
                      <div className="pl-11 space-y-3">
                        {(group.items || []).map((item, iIndex) => (
                          <div key={item.id} className="flex items-center gap-3 group/item">
                            <span className="text-[10px] text-gray-300 font-bold w-4 shrink-0">{iIndex + 1}.</span>
                            <input
                              type="text"
                              value={item.title}
                              onChange={(e) => updateSubtaskItemTitle(group.id, item.id, e.target.value)}
                              placeholder="Ex: 📺 1. Introdução (30 min)"
                              className="flex-1 bg-transparent text-sm text-gray-700 focus:text-gray-900 focus:outline-none placeholder:text-gray-200 font-medium"
                            />
                            <button type="button" onClick={() => removeSubtaskItem(group.id, item.id)} className="text-gray-300 hover:text-red-500 p-1.5 shrink-0 opacity-0 group-hover/item:opacity-100 transition-all hover:bg-red-50 rounded-lg">
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                        <button type="button" onClick={() => addSubtaskItem(group.id)} className="text-[10px] font-bold text-gray-400 hover:text-gray-600 flex items-center gap-2 mt-4 py-3 bg-gray-50 px-4 rounded-xl border border-dashed border-gray-200 w-full justify-center transition-all hover:bg-gray-100 active:scale-[0.98] uppercase tracking-widest">
                          <Plus size={14} /> Adicionar item
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: MÉTRICAS */}
            {activeTab === 'metricas' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="bg-gray-50 border border-gray-100 rounded-[2rem] p-6 shadow-sm">
                    <label className="block text-[10px] font-bold text-gray-400 mb-4 uppercase tracking-widest">🍅 Pomodoros Feitos</label>
                    <div className="flex items-center justify-between">
                      <button type="button" onClick={() => setPomodoros(Math.max(0, pomodoros - 1))} className="w-12 h-12 rounded-2xl bg-white text-gray-400 font-bold hover:bg-gray-100 flex items-center justify-center text-xl transition-all active:scale-90 border border-gray-100">-</button>
                      <span className="font-bold text-5xl text-gray-900 tabular-nums">{pomodoros}</span>
                      <button type="button" onClick={() => setPomodoros(pomodoros + 1)} className="w-12 h-12 rounded-2xl bg-orange-500 text-white font-bold hover:bg-orange-600 flex items-center justify-center text-xl transition-all active:scale-90 transform shadow-lg shadow-orange-500/20">+</button>
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-100 rounded-[2rem] p-6 shadow-sm">
                    <label className="block text-[10px] font-bold text-gray-400 mb-4 uppercase tracking-widest">📝 Questões</label>
                    <div className="flex items-center justify-center gap-4">
                      <input
                        type="number"
                        min="0"
                        value={questionsCorrect || ''}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setQuestionsCorrect(questionsTotal > 0 ? Math.min(val, questionsTotal) : val);
                        }}
                        placeholder="0"
                        className="w-20 bg-emerald-50 border border-emerald-100 rounded-2xl px-2 py-3 text-center font-bold text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-2xl placeholder:text-gray-200"
                      />
                      <span className="text-gray-200 font-black text-3xl">/</span>
                      <input
                        type="number"
                        min="0"
                        value={questionsTotal || ''}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setQuestionsTotal(val);
                          if (questionsCorrect > val) setQuestionsCorrect(val);
                        }}
                        placeholder="0"
                        className="w-20 bg-white border border-gray-100 rounded-2xl px-2 py-3 text-center font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-2xl placeholder:text-gray-200"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest">✅ Fixação</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setTheoryCompleted(!theoryCompleted)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl border transition-all font-bold text-xs uppercase tracking-widest shadow-sm",
                        theoryCompleted 
                          ? "bg-emerald-50 border-emerald-200 text-emerald-600" 
                          : "bg-gray-50 border-gray-100 text-gray-400 hover:text-gray-700"
                      )}
                    >
                      <BookOpen size={18} /> Teoria
                    </button>
                    <button
                      type="button"
                      onClick={() => setFlashcardsCompleted(!flashcardsCompleted)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl border transition-all font-bold text-xs uppercase tracking-widest shadow-sm",
                        flashcardsCompleted 
                          ? "bg-purple-50 border-purple-200 text-purple-600" 
                          : "bg-gray-50 border-gray-100 text-gray-400 hover:text-gray-700"
                      )}
                    >
                      <Brain size={18} /> Flashcards
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest">💡 Anotações / Resumo</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Escreva aqui seus resumos, fórmulas importantes ou erros que cometeu nas questões..."
                    rows={6}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none leading-relaxed transition-all placeholder:text-gray-200 shadow-inner"
                  />
                </div>
              </div>
            )}

            {/* TAB: IA (Import) */}
            {activeTab === 'ia' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-indigo-50/30 p-8 rounded-[2rem] border border-indigo-100 text-center">
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-6 border border-indigo-100 text-indigo-500">
                    <Sparkles size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Importação Mágica</h3>
                  <p className="text-sm text-gray-500 mb-8 max-w-xs mx-auto">
                    Cole o código JSON gerado pelo Gemini para estruturar este módulo instantaneamente.
                  </p>
                  
                  <div className="w-full mb-6">
                    <textarea 
                      value={jsonImportText}
                      onChange={(e) => setJsonImportText(e.target.value)}
                      placeholder='{ "title": "Genética", "subject": "Biologia", ... }'
                      className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-5 text-xs font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none h-48 placeholder:text-gray-200 shadow-inner"
                    />
                  </div>
                  <button 
                    onClick={processImportedJson}
                    disabled={isExtracting || !jsonImportText.trim()}
                    className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all uppercase tracking-widest text-[10px] disabled:opacity-50 group"
                  >
                    {isExtracting ? (
                      <><Loader2 size={18} className="animate-spin" /> Processando...</>
                    ) : (
                      <><Sparkles size={16} className="group-hover:rotate-12 transition-transform" /> Preencher Módulo</>
                    )}
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Mobile Footer Actions */}
          <div className="p-6 border-t border-gray-100 bg-gray-50 sm:hidden">
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || isSubmitting}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-2xl font-black text-base disabled:opacity-50 transition-all active:scale-[0.98] shadow-lg shadow-orange-500/20"
            >
              {isSubmitting ? (taskToEdit ? 'Salvando...' : 'Criando...') : (taskToEdit ? 'Salvar Alterações' : 'Criar Módulo')}
            </button>
            {taskToEdit && (
              <button onClick={handleDelete} disabled={isSubmitting} className="w-full mt-3 py-3 text-red-400 text-xs font-bold hover:bg-red-400/10 rounded-2xl transition-all disabled:opacity-50 uppercase tracking-widest">
                {isSubmitting ? 'Excluindo...' : 'Excluir Módulo'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Tab Components
function HojeTab({ tasks, onEdit }: { tasks: Task[], onEdit: (task: Task) => void }) {
  const hojeTasks = tasks.filter(t => t.status === 'hoje');

  if (hojeTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-24">
        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-gray-100">
          <CalendarDays size={40} className="text-orange-500/20" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Dia Livre!</h3>
        <p className="text-gray-500 text-sm max-w-xs">Você não tem missões planejadas para hoje. Aproveite para descansar ou puxe tarefas do Inbox.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-5xl mx-auto">
      {hojeTasks.map(task => (
        <TaskCard key={task.id} task={task} onEdit={() => onEdit(task)} />
      ))}
    </div>
  );
}

function InboxTab({ tasks, onEdit }: { tasks: Task[], onEdit: (task: Task) => void }) {
  const [isGrouped, setIsGrouped] = React.useState(() => localStorage.getItem('eduflow_inbox_grouped') !== 'false');
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    localStorage.setItem('eduflow_inbox_grouped', String(isGrouped));
  }, [isGrouped]);

  const inboxTasks = tasks.filter(t => 
    t.status === 'inbox' && 
    (!search || t.title.toLowerCase().includes(search.toLowerCase()))
  );
  
  // Group tasks by subject
  const groupedTasks = React.useMemo(() => {
    const groups: Record<string, Task[]> = {};
    inboxTasks.forEach(task => {
      if (!groups[task.subject]) groups[task.subject] = [];
      groups[task.subject].push(task);
    });
    // Sort subjects by task count
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [inboxTasks]);

  return (
    <div className="flex h-full min-h-0 flex-col max-w-2xl mx-auto w-full px-1 pb-20">
      {/* Search Bar - Integration from Refinement 8 */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
        <input
          type="text"
          placeholder="Filtrar inbox..."
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

      {inboxTasks.length === 0 ? (
        <div className="mt-12 flex min-h-[40dvh] flex-col items-center justify-center px-4 text-center sm:mt-20">
          <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-gray-100">
            <Inbox size={40} className="text-gray-200" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Inbox Limpo!</h3>
          <p className="text-gray-500 text-sm max-w-xs">{search ? 'Nenhuma tarefa encontrada para esta busca.' : 'Sua caixa de entrada está vazia. Capture novas ideias ou tarefas pendentes aqui.'}</p>
        </div>
      ) : (
        <>
          {/* Inbox Header / Stats */}
          <div className="mb-8 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-3 tracking-tight">
                  <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
                  CENTRO DE TRIAGEM
                </h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-[1.125rem]">
                  {inboxTasks.length} {inboxTasks.length === 1 ? 'item pendente' : 'itens pendentes'}
                </p>
              </div>
              <button 
                onClick={() => setIsGrouped(!isGrouped)}
                className="flex items-center gap-3 px-4 py-2 rounded-xl border border-gray-100 bg-white text-[10px] font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all shadow-sm uppercase tracking-widest active:scale-95"
              >
                {isGrouped ? <LayoutList size={14} /> : <Grid size={14} />}
                {isGrouped ? 'Lista' : 'Agrupar'}
              </button>
            </div>

            {isGrouped && (
              <div className="flex flex-wrap gap-2 py-1">
                {groupedTasks.map(([subject, items]) => {
                  const info = SUBJECT_INFO[subject] || SUBJECT_INFO['Geral'];
                  return (
                    <div key={subject} className={cn("px-3 py-1.5 rounded-xl border text-[10px] font-bold flex items-center gap-2 shadow-sm", info.tagColor)}>
                      <span>{info.emoji}</span>
                      {subject.toUpperCase()}
                      <span className="opacity-40 ml-0.5">{items.length}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Main List */}
          <div className="space-y-8">
            {isGrouped ? (
              groupedTasks.map(([subject, items]) => {
                const info = SUBJECT_INFO[subject] || SUBJECT_INFO['Geral'];
                return (
                  <div key={subject} className="space-y-4">
                    <div className="flex items-center gap-4 px-2">
                      <div className={cn("w-1 h-3 rounded-full", info.tagColor.split(' ')[1])} />
                      <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">{subject}</h3>
                      <div className="flex-1 h-[1px] bg-gray-100" />
                    </div>
                    <div className="space-y-3">
                      {items.map(task => (
                        <TaskCard key={task.id} task={task} onEdit={() => onEdit(task)} />
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="space-y-3">
                {inboxTasks.map(task => (
                  <TaskCard key={task.id} task={task} onEdit={() => onEdit(task)} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function TaskCard({ task, onEdit }: { task: Task, onEdit: () => void, key?: React.Key }) {
  const { setActiveTask } = useFocus();
  const [isExpanded, setIsExpanded] = React.useState(false);
  
  // Connect to global state via an effect or custom event if needed, but for now 
  // since TaskCard is in App, we could pass it. However, TaskCard is currently 
  // used in specific tab components. Let's use a simpler approach: check localStorage 
  // whenever the card mounts or is updated if possible, or just look for a change.
  // Better yet: I'll use a standard useEffect that listens to the localStorage change 
  // or a custom event if I want to avoid passing props everywhere.
  
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

  // Toggle subtask directly from card
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

  // Toggle theory/flashcards directly from card
  const toggleMetric = async (field: 'theoryCompleted' | 'flashcardsCompleted') => {
    try {
      await updateTask(task.id, { [field]: !task[field] });
    } catch (error) {
      console.error(`Error updating ${field}`, error);
    }
  };

  // Complete entire task
  const toggleTaskStatus = async () => {
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

  // Metrics logic
  const total = task.questionsTotal || 0;
  const correct = task.questionsCorrect || 0;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  
  let pctColor = 'text-gray-500';
  let pctBg = 'bg-gray-100';
  if (total > 0) {
    if (pct >= 80) { pctColor = 'text-green-700'; pctBg = 'bg-green-100'; }
    else if (pct >= 70) { pctColor = 'text-yellow-700'; pctBg = 'bg-yellow-100'; }
    else { pctColor = 'text-red-700'; pctBg = 'bg-red-100'; }
  }

  const showWarning = total > 0 && total < 15;
  const subjectInfo = SUBJECT_INFO[task.subject] || SUBJECT_INFO['Geral'];

  // Format date
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
  const totalTime = task.totalTime || 0;
  const efficiency = totalTime > 0 ? Math.round((liquidTime / totalTime) * 100) : 0;

  // Checklist progress logic
  const subtasks = task.subtasks || [];
  const totalSubItems = subtasks.reduce((acc, group) => acc + (group.items?.length || 0), 0);
  const doneSubItems = subtasks.reduce((acc, group) => acc + (group.items?.filter(i => i.completed).length || 0), 0);
  const checklistPct = totalSubItems > 0 ? Math.round((doneSubItems / totalSubItems) * 100) : -1;

  return (
    <div 
      style={{ '--shadow-color': subjectInfo.shadowColor } as React.CSSProperties}
      className={cn(
        "group relative p-5 rounded-[2.5rem] border border-white/50 backdrop-blur-sm flex flex-col gap-4 shadow-colored hover:shadow-xl transition-all animate-in fade-in duration-300",
        subjectInfo.cardBg
      )}
    >
      {/* Dynamic Background Tint */}
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-5 pointer-events-none rounded-[1.5rem]", subjectInfo.gradient)} />
      
      {/* --- TOP ROW: MATERIA & ACTIONS --- */}
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

        {/* Action Toolbar */}
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
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-all shadow-sm bg-white border border-gray-50">
            <Pencil size={14} />
          </button>
        </div>
      </div>

      {/* --- CONTENT ROW: CHECKBOX & TITLE --- */}
      <div className="relative flex items-start gap-4 z-10">
        <button onClick={(e) => { e.stopPropagation(); toggleTaskStatus(); }}
          className={cn(
            "mt-1 transition-all shrink-0 active:scale-75 p-0.5 rounded-full border-2", 
            task.status === 'concluida' ? "text-green-500 border-green-500 bg-green-50" : "text-gray-300 border-gray-200 hover:text-green-500 hover:border-green-500"
          )}>
          {task.status === 'concluida' ? <CheckCircle2 size={22} /> : <Circle size={22} />}
        </button>
        <div className="flex-1 min-w-0 pr-8">
          <h3 className={cn(
            "font-semibold text-[16px] leading-[1.4] tracking-tight mb-2 transition-all", 
            task.status === 'concluida' ? "text-gray-400 line-through" : "text-gray-800"
          )}>
            {task.title}
          </h3>
          
          {/* Performance Row & Metadata Clips */}
          <div className="flex flex-col gap-3 mt-3">
            {/* Main Performance Row (Time & Questions) */}
            <div className="flex items-center gap-2">
              {/* Liqud Time Badge */}
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-2xl border text-[11px] font-bold shadow-sm transition-all",
                liquidTime > 0 ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-gray-50 text-gray-400 border-gray-100"
              )}>
                <Clock size={14} className="opacity-70" />
                <span>{formatDuration(liquidTime)}</span>
              </div>

              {/* Questions Accuracy Badge */}
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

              {/* Pomodoro Count */}
              {(((task.pomodoros ?? 0) > 0) || ((task.estimatedPomodoros ?? 0) > 0)) && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-orange-50 text-orange-600 border border-orange-100 text-[11px] font-bold shadow-sm">
                  <span>🍅</span>
                  <span>{task.pomodoros ?? 0}{(task.estimatedPomodoros ?? 0) > 0 ? ` / ${task.estimatedPomodoros}` : ''}</span>
                </div>
              )}
            </div>

            {/* Tags Row */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {(task.tags ?? []).map(tag => (
                <span key={tag} className="text-[9px] font-bold tracking-wider bg-black/5 text-gray-500 border border-black/5 px-2 py-0.5 rounded-lg uppercase">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Expand Button */}
        <button 
          onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} 
          className="absolute right-0 top-1 p-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-all border border-gray-100 shrink-0 active:scale-90"
        >
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* --- PROGRESS BAR: ANIMATED WITH SPRING --- */}
      {checklistPct >= 0 && (
        <div className="relative z-10 pt-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">
              Progresso
            </span>
            <motion.span
              key={checklistPct} // re-anima quando muda
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

      {/* Collapsible Content */}
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

          {/* Metrics Footer */}
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

function HistoricoTab({ tasks, onEdit }: { tasks: Task[], onEdit: (task: Task) => void }) {
  const completedTasks = tasks.filter(t => t.status === 'concluida');

  if (completedTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center opacity-50 py-20">
        <History size={48} className="text-gray-200 mb-4" />
        <p className="font-bold text-gray-900">Seu histórico de conquistas está vazio.</p>
        <p className="text-sm text-gray-500 mt-2">Conclua tarefas para vê-las aqui.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-5xl mx-auto pb-20">
      {completedTasks.map(task => (
        <TaskCard key={task.id} task={task} onEdit={() => onEdit(task)} />
      ))}
    </div>
  );
}
