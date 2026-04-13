/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarDays, CalendarRange, Inbox, Target, History, Plus, Circle, CheckCircle2, LogIn, LogOut, X, CheckSquare, Square, Star, BookOpen, Brain, Trash2, Pencil, Upload, Image as ImageIcon, Loader2, LayoutList, BarChart2, Sparkles, Tag, Clock, ChevronDown, ChevronUp, Search, CloudRain, Snowflake, Droplets, Droplet, Play } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth, db, loginWithGoogle, logout } from './firebase';
import { User } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { Task, Priority, Status, SubTask } from './types';
import { PomodoroWidget } from './components/PomodoroWidget';
import { FocusSessionRoot, type FocusView } from './components/FocusMode';
import { BackgroundEffects, BgEffect } from './components/BackgroundEffects';
import { SemanaKanban } from './components/SemanaKanban';
import { useAuth } from './hooks/useAuth';
import { useTasks } from './hooks/useTasks';
import { SUBJECT_INFO } from './constants/subjects';
import { playSuccessSound } from './utils/sounds';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Tab = 'hoje' | 'semana' | 'inbox' | 'historico';

const SUBJECTS = Object.keys(SUBJECT_INFO);

const TAB_TITLE: Record<Tab, string> = {
  hoje: 'Missões de Hoje',
  semana: 'Visão da Semana',
  inbox: 'Inbox',
  historico: 'Histórico',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('hoje');
  const [bgEffect, setBgEffect] = useState<BgEffect>(() => (localStorage.getItem('eduflow_bgeffect') as BgEffect) || 'bubbles');
  const { user, isAuthReady } = useAuth();
  const { tasks } = useTasks(user?.uid);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | undefined>(undefined);
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);
  const [focusView, setFocusView] = useState<FocusView>('full');
  const [isBgMenuOpen, setIsBgMenuOpen] = useState(false);

  const focusTask = useMemo(() => tasks.find((t) => t.id === focusTaskId) ?? null, [tasks, focusTaskId]);

  useEffect(() => {
    if (focusTaskId && !focusTask) {
      setFocusTaskId(null);
    }
  }, [focusTaskId, focusTask]);

  useEffect(() => {
    localStorage.setItem('eduflow_bgeffect', bgEffect);
  }, [bgEffect]);

  const openFocusSession = (task: Task) => {
    if (focusTaskId && focusTaskId !== task.id) {
      if (
        !window.confirm(
          'Encerrar a sessão atual e trocar de módulo? O tempo focado desta sessão será salvo no módulo anterior.',
        )
      ) {
        return;
      }
    }
    setFocusTaskId(task.id);
    setFocusView('full');
  };

  const closeFocusSession = () => {
    setFocusTaskId(null);
    setFocusView('full');
  };

  const openCreateModal = () => {
    setTaskToEdit(undefined);
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setTaskToEdit(task);
    setIsModalOpen(true);
  };

  const tabs = [
    { id: 'hoje', label: 'Hoje', icon: CalendarDays, color: 'text-pastel-peach' },
    { id: 'semana', label: 'Semana', icon: CalendarRange, color: 'text-pastel-blue' },
    { id: 'inbox', label: 'Inbox', icon: Inbox, color: 'text-pastel-lavender' },
    { id: 'historico', label: 'Histórico', icon: History, color: 'text-pastel-cream' },
  ] as const;

  if (!isAuthReady) {
    return <div className="flex h-[100dvh] items-center justify-center bg-pastel-bg">Carregando...</div>;
  }

  if (!user) {
    return (
      <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto bg-pastel-bg items-center justify-center p-6 text-center shadow-2xl sm:rounded-3xl sm:h-[90vh] sm:my-[5vh] border border-gray-200">
        <BackgroundEffects effect={bgEffect} />
        <div className="w-20 h-20 bg-pastel-lavender rounded-3xl flex items-center justify-center mb-6 shadow-sm z-10">
          <CalendarDays size={40} className="text-text-main" />
        </div>
        <h1 className="text-3xl font-bold text-text-main mb-2 z-10">EduFlow</h1>
        <p className="text-text-muted mb-8 z-10">Seu organizador de estudos focado no ENEM.</p>
        <button
          onClick={loginWithGoogle}
          className="flex items-center gap-2 bg-white border border-gray-200 px-6 py-3 rounded-full font-semibold shadow-sm hover:bg-gray-50 transition-colors z-10"
        >
          <LogIn size={20} />
          Entrar com Google
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden border border-gray-200 bg-pastel-bg shadow-2xl sm:my-[5vh] sm:h-[90vh] sm:rounded-3xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto">
      <BackgroundEffects effect={bgEffect} />

      {/* Header */}
      <header className="z-10 flex shrink-0 items-start justify-between border-b border-gray-100 bg-white/80 px-4 pb-4 pt-[max(1.25rem,env(safe-area-inset-top,0px))] backdrop-blur-md sm:px-6 sm:pt-10">
        <div className="min-w-0 pr-2">
          <h1 className="text-xl font-bold text-text-main sm:text-2xl">
            {TAB_TITLE[activeTab]}
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {activeTab === 'hoje' && 'Foco máximo. Um passo de cada vez.'}
            {activeTab === 'semana' && 'Visão geral da sua jornada.'}
            {activeTab === 'inbox' && 'Despeje tudo aqui.'}
            {activeTab === 'historico' && 'Tudo que você já conquistou.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button 
              onClick={() => setIsBgMenuOpen(!isBgMenuOpen)}
              className="p-2 text-text-muted hover:text-text-main transition-colors rounded-full hover:bg-gray-100"
            >
              {bgEffect === 'none' ? <Droplet size={20} className="opacity-50" /> : 
               bgEffect === 'rain' ? <CloudRain size={20} className="text-blue-400" /> : 
               bgEffect === 'snow' ? <Snowflake size={20} className="text-blue-200" /> : 
               <Droplets size={20} className="text-blue-300" />}
            </button>
            {isBgMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsBgMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-100 shadow-xl rounded-xl p-1 flex flex-col gap-1 z-50 min-w-[120px] animate-in fade-in slide-in-from-top-2">
                  <button onClick={() => { setBgEffect('none'); setIsBgMenuOpen(false); }} className={cn("px-3 py-2 text-sm text-left rounded-lg hover:bg-gray-50 flex items-center gap-2", bgEffect === 'none' && "bg-gray-50 font-bold")}>Nenhum</button>
                  <button onClick={() => { setBgEffect('rain'); setIsBgMenuOpen(false); }} className={cn("px-3 py-2 text-sm text-left rounded-lg hover:bg-gray-50 flex items-center gap-2", bgEffect === 'rain' && "bg-gray-50 font-bold")}>Chuva</button>
                  <button onClick={() => { setBgEffect('snow'); setIsBgMenuOpen(false); }} className={cn("px-3 py-2 text-sm text-left rounded-lg hover:bg-gray-50 flex items-center gap-2", bgEffect === 'snow' && "bg-gray-50 font-bold")}>Neve</button>
                  <button onClick={() => { setBgEffect('bubbles'); setIsBgMenuOpen(false); }} className={cn("px-3 py-2 text-sm text-left rounded-lg hover:bg-gray-50 flex items-center gap-2", bgEffect === 'bubbles' && "bg-gray-50 font-bold")}>Bolhas</button>
                </div>
              </>
            )}
          </div>
          <button onClick={logout} className="p-2 text-text-muted hover:text-text-main transition-colors rounded-full hover:bg-gray-100">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden p-4 pb-28 sm:p-6 sm:pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex min-h-0 flex-1 flex-col overflow-y-auto"
          >
            {activeTab === 'hoje' && <HojeTab tasks={tasks} onEdit={openEditModal} onFocus={openFocusSession} />}
            {activeTab === 'semana' && <SemanaKanban tasks={tasks} onEdit={openEditModal} onFocus={openFocusSession} playSuccessSound={playSuccessSound} subjectInfo={SUBJECT_INFO} />}
            {activeTab === 'inbox' && <InboxTab tasks={tasks} onEdit={openEditModal} onFocus={openFocusSession} />}
            {activeTab === 'historico' && <HistoricoTab tasks={tasks} onEdit={openEditModal} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <PomodoroWidget
        tasks={tasks}
        onSelectTask={openFocusSession}
        hidden={!!focusTask && focusView === 'full'}
      />

      {/* Floating Action Button */}
      <button
        onClick={openCreateModal}
        className="absolute bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-text-main text-white shadow-lg transition-transform hover:scale-105 sm:right-6"
        aria-label="Criar novo módulo"
      >
        <Plus size={28} />
      </button>

      {/* Bottom Navigation Bar */}
      <nav className="absolute bottom-0 z-20 flex w-full items-center justify-between rounded-t-3xl border-t border-gray-100 bg-white px-2 py-3 pb-[max(1rem,env(safe-area-inset-bottom,0px))] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] sm:px-6 sm:py-4 sm:pb-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex flex-col items-center justify-center gap-1 w-16 h-16 transition-transform active:scale-95"
            >
              <div
                className={cn(
                  "p-2.5 rounded-2xl transition-all duration-300",
                  isActive ? "bg-gray-100 shadow-sm scale-110" : "bg-transparent hover:bg-gray-50"
                )}
              >
                <Icon
                  size={24}
                  strokeWidth={isActive ? 2.5 : 2}
                  className={cn(
                    "transition-colors duration-300",
                    isActive ? "text-text-main" : "text-text-muted"
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] font-semibold transition-all duration-300",
                  isActive ? "text-text-main opacity-100" : "text-text-muted opacity-0 translate-y-1"
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
        onClose={() => setIsModalOpen(false)} 
        user={user}
        taskToEdit={taskToEdit}
      />

      <AnimatePresence>
        {focusTask && (
          <FocusSessionRoot
            task={focusTask}
            view={focusView}
            onViewChange={setFocusView}
            onClose={closeFocusSession}
            playSuccessSound={playSuccessSound}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Modal Component
function TaskModal({ isOpen, onClose, user, taskToEdit }: { isOpen: boolean, onClose: () => void, user: User, taskToEdit?: Task }) {
  const [activeTab, setActiveTab] = useState<'geral' | 'metricas' | 'ia'>('geral');
  
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
  const [clientApiKey, setClientApiKey] = useState(() => localStorage.getItem('geminiApiKey') || '');
  const [isEditingKey, setIsEditingKey] = useState(!localStorage.getItem('geminiApiKey'));

  useEffect(() => {
    localStorage.setItem('geminiApiKey', clientApiKey);
  }, [clientApiKey]);

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

  const processImages = async () => {
    if (images.length === 0) return;
    setIsExtracting(true);
    try {
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

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents, apiKey: clientApiKey })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro na API do Gemini');
      }

      const responseData = await response.json();
      const text = responseData.text;
      
      if (!text) throw new Error("Resposta vazia da IA");
      
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
      setImages([]);
      setActiveTab('geral');
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Erro ao extrair dados das imagens. Verifique se as imagens estão legíveis.');
    } finally {
      setIsExtracting(false);
    }
  };

  if (!isOpen) return null;

  const addSubtaskGroup = () => {
    setSubtasks([...subtasks, { id: Date.now().toString(), title: '', completed: false, items: [] }]);
  };

  const updateSubtaskGroupTitle = (id: string, newTitle: string) => {
    setSubtasks(subtasks.map(st => st.id === id ? { ...st, title: newTitle } : st));
  };

  const removeSubtaskGroup = (id: string) => {
    setSubtasks(subtasks.filter(st => st.id !== id));
  };

  const addSubtaskItem = (groupId: string) => {
    setSubtasks(subtasks.map(st => {
      if (st.id === groupId) {
        return { ...st, items: [...(st.items || []), { id: Date.now().toString(), title: '', completed: false }] };
      }
      return st;
    }));
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
    if (!title.trim()) return;

    const cleanedSubtasks = subtasks
      .map(st => ({
        ...st,
        title: st.title.trim() || 'Sem título',
        items: (st.items || []).filter(item => item.title.trim() !== '')
      }))
      .filter(st => st.title !== 'Sem título' || st.items.length > 0);

    const taskData = {
      title: title.trim(),
      subject,
      priority,
      status,
      subtasks: cleanedSubtasks,
      questionsTotal,
      questionsCorrect,
      theoryCompleted,
      flashcardsCompleted,
      difficulty,
      notes: notes.trim(),
      pomodoros,
      estimatedPomodoros,
      tags,
      updatedAt: serverTimestamp()
    };

    try {
      if (taskToEdit) {
        await updateDoc(doc(db, 'tasks', taskToEdit.id), taskData);
      } else {
        await addDoc(collection(db, 'tasks'), {
          ...taskData,
          userId: user.uid,
          createdAt: serverTimestamp()
        });
      }
      onClose();
    } catch (error) {
      console.error("Error saving task", error);
    }
  };

  const handleDelete = async () => {
    if (!taskToEdit) return;
    try {
      await deleteDoc(doc(db, 'tasks', taskToEdit.id));
      onClose();
    } catch (error) {
      console.error("Error deleting task", error);
    }
  };

  const tabs = [
    { id: 'geral', label: 'Módulo', icon: <BookOpen size={16} />, dot: 'bg-emerald-400' },
    { id: 'metricas', label: 'Métricas', icon: <BarChart2 size={16} />, dot: 'bg-blue-400' },
    { id: 'ia', label: 'IA Assist', icon: <Sparkles size={16} />, dot: 'bg-purple-400' },
  ] as const;

  return (
    <div className="fixed inset-0 h-[100dvh] z-50 flex flex-col sm:items-center sm:justify-center bg-black/40 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-4xl flex flex-col sm:flex-row sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom-8 duration-300 border border-gray-100 overflow-hidden"
        onPaste={handlePaste}
      >
        
        {/* Sidebar Navigation (Desktop) / Top Navigation (Mobile) */}
        <div className="bg-gray-50/50 border-b sm:border-b-0 sm:border-r border-gray-100 sm:w-64 shrink-0 flex flex-col">
          <div className="p-6 hidden sm:block">
            <h2 className="text-xl font-black text-text-main flex items-center gap-2">
              {taskToEdit ? '✏️ Editar Módulo' : '✨ Novo Módulo'}
            </h2>
            <p className="text-xs text-text-muted mt-1">Configure os detalhes do seu estudo.</p>
          </div>
          
          {/* Mobile Header */}
          <div className="p-4 flex justify-between items-center sm:hidden bg-white">
            <h2 className="text-lg font-black text-text-main flex items-center gap-2">
              {taskToEdit ? '✏️ Editar' : '✨ Novo'}
            </h2>
            <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-text-muted hover:bg-gray-200 transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="flex sm:flex-col gap-1 p-3 sm:p-4 overflow-x-auto sm:overflow-visible custom-scrollbar">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                  activeTab === tab.id
                    ? "bg-white text-text-main shadow-sm border border-gray-100"
                    : "text-gray-400 hover:bg-gray-100/50 hover:text-gray-700"
                )}
              >
                <span className={cn('w-2 h-2 rounded-full shrink-0', tab.dot, activeTab === tab.id ? 'opacity-100' : 'opacity-30')} />
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-auto p-4 hidden sm:block">
            <button
              onClick={handleSubmit}
              disabled={!title.trim()}
              className="w-full bg-text-main text-white py-3 rounded-xl font-black text-sm disabled:opacity-50 hover:bg-gray-800 hover:shadow-md transition-all active:scale-[0.98]"
            >
              {taskToEdit ? 'Salvar Alterações' : 'Criar Módulo'}
            </button>
            {taskToEdit && (
              <button onClick={handleDelete} className="w-full mt-2 py-2 text-red-500 text-sm font-bold hover:bg-red-50 rounded-xl transition-colors">
                Excluir Módulo
              </button>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-0 bg-white relative">
          {/* Desktop Close Button */}
          <button onClick={onClose} className="hidden sm:flex absolute top-4 right-4 p-2 bg-gray-50 rounded-full text-text-muted hover:bg-gray-200 transition-colors z-10">
            <X size={18} />
          </button>

          <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
            
            {/* TAB: GERAL */}
            {activeTab === 'geral' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <label className="block text-xs font-bold text-text-muted mb-2 uppercase tracking-wider">📚 Nome do Módulo</label>
                  <input
                    autoFocus
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Genética - Leis de Mendel"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-text-main font-bold focus:outline-none focus:ring-2 focus:ring-pastel-blue transition-all text-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted mb-2 uppercase tracking-wider">🏷️ Matéria</label>
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
                            "px-3 py-1.5 rounded-lg text-sm font-bold transition-all border flex items-center gap-1.5",
                            isSelected 
                              ? cn(info.tagColor, "ring-2 ring-offset-1 ring-gray-300 scale-105 shadow-sm") 
                              : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
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
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-text-main focus:outline-none focus:ring-2 focus:ring-pastel-blue appearance-none font-bold"
                    >
                      <option value="baixa">🧊 Baixa</option>
                      <option value="media">🌤️ Média</option>
                      <option value="alta">🔥 Alta</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-muted mb-2 uppercase tracking-wider">🎯 Destino</label>
                    <select 
                      value={status} 
                      onChange={(e) => setStatus(e.target.value as Status)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-text-main focus:outline-none focus:ring-2 focus:ring-pastel-blue appearance-none font-bold"
                    >
                      <option value="inbox">📥 Inbox</option>
                      <option value="hoje">🎯 Hoje</option>
                      <option value="semana">🗓️ Semana</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-text-muted mb-2 uppercase tracking-wider">🤯 Dificuldade</label>
                    <div className="flex gap-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 h-[46px] items-center">
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
                              difficulty >= star ? "fill-yellow-400 text-yellow-400 drop-shadow-sm" : "text-gray-300"
                            )}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-muted mb-2 uppercase tracking-wider">⏱️ Pomodoros Estimados</label>
                    <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-2 py-1.5 h-[46px]">
                      <button type="button" onClick={() => setEstimatedPomodoros(Math.max(0, estimatedPomodoros - 1))} className="w-8 h-8 rounded-lg bg-white shadow-sm text-gray-600 font-bold hover:bg-gray-100 flex items-center justify-center">-</button>
                      <span className="font-black text-lg text-text-main w-8 text-center">{estimatedPomodoros}</span>
                      <button type="button" onClick={() => setEstimatedPomodoros(estimatedPomodoros + 1)} className="w-8 h-8 rounded-lg bg-white shadow-sm text-gray-600 font-bold hover:bg-gray-100 flex items-center justify-center">+</button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted mb-2 uppercase tracking-wider">🏷️ Tags Personalizadas</label>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-2 flex flex-wrap gap-2 items-center min-h-[46px]">
                    {tags.map(tag => (
                      <span key={tag} className="bg-white border border-gray-200 text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1 shadow-sm">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="text-gray-400 hover:text-red-500">
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
                      className="flex-1 bg-transparent min-w-[150px] text-sm focus:outline-none px-2"
                    />
                  </div>
                </div>

                {/* ── CHECKLIST DE AULAS ── */}
                <div className="flex items-center gap-3 pt-2">
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Checklist de Aulas</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
                <div className="flex justify-between items-center bg-pastel-bg/30 p-3 rounded-2xl border border-gray-100">
                  <p className="text-xs text-text-muted">Divida o módulo em grupos de aulas.</p>
                  <button type="button" onClick={addSubtaskGroup} className="bg-white px-3 py-2 rounded-xl shadow-sm text-pastel-blue hover:text-blue-600 font-bold text-xs flex items-center gap-1 border border-gray-100 active:scale-95">
                    <Plus size={14} /> Novo Grupo
                  </button>
                </div>
                {subtasks.length === 0 && (
                  <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <LayoutList size={28} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-text-muted font-medium">Nenhum grupo ainda.</p>
                    <p className="text-xs text-gray-400 mt-0.5">Ex: 📺 Vídeo aulas, 📝 Exercícios</p>
                  </div>
                )}
                <div className="space-y-4">
                  {subtasks.map((group, gIndex) => (
                    <div key={group.id} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="bg-gray-100 text-gray-500 text-xs font-black w-6 h-6 flex items-center justify-center rounded-md shrink-0">{gIndex + 1}</div>
                        <input type="text" value={group.title} onChange={(e) => updateSubtaskGroupTitle(group.id, e.target.value)}
                          placeholder="Ex: 📺 Vídeo aulas" className="flex-1 bg-transparent font-black text-text-main text-base focus:outline-none placeholder:font-normal" />
                        <button type="button" onClick={() => removeSubtaskGroup(group.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1"><Trash2 size={18} /></button>
                      </div>
                      <div className="pl-9 space-y-2">
                        {(group.items || []).map((item, iIndex) => (
                          <div key={item.id} className="flex items-center gap-2 group/item">
                            <span className="text-xs text-gray-300 font-bold w-4 shrink-0">{iIndex + 1}.</span>
                            <input type="text" value={item.title} onChange={(e) => updateSubtaskItemTitle(group.id, item.id, e.target.value)}
                              placeholder="Ex: Introdução (30 min)" className="flex-1 min-w-0 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-pastel-blue transition-all" />
                            <button type="button" onClick={() => removeSubtaskItem(group.id, item.id)} className="text-gray-300 hover:text-red-400 p-1 shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity"><X size={16} /></button>
                          </div>
                        ))}
                        <button type="button" onClick={() => addSubtaskItem(group.id)} className="text-xs font-bold text-gray-400 hover:text-pastel-blue flex items-center gap-1 mt-3 py-1 bg-gray-50/50 px-3 rounded-lg border border-dashed border-gray-200 w-full justify-center">
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
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                    <label className="block text-xs font-bold text-text-muted mb-3 uppercase tracking-wider">🍅 Pomodoros Feitos</label>
                    <div className="flex items-center justify-between">
                      <button type="button" onClick={() => setPomodoros(Math.max(0, pomodoros - 1))} className="w-10 h-10 rounded-xl bg-gray-50 text-gray-600 font-bold hover:bg-gray-100 flex items-center justify-center text-lg">-</button>
                      <span className="font-black text-3xl text-text-main">{pomodoros}</span>
                      <button type="button" onClick={() => setPomodoros(pomodoros + 1)} className="w-10 h-10 rounded-xl bg-red-50 text-red-600 font-bold hover:bg-red-100 flex items-center justify-center text-lg">+</button>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                    <label className="block text-xs font-bold text-text-muted mb-3 uppercase tracking-wider">📝 Questões</label>
                    <div className="flex items-center justify-center gap-2 h-10">
                      <input
                        type="number"
                        min="0"
                        value={questionsCorrect || ''}
                        onChange={(e) => setQuestionsCorrect(Number(e.target.value))}
                        placeholder="0"
                        className="w-16 bg-green-50 border border-green-100 rounded-xl px-2 py-2 text-center font-black text-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 text-lg"
                      />
                      <span className="text-gray-300 font-black text-xl">/</span>
                      <input
                        type="number"
                        min="0"
                        value={questionsTotal || ''}
                        onChange={(e) => setQuestionsTotal(Number(e.target.value))}
                        placeholder="0"
                        className="w-16 bg-gray-50 border border-gray-200 rounded-xl px-2 py-2 text-center font-black text-text-main focus:outline-none focus:ring-2 focus:ring-pastel-blue text-lg"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted mb-2 uppercase tracking-wider">✅ Fixação</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setTheoryCompleted(!theoryCompleted)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all font-bold text-sm",
                        theoryCompleted ? "bg-green-50 border-green-400 text-green-800 shadow-sm" : "bg-white border-gray-100 text-gray-500 hover:border-gray-200"
                      )}
                    >
                      <BookOpen size={20} className={theoryCompleted ? "text-green-500" : ""} /> Teoria
                    </button>
                    <button
                      type="button"
                      onClick={() => setFlashcardsCompleted(!flashcardsCompleted)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all font-bold text-sm",
                        flashcardsCompleted ? "bg-purple-50 border-purple-400 text-purple-800 shadow-sm" : "bg-white border-gray-100 text-gray-500 hover:border-gray-200"
                      )}
                    >
                      <Brain size={20} className={flashcardsCompleted ? "text-purple-500" : ""} /> Flashcards
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted mb-2 uppercase tracking-wider">💡 Anotações / Resumo</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Escreva aqui seus resumos, fórmulas importantes ou erros que cometeu nas questões..."
                    rows={6}
                    className="w-full bg-yellow-50/50 border border-yellow-100 rounded-2xl px-5 py-4 text-sm text-text-main font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none leading-relaxed custom-scrollbar"
                  />
                </div>
              </div>
            )}

            {/* TAB: IA */}
            {activeTab === 'ia' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-3xl border border-purple-100 text-center">
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4">
                    <Sparkles size={32} className="text-purple-500" />
                  </div>
                  <h3 className="text-lg font-black text-purple-900 mb-2">
                    Preenchimento Mágico
                  </h3>
                  <p className="text-sm text-purple-700/80 mb-6 max-w-sm mx-auto">
                    Cole (Ctrl+V) ou envie prints do seu cronograma, edital ou plataforma de estudos. A IA vai extrair as aulas e preencher a estrutura automaticamente.
                  </p>
                  
                  <div className="max-w-sm mx-auto mb-6 text-left">
                    {!isEditingKey ? (
                      <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckCircle2 size={16} />
                          <span className="text-xs font-bold">Chave API Configurada</span>
                        </div>
                        <button 
                          onClick={() => setIsEditingKey(true)}
                          className="text-[10px] uppercase font-bold text-green-700 hover:text-green-800 bg-green-100/50 hover:bg-green-100 px-2 py-1 rounded-md transition-colors"
                        >
                          Editar
                        </button>
                      </div>
                    ) : (
                      <>
                        <label className="text-xs font-bold text-purple-900/60 mb-2 uppercase tracking-wider flex justify-between items-center">
                          Chave da API do Gemini
                          {clientApiKey && (
                            <button onClick={() => setIsEditingKey(false)} className="text-purple-500 hover:text-purple-700 text-[10px] bg-purple-100/50 px-2 py-0.5 rounded transition-colors">Cancelar</button>
                          )}
                        </label>
                        <input 
                          type="password" 
                          value={clientApiKey}
                          onChange={(e) => setClientApiKey(e.target.value)}
                          placeholder="Cole sua Gemini API Key aqui..."
                          className="w-full bg-white border border-purple-200 rounded-xl px-4 py-2.5 text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all font-mono"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                              if (clientApiKey.trim() === '') {
                                alert('Por favor, informe a chave da API do Gemini.');
                                return;
                              }
                              setIsEditingKey(false);
                              if (images.length === 0) {
                                alert('Chave API salva com sucesso no navegador!');
                              } else {
                                processImages();
                              }
                            }
                          }}
                        />
                        <p className="text-[10px] text-purple-700/60 mt-2 font-medium">Sua chave fica salva apenas no seu navegador.</p>
                      </>
                    )}
                  </div>

                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-purple-700 px-6 py-3 rounded-xl shadow-sm border border-purple-100 hover:bg-purple-50 transition-colors font-bold flex items-center gap-2 mx-auto"
                  >
                    <Upload size={18} /> Selecionar Imagens
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*" 
                    multiple 
                    className="hidden" 
                  />
                </div>

                {images.length > 0 && (
                  <div className="space-y-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Imagens Selecionadas</h4>
                    <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                      {images.map((img, idx) => (
                        <div key={idx} className="relative shrink-0 w-24 h-24 rounded-xl border border-gray-200 overflow-hidden group">
                          <img src={img} alt="preview" className="w-full h-full object-cover" />
                          <button 
                            onClick={() => removeImage(idx)}
                            className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={processImages}
                      disabled={isExtracting}
                      className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white text-sm font-black rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-70 shadow-sm"
                    >
                      {isExtracting ? (
                        <>
                          <Loader2 size={18} className="animate-spin" /> Processando com IA...
                        </>
                      ) : (
                        <>
                          <Brain size={18} /> Extrair Dados Agora
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Mobile Footer Actions */}
          <div className="p-4 border-t border-gray-100 bg-white sm:hidden">
            <button
              onClick={handleSubmit}
              disabled={!title.trim()}
              className="w-full bg-text-main text-white py-3.5 rounded-xl font-black text-base disabled:opacity-50 hover:bg-gray-800 transition-all active:scale-[0.98]"
            >
              {taskToEdit ? 'Salvar Alterações' : 'Criar Módulo'}
            </button>
            {taskToEdit && (
              <button onClick={handleDelete} className="w-full mt-2 py-2.5 text-red-500 text-sm font-bold hover:bg-red-50 rounded-xl transition-colors">
                Excluir Módulo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Tab Components
function HojeTab({ tasks, onEdit, onFocus }: { tasks: Task[], onEdit: (task: Task) => void, onFocus: (task: Task) => void }) {
  const hojeTasks = tasks.filter(t => t.status === 'hoje');

  if (hojeTasks.length === 0) {
    return (
      <div className="flex h-full min-h-[50dvh] flex-col items-center justify-center text-center px-2">
        <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-orange-100">
          <CalendarDays size={40} className="text-orange-400" />
        </div>
        <h3 className="text-xl font-black text-gray-800 mb-2">Dia Livre!</h3>
        <p className="text-gray-500 max-w-xs">Você não tem missões planejadas para hoje. Aproveite para descansar ou puxe tarefas do Inbox.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      {hojeTasks.map(task => (
        <TaskCard key={task.id} task={task} onEdit={() => onEdit(task)} onFocus={() => onFocus(task)} />
      ))}
    </div>
  );
}

function InboxTab({ tasks, onEdit, onFocus }: { tasks: Task[], onEdit: (task: Task) => void, onFocus: (task: Task) => void }) {
  const inboxTasks = tasks.filter(t => t.status === 'inbox');

  const moveToHoje = async (task: Task) => {
    try {
      await updateDoc(doc(db, 'tasks', task.id), { status: 'hoje' });
    } catch (error) {
      console.error("Error moving task", error);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col space-y-4 overflow-y-auto">
        {inboxTasks.length === 0 ? (
          <div className="mt-12 flex min-h-[40dvh] flex-col items-center justify-center px-2 text-center sm:mt-20">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-gray-200">
              <Inbox size={40} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-black text-gray-800 mb-2">Inbox Limpo!</h3>
            <p className="text-gray-500 max-w-xs">Sua caixa de entrada está vazia. Use o botão + para adicionar novas ideias ou tarefas.</p>
          </div>
        ) : (
          inboxTasks.map(task => (
            <div key={task.id} className="flex flex-col gap-2">
              <TaskCard task={task} onEdit={() => onEdit(task)} onFocus={() => onFocus(task)} />
              <button
                type="button"
                onClick={() => moveToHoje(task)}
                className="self-end rounded-lg bg-pastel-peach/50 px-3 py-1.5 text-xs font-bold text-orange-800 transition-colors hover:bg-pastel-peach"
              >
                Mover p/ Hoje
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function TaskCard({ task, onEdit, onFocus }: { task: Task, onEdit: () => void, onFocus?: () => void, key?: React.Key }) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  // Toggle subtask directly from card
  const toggleSubtaskItem = async (groupId: string, itemId: string) => {
    let wasCompleted = false;
    const baseSubtasks = task.subtasks ?? [];
    const updatedSubtasks = baseSubtasks.map(st => {
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
      await updateDoc(doc(db, 'tasks', task.id), { subtasks: updatedSubtasks, updatedAt: serverTimestamp() });
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
      await updateDoc(doc(db, 'tasks', task.id), { [field]: !task[field], updatedAt: serverTimestamp() });
    } catch (error) {
      console.error(`Error updating ${field}`, error);
    }
  };

  // Complete entire task
  const toggleTaskStatus = async () => {
    try {
      const newStatus = task.status === 'concluida' ? 'hoje' : 'concluida';
      await updateDoc(doc(db, 'tasks', task.id), { status: newStatus, updatedAt: serverTimestamp() });
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

  // Checklist progress
  const allSubItems = (task.subtasks ?? []).flatMap(g => g.items ?? []);
  const doneSubItems = allSubItems.filter(i => i.completed).length;
  const totalSubItems = allSubItems.length;
  const checklistPct = totalSubItems > 0 ? Math.round((doneSubItems / totalSubItems) * 100) : -1;

  return (
    <div className={cn("p-4 sm:p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-3 transition-all hover:shadow-md", subjectInfo.cardBg)}>

      {/* Row 1: badges + action buttons */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <span className={cn("text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md border flex items-center gap-1", subjectInfo.tagColor)}>
            <span>{subjectInfo.emoji}</span> {task.subject}
          </span>
          {task.priority === 'alta' && (
            <span className="text-[10px] font-bold bg-red-100 text-red-600 border border-red-200 px-2 py-0.5 rounded-md">Alta 🔥</span>
          )}
          {(task.difficulty ?? 0) > 0 && (
            <div className="flex gap-0.5">
              {[...Array(task.difficulty)].map((_, i) => <Star key={i} size={11} className="fill-yellow-400 text-yellow-400" />)}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onFocus && task.status !== 'concluida' && (
            <button onClick={onFocus} title="Focar nesta tarefa"
              className="rounded-xl p-2 text-orange-500 bg-orange-50 hover:bg-orange-100 transition-colors">
              <Play size={15} fill="currentColor" />
            </button>
          )}
          <button onClick={onEdit} title="Editar"
            className="rounded-xl p-2 text-gray-400 hover:text-text-main hover:bg-white/70 transition-colors">
            <Pencil size={15} />
          </button>
        </div>
      </div>

      {/* Row 2: complete toggle + title + expand */}
      <div className="flex items-start gap-3">
        <button onClick={toggleTaskStatus}
          className={cn("mt-0.5 transition-all shrink-0 active:scale-90", task.status === 'concluida' ? "text-green-500" : "text-gray-300 hover:text-green-400")}>
          {task.status === 'concluida' ? <CheckCircle2 size={22} /> : <Circle size={22} />}
        </button>
        <div className="flex-1 min-w-0">
          <h3 className={cn("font-bold text-base leading-snug", task.status === 'concluida' ? "text-gray-400 line-through" : "text-text-main")}>
            {task.title}
          </h3>
          {/* Inline badges row */}
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            {(((task.pomodoros ?? 0) > 0) || ((task.estimatedPomodoros ?? 0) > 0)) && (
              <span className="text-[10px] font-bold bg-red-50 text-red-500 border border-red-100 px-1.5 py-0.5 rounded-md">
                🍅 {task.pomodoros ?? 0}{(task.estimatedPomodoros ?? 0) > 0 ? `/${task.estimatedPomodoros}` : ''}
              </span>
            )}
            {liquidTime > 0 && (
              <span className="text-[10px] font-medium text-gray-500 bg-white/80 border border-gray-200 px-1.5 py-0.5 rounded-md">⏱ {formatDuration(liquidTime)}</span>
            )}
            {(task.tags ?? []).map(tag => (
              <span key={tag} className="text-[10px] font-bold text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                <Tag size={9} /> {tag}
              </span>
            ))}
          </div>
          {/* Checklist progress bar */}
          {checklistPct >= 0 && (
            <div className="mt-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Checklist</span>
                <span className="text-[10px] font-bold text-gray-500">{doneSubItems}/{totalSubItems}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-black/8 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${checklistPct}%`, background: checklistPct === 100 ? '#22c55e' : checklistPct >= 50 ? '#60a5fa' : '#fb923c' }} />
              </div>
            </div>
          )}
        </div>
        <button onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 rounded-full bg-white text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors shadow-sm border border-gray-200 shrink-0 mt-0.5">
          {isExpanded ? <ChevronUp size={17} strokeWidth={2.5} /> : <ChevronDown size={17} strokeWidth={2.5} />}
        </button>
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Hierarchical Subtasks */}
          {(task.subtasks && task.subtasks.length > 0) && (
            <div className="pl-9 space-y-3">
          {task.subtasks.map(group => (
            <div key={group.id} className="space-y-1.5">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{group.title}</h4>
              <div className="space-y-1">
                {(group.items || []).map(item => (
                  <button 
                    key={item.id} 
                    onClick={() => toggleSubtaskItem(group.id, item.id)}
                    className="flex items-center gap-2 text-sm text-left w-full group/item"
                  >
                    {item.completed ? (
                      <CheckSquare size={16} className="text-pastel-blue shrink-0" />
                    ) : (
                      <Square size={16} className="text-gray-300 group-hover/item:text-gray-400 shrink-0" />
                    )}
                    <span className={cn("transition-all", item.completed ? "line-through text-gray-400" : "text-text-main")}>
                      {item.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Metrics & Fixed Checkboxes */}
      <div className="pl-9 flex flex-wrap gap-2 mt-1">
        {/* Theory Toggle */}
        <button 
          onClick={() => toggleMetric('theoryCompleted')}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors border",
            task.theoryCompleted ? "bg-green-50 border-green-200 text-green-700" : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
          )}
        >
          📖 Teoria
        </button>
        
        {/* Flashcards Toggle */}
        <button 
          onClick={() => toggleMetric('flashcardsCompleted')}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors border",
            task.flashcardsCompleted ? "bg-purple-50 border-purple-200 text-purple-700" : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
          )}
        >
          🧠 Flashcards
        </button>

        {/* Questions Metric Pill */}
        <div className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-transparent", pctBg, pctColor)}>
          🎯 {correct}/{total} ({pct}%)
        </div>

        {/* Warning Pill */}
        {showWarning && (
          <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-200" title="Quantidade insuficiente de questões">
            ⚠️ &lt; 15
          </div>
        )}
      </div>

      {/* Notes Snippet */}
      {task.notes && (
        <div className="pl-9 mt-1">
          <div className="bg-pastel-bg p-3 rounded-xl text-xs text-text-muted italic border border-gray-100 leading-relaxed whitespace-pre-wrap">
            <span className="not-italic text-text-main">&ldquo;</span>{task.notes}<span className="not-italic text-text-main">&rdquo;</span>
          </div>
        </div>
      )}

          {/* Footer: Updated At */}
          {(task.updatedAt || task.createdAt) && (
            <div className="pt-3 mt-2 border-t border-gray-50 flex justify-end">
              <span className="text-[10px] text-gray-400 font-medium">
                Atualizado em {formatDate(task.updatedAt || task.createdAt)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HistoricoTab({ tasks, onEdit }: { tasks: Task[], onEdit: (task: Task) => void }) {
  const completedTasks = tasks.filter(t => t.status === 'concluida');

  if (completedTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
        <History size={48} className="text-pastel-cream mb-4" />
        <p className="font-medium">Seu histórico de conquistas está vazio.</p>
        <p className="text-sm mt-2">Conclua tarefas para vê-las aqui.</p>
      </div>
    );
  }

  const totalPomodoros = completedTasks.reduce((s, t) => s + (t.pomodoros ?? 0), 0);
  const totalFocusSec = completedTasks.reduce((s, t) => s + (t.liquidTime ?? 0), 0);
  const fh = Math.floor(totalFocusSec / 3600);
  const fm = Math.floor((totalFocusSec % 3600) / 60);
  const focusStr = fh > 0 ? `${fh}h ${fm}m` : `${fm}m`;
  const allQ = completedTasks.reduce((s, t) => s + (t.questionsTotal ?? 0), 0);
  const correctQ = completedTasks.reduce((s, t) => s + (t.questionsCorrect ?? 0), 0);
  const avgPct = allQ > 0 ? Math.round((correctQ / allQ) * 100) : null;

  return (
    <div className="space-y-4 pb-20 max-w-2xl mx-auto">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Concluídas', value: completedTasks.length, emoji: '✅' },
          { label: 'Pomodoros', value: totalPomodoros, emoji: '🍅' },
          { label: 'Tempo focado', value: focusStr, emoji: '⏱️' },
          { label: 'Acerto médio', value: avgPct !== null ? `${avgPct}%` : '—', emoji: '🎯' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-3 shadow-sm text-center">
            <p className="text-xl mb-0.5">{stat.emoji}</p>
            <p className="text-xl font-black text-text-main tabular-nums">{stat.value}</p>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>
      {completedTasks.map(task => (
        <TaskCard key={task.id} task={task} onEdit={() => onEdit(task)} />
      ))}
    </div>
  );
}

